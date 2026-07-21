// ---- config.js の内容をシーンに反映 ----
const CONFIG = VIEWER_CONFIG;
const HOME   = CONFIG.cameraHome;

document.title = CONFIG.pageTitle;
document.getElementById('title').innerHTML = CONFIG.displayTitle.join('<br>');

const modelEntity = document.getElementById('model-entity');
modelEntity.setAttribute('gltf-model', `Assets/${CONFIG.modelFile}`);

const scene = document.getElementById('scene');
scene.setAttribute('fog', `type: linear; color: ${CONFIG.fogColor}; near: ${CONFIG.fogNear}; far: ${CONFIG.fogFar}`);
scene.setAttribute('vr-mode-ui', `enabled: ${CONFIG.enableWebVR}`);

// ---- 背景（単色 or 360°パノラマ画像） ----
if (CONFIG.backgroundType === 'image' && CONFIG.backgroundImage) {
    const skyTexture = document.createElement('img');
    skyTexture.setAttribute('id', 'sky-texture');
    skyTexture.setAttribute('crossorigin', 'anonymous');
    skyTexture.setAttribute('src', `Assets/${CONFIG.backgroundImage}`);
    document.querySelector('a-assets').appendChild(skyTexture);

    const sky = document.getElementById('sky');
    sky.setAttribute('src', '#sky-texture');
    sky.setAttribute('visible', 'true');
} else {
    scene.setAttribute('background', `color: ${CONFIG.backgroundColor}`);
}

// ---- モデルの位置・回転・拡縮 ----
const mp = CONFIG.modelPosition, mr = CONFIG.modelRotation, ms = CONFIG.modelScale;
modelEntity.setAttribute('position', `${mp.x} ${mp.y} ${mp.z}`);
modelEntity.setAttribute('rotation', `${mr.x} ${mr.y} ${mr.z}`);
modelEntity.setAttribute('scale', `${ms.x} ${ms.y} ${ms.z}`);

// ---- glTFアニメーションの再生 ----
// animation-mixer は tick ごとに再生を進めるだけで、視点操作（ドラッグ／ジャイロ／自動オービット／
// リセット）とは独立して動作するため、ユーザー操作中も常にアニメーションが再生され続ける。
const animBtn      = document.getElementById('anim-btn');
const iconPause    = document.getElementById('icon-pause');
const iconPlay     = document.getElementById('icon-play');
let animPaused     = false;

if (CONFIG.playAnimations) {
    modelEntity.setAttribute('animation-mixer', `clip: ${CONFIG.animationClip || '*'}; loop: ${CONFIG.animationLoop}; timeScale: ${CONFIG.animationTimeScale}`);

    animBtn.style.display = '';
    animBtn.addEventListener('click', () => {
        animPaused = !animPaused;
        modelEntity.setAttribute('animation-mixer', 'timeScale', animPaused ? 0 : CONFIG.animationTimeScale);
        iconPause.style.display = animPaused ? 'none' : '';
        iconPlay.style.display  = animPaused ? ''     : 'none';
        animBtn.title = animPaused ? 'アニメーションを再生' : 'アニメーションを一時停止';
    });
}

// ---- 読み込み中表示 ----
const loadingOverlay = document.getElementById('loading-overlay');
document.getElementById('loading-text').textContent = CONFIG.loadingText;
if (!CONFIG.loadingText) {
    loadingOverlay.classList.add('hidden');
}
modelEntity.addEventListener('model-loaded', () => loadingOverlay.classList.add('hidden'));
modelEntity.addEventListener('model-error', () => loadingOverlay.classList.add('hidden'));

// ---- 裏面の描画設定 ----
if (CONFIG.cullBackfaces) {
    modelEntity.addEventListener('model-loaded', () => {
        const mesh = modelEntity.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(node => {
            if (!node.isMesh || !node.material) return;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach(mat => { mat.side = THREE.FrontSide; });
        });
    });
}

// ---- AR表示ボタン（対応端末・ブラウザのみ表示） ----
if (CONFIG.enableWebAR && navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-ar').then(supported => {
        if (!supported) return;
        const arBtn = document.getElementById('ar-btn');
        arBtn.style.display = '';
        arBtn.addEventListener('click', () => scene.enterAR());
    }).catch(() => {});
}

// ---- 端末の向きで視点操作するボタン（対応端末のみ表示） ----
const gyroBtn = document.getElementById('gyro-btn');
if (CONFIG.enableDeviceOrientation && window.DeviceOrientationEvent && window.matchMedia('(pointer: coarse)').matches) {
    gyroBtn.style.display = '';
    gyroBtn.addEventListener('click', () => {
        if (gyroActive) {
            disableGyro();
        } else {
            requestGyroPermission().then(state => {
                if (state === 'granted') enableGyro();
            }).catch(() => {});
        }
    });
}

const rig = document.getElementById('camera-rig');
rig.setAttribute('orbit-controls', `
    target: ${HOME.tx} ${HOME.ty} ${HOME.tz};
    minDistance: 2;
    maxDistance: 80;
    initialPosition: ${HOME.px} ${HOME.py} ${HOME.pz};
    enableDamping: true;
    dampingFactor: 0.08;
    rotateSpeed: 0.6;
    zoomSpeed: 1.2;
    enablePan: true;
    panSpeed: 0.8;
    enableZoom: true;
    screenSpacePanning: true;
    autoRotate: false;
    autoRotateSpeed: 0.6`);

const ORBIT_DELAY = CONFIG.idleOrbitDelaySec;  // 無操作後に自動回転を開始するまでの秒数
const RESET_DELAY = CONFIG.idleResetDelaySec;  // 無操作後に視点をリセットするまでの秒数

const explorePrompt = document.getElementById('explore-prompt');

let idleTimer         = null;
let resetTimer        = null;
let exploreTimer      = null;
let isIdle            = false;
let isResetting       = false;
let idleReturnHome    = false; // 無操作が長く続いた後、ホーム視点へなめらかに戻している最中か
let userHasInteracted = false;
let resetAnim         = null;

// オービット用の球面座標（null = 次の idle 開始時に再初期化）
let orbitTheta = null;
let orbitR     = null;
let orbitPhi   = null;

// オービットの水平回転・仰角変化の「現在速度」と、なめらかに近づけていく「目標速度」
// 水平回転（テーマ）は「向き・速さ」を長い間隔でしか選び直さないことで、狭い範囲での
// 反復運動ではなく、モデルの全周が見えるくらい大きく周回する。仰角はこれまで通り
// 短い間隔でゆらいで生き生きとした見た目にする。
let orbitThetaSpeed      = 0;
let orbitThetaSpeedGoal  = 0;
let orbitPhiSpeed        = 0;
let orbitPhiSpeedGoal    = 0;
let orbitLastTime        = null; // 前フレームのtimestamp（秒）。dt算出用
let orbitThetaRetargetAt = 0;    // 次に水平回転の向き・速さを選び直すtimestamp（秒）
let orbitPhiRetargetAt   = 0;    // 次に仰角の速さを選び直すtimestamp（秒）

const ORBIT_PHI_CENTER            = Math.PI / 2.4; // 仰角の基準値（約75°）
const ORBIT_PHI_RANGE             = Math.PI / 10;  // 仰角の可動範囲（±18°）
const ORBIT_THETA_SPEED_MIN       = 0.05;          // 水平回転速度の最小値（rad/秒）。反復運動に見えないよう常にある程度の速さを保つ
const ORBIT_THETA_SPEED_MAX       = 0.12;          // 水平回転速度の最大値（rad/秒）
const ORBIT_PHI_SPEED_MAX         = 0.05;          // 仰角変化速度の最大値（rad/秒）
const ORBIT_SPEED_EASE_SEC        = 1.5;           // 目標速度へなめらかに近づくまでの目安秒数
const ORBIT_THETA_RETARGET_MIN_SEC = 20;           // 水平回転の向き・速さを選び直すまでの最小秒数（長めにして大きく周回させる）
const ORBIT_THETA_RETARGET_MAX_SEC = 40;           // 同・最大秒数
const ORBIT_PHI_RETARGET_MIN_SEC  = 3;             // 仰角の速さを選び直すまでの最小秒数
const ORBIT_PHI_RETARGET_MAX_SEC  = 7;             // 同・最大秒数
const ORBIT_RETURN_EASE_SEC       = 6;             // 無操作が続いた後、ズーム・仰角・注視点をホームへ戻す際の滑らかさの目安秒数

// ホーム視点を球面座標（注視点からの距離・仰角）に変換しておく。
// 無操作が続いた際、水平回転は継続したまま、ズーム・仰角・注視点だけをこの値へなめらかに近づける。
const HOME_ORBIT = (() => {
    const dx = HOME.px - HOME.tx;
    const dy = HOME.py - HOME.ty;
    const dz = HOME.pz - HOME.tz;
    const r  = Math.sqrt(dx * dx + dy * dy + dz * dz) || 15;
    return { r, phi: Math.acos(Math.max(-1, Math.min(1, dy / r))) };
})();

// 水平回転の目標速度（向き・速さ）をランダムに選び直す。0付近を避けて完全停止しないようにする
function randomizeThetaTarget() {
    const thetaSign = Math.random() < 0.5 ? -1 : 1;
    orbitThetaSpeedGoal = thetaSign * (ORBIT_THETA_SPEED_MIN + Math.random() * (ORBIT_THETA_SPEED_MAX - ORBIT_THETA_SPEED_MIN));
}

// 仰角の目標速度をランダムに選び直す
function randomizePhiTarget() {
    orbitPhiSpeedGoal = (Math.random() * 2 - 1) * ORBIT_PHI_SPEED_MAX;
}

// ---- 端末の向き連動用の状態 ----
let gyroActive      = false;
let gyroBase        = null;          // 有効化した瞬間の端末の向き（基準値）
let lastOrientation = null;          // 直近の deviceorientation イベント値
let gyroTheta       = 0;             // 有効化した瞬間のカメラの水平角
let gyroPhi         = Math.PI / 2;   // 有効化した瞬間のカメラの仰角
let gyroRadius      = 15;            // 有効化した瞬間のカメラ〜注視点の距離（そのまま維持）

function getOC() {
    return rig.components && rig.components['orbit-controls'];
}

function getCamObj(oc) {
    return oc.controls.object || oc.el.getObject3D('camera');
}

function lerpVec(vec, tx, ty, tz, f) {
    vec.x += (tx - vec.x) * f;
    vec.y += (ty - vec.y) * f;
    vec.z += (tz - vec.z) * f;
}

function distSq(vec, tx, ty, tz) {
    const dx = vec.x - tx, dy = vec.y - ty, dz = vec.z - tz;
    return dx*dx + dy*dy + dz*dz;
}

// ---- 端末の向きで視点を操作する機能 ----
function requestGyroPermission() {
    // iOS 13+ の Safari はユーザー操作から呼び出さないと許可ダイアログが出ない
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        return DeviceOrientationEvent.requestPermission();
    }
    return Promise.resolve('granted');
}

// 角度の差分をラップアラウンド（0°/360°の境界）を考慮して計算
function angleDeltaDeg(a, b) {
    return ((a - b + 180) % 360 + 360) % 360 - 180;
}

function onDeviceOrientation(e) {
    if (e.alpha === null) return; // センサー値が取得できない端末
    if (!gyroBase) {
        gyroBase = { alpha: e.alpha, beta: e.beta || 0 };
    }
    lastOrientation = e;
}

function enableGyro() {
    const oc = getOC();
    if (!oc || !oc.controls) return;
    const camObj = getCamObj(oc);
    if (!camObj) return;
    const target = oc.controls.target;

    // 現在のカメラ位置（＝その時点の視点）から球面座標を取得し、そのまま起点にする
    const dx = camObj.position.x - target.x;
    const dy = camObj.position.y - target.y;
    const dz = camObj.position.z - target.z;
    gyroRadius = Math.sqrt(dx*dx + dy*dy + dz*dz) || 15;
    gyroTheta  = Math.atan2(dx, dz);
    gyroPhi    = Math.acos(Math.max(-1, Math.min(1, dy / gyroRadius)));

    gyroBase        = null;
    lastOrientation = null;
    gyroActive      = true;
    oc.controls.enableRotate = false; // ジャイロ操作中はドラッグ回転と競合しないよう無効化

    stopIdle();
    clearTimeout(idleTimer);

    window.addEventListener('deviceorientation', onDeviceOrientation);
    gyroBtn.classList.add('active');
}

function disableGyro() {
    if (!gyroActive) return;
    gyroActive = false;
    window.removeEventListener('deviceorientation', onDeviceOrientation);

    const oc = getOC();
    if (oc && oc.controls) oc.controls.enableRotate = true;

    gyroBtn.classList.remove('active');
    idleTimer = setTimeout(startIdle, ORBIT_DELAY * 1000);
}

// ---- 端末の向き rAF ループ ----
// deviceorientation イベントの値を毎フレーム反映し、有効化時点のカメラ位置（半径・注視点）を
// 保ったまま、端末の向きの変化分だけカメラを球面上で回転させる。
function gyroLoop() {
    if (gyroActive && gyroBase && lastOrientation) {
        const oc = getOC();
        if (oc && oc.controls) {
            const camObj = getCamObj(oc);
            const target = oc.controls.target;
            if (camObj) {
                const dAlpha = angleDeltaDeg(lastOrientation.alpha, gyroBase.alpha) * Math.PI / 180;
                const dBeta  = ((lastOrientation.beta || 0) - gyroBase.beta) * Math.PI / 180;

                const theta = gyroTheta - dAlpha;
                let phi     = gyroPhi - dBeta;
                phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi)); // 真上・真下付近での反転を防止

                const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi);
                camObj.position.x = target.x + gyroRadius * sinPhi * Math.sin(theta);
                camObj.position.y = target.y + gyroRadius * cosPhi;
                camObj.position.z = target.z + gyroRadius * sinPhi * Math.cos(theta);
            }
        }
    }
    requestAnimationFrame(gyroLoop);
}
requestAnimationFrame(gyroLoop);

// ---- 自動オービット rAF ループ ----
// autoRotate に依存せず、毎フレーム球面座標でカメラ位置を直接計算・設定する。
// OrbitControls は次の update() でこの位置を読み取り、そのまま維持する。
// 水平回転・仰角の速度を一定間隔でランダムに選び直し、そこへなめらかに近づけることで、
// 毎回異なる・その場でリアルタイムに揺らぐ軌道になる（決まりきった周期運動にはならない）。
function autoOrbitLoop(timestamp) {
    const t  = timestamp * 0.001; // 秒
    const dt = orbitLastTime === null ? 0 : Math.min(t - orbitLastTime, 0.1);
    orbitLastTime = isIdle && !gyroActive ? t : null;

    if (isIdle && !gyroActive) {
        const oc = getOC();
        if (oc && oc.controls) {
            const camObj = getCamObj(oc);
            if (camObj) {
                const target = oc.controls.target;

                // 初回: 現在位置から球面座標を取得し、目標速度も新たに抽選
                if (orbitTheta === null) {
                    const dx = camObj.position.x - target.x;
                    const dy = camObj.position.y - target.y;
                    const dz = camObj.position.z - target.z;
                    orbitR     = Math.sqrt(dx*dx + dy*dy + dz*dz) || 15;
                    orbitTheta = Math.atan2(dx, dz);
                    orbitPhi   = Math.acos(Math.max(-1, Math.min(1, dy / orbitR)));
                    randomizeThetaTarget();
                    randomizePhiTarget();
                    orbitThetaRetargetAt = t + ORBIT_THETA_RETARGET_MIN_SEC + Math.random() * (ORBIT_THETA_RETARGET_MAX_SEC - ORBIT_THETA_RETARGET_MIN_SEC);
                    orbitPhiRetargetAt   = t + ORBIT_PHI_RETARGET_MIN_SEC   + Math.random() * (ORBIT_PHI_RETARGET_MAX_SEC   - ORBIT_PHI_RETARGET_MIN_SEC);
                }

                // 水平回転は長い間隔でしか向き・速さを選び直さない（モデルの全周が見えるくらい大きく周回させる）
                if (t >= orbitThetaRetargetAt) {
                    randomizeThetaTarget();
                    orbitThetaRetargetAt = t + ORBIT_THETA_RETARGET_MIN_SEC + Math.random() * (ORBIT_THETA_RETARGET_MAX_SEC - ORBIT_THETA_RETARGET_MIN_SEC);
                }
                // 仰角は短い間隔でゆらぐ
                if (t >= orbitPhiRetargetAt) {
                    randomizePhiTarget();
                    orbitPhiRetargetAt = t + ORBIT_PHI_RETARGET_MIN_SEC + Math.random() * (ORBIT_PHI_RETARGET_MAX_SEC - ORBIT_PHI_RETARGET_MIN_SEC);
                }

                // 現在速度を目標速度へなめらかに近づける（急な方向転換を避ける）
                const ease = dt > 0 ? Math.min(1, dt / ORBIT_SPEED_EASE_SEC) : 0;
                orbitThetaSpeed += (orbitThetaSpeedGoal - orbitThetaSpeed) * ease;
                orbitPhiSpeed   += (orbitPhiSpeedGoal   - orbitPhiSpeed)   * ease;

                orbitTheta += orbitThetaSpeed * dt;

                if (idleReturnHome) {
                    // 無操作が長く続いた場合：水平回転（テーマ）はそのまま続けつつ、
                    // ズーム（半径）・仰角・注視点だけをホーム視点へなめらかに近づける。
                    // 一気に戻す（テレポート/直線移動）のではなく、自動回転を続けながら徐々に収束させる。
                    const returnEase = dt > 0 ? Math.min(1, dt / ORBIT_RETURN_EASE_SEC) : 0;
                    orbitR   += (HOME_ORBIT.r   - orbitR)   * returnEase;
                    orbitPhi += (HOME_ORBIT.phi - orbitPhi) * returnEase;
                    lerpVec(target, HOME.tx, HOME.ty, HOME.tz, returnEase);
                } else {
                    const phiMin = ORBIT_PHI_CENTER - ORBIT_PHI_RANGE;
                    const phiMax = ORBIT_PHI_CENTER + ORBIT_PHI_RANGE;
                    let nextPhi  = orbitPhi + orbitPhiSpeed * dt;
                    if (nextPhi < phiMin || nextPhi > phiMax) {
                        nextPhi = Math.max(phiMin, Math.min(phiMax, nextPhi));
                        orbitPhiSpeed     *= -1; // 可動範囲の端で自然に跳ね返す
                        orbitPhiSpeedGoal *= -1;
                    }
                    orbitPhi = nextPhi;
                }

                const sinPhi = Math.sin(orbitPhi);
                const cosPhi = Math.cos(orbitPhi);

                camObj.position.x = target.x + orbitR * sinPhi * Math.sin(orbitTheta);
                camObj.position.y = target.y + orbitR * cosPhi;
                camObj.position.z = target.z + orbitR * sinPhi * Math.cos(orbitTheta);
            }
        }
    }
    requestAnimationFrame(autoOrbitLoop);
}
requestAnimationFrame(autoOrbitLoop);

// ---- 待機状態の開始・終了 ----
function startIdle() {
    isIdle         = true;
    idleReturnHome = false;
    orbitTheta     = null; // 現在位置から再初期化してオービット開始

    if (!userHasInteracted) {
        exploreTimer = setTimeout(() => {
            if (isIdle) explorePrompt.classList.add('visible');
        }, 1500);
    }

    // RESET_DELAY 秒後：位置を直接リセットするのではなく、以降の autoOrbitLoop で
    // 自動回転を続けながらズーム・仰角・注視点をホーム視点へなめらかに戻す
    resetTimer = setTimeout(() => { idleReturnHome = true; }, RESET_DELAY * 1000);
}

function stopIdle() {
    isIdle         = false;
    isResetting    = false;
    idleReturnHome = false;
    orbitTheta     = null;
    orbitR         = null;
    orbitPhi       = null;
    // 速度も静止状態に戻す。次にアイドルが始まった際、前回の巡航速度をそのまま引き継いで
    // いきなり動き出すのではなく、必ず止まった状態からなめらかに加速し始めるようにするため。
    orbitThetaSpeed     = 0;
    orbitThetaSpeedGoal = 0;
    orbitPhiSpeed       = 0;
    orbitPhiSpeedGoal   = 0;
    clearTimeout(exploreTimer);
    clearTimeout(resetTimer);
    cancelAnimationFrame(resetAnim);
    explorePrompt.classList.remove('visible');
}

// ---- ユーザー操作ハンドラ ----
function onUserInteraction() {
    if (gyroActive) return; // ジャイロ操作中はアイドル用タイマーを動かさない
    userHasInteracted = true;
    stopIdle();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(startIdle, ORBIT_DELAY * 1000);
}

['pointerdown', 'wheel', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, onUserInteraction, { passive: true })
);

// ページロード後 2 秒でアイドル開始
idleTimer = setTimeout(startIdle, 2000);

// ---- 視点リセットボタン ----
const resetBtn = document.getElementById('reset-btn');

resetBtn.addEventListener('click', () => {
    resetBtn.classList.add('spinning');
    setTimeout(() => resetBtn.classList.remove('spinning'), 420);

    disableGyro();
    stopIdle();
    clearTimeout(idleTimer);
    isResetting = true;
    cancelAnimationFrame(resetAnim);

    function manualResetLoop() {
        const oc = getOC();
        if (!oc || !oc.controls) {
            resetAnim = requestAnimationFrame(manualResetLoop);
            return;
        }

        const camObj = getCamObj(oc);
        if (camObj) lerpVec(camObj.position, HOME.px, HOME.py, HOME.pz, 0.06);
        lerpVec(oc.controls.target, HOME.tx, HOME.ty, HOME.tz, 0.06);

        const dCam = camObj ? distSq(camObj.position, HOME.px, HOME.py, HOME.pz) : 0;
        const dTgt = distSq(oc.controls.target, HOME.tx, HOME.ty, HOME.tz);

        if (dCam > 0.01 || dTgt > 0.01) {
            resetAnim = requestAnimationFrame(manualResetLoop);
        } else {
            isResetting = false;
            idleTimer   = setTimeout(startIdle, ORBIT_DELAY * 1000);
        }
    }
    resetAnim = requestAnimationFrame(manualResetLoop);
});

// ---- フルスクリーン ----
const fsBtn        = document.getElementById('fullscreen-btn');
const iconExpand   = document.getElementById('icon-expand');
const iconCollapse = document.getElementById('icon-collapse');

function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateFsIcon() {
    const fs = isFullscreen();
    iconExpand.style.display   = fs ? 'none' : '';
    iconCollapse.style.display = fs ? ''     : 'none';
    fsBtn.title = fs ? '全画面を終了' : '全画面表示';
}

fsBtn.addEventListener('click', () => {
    if (isFullscreen()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
});

document.addEventListener('fullscreenchange', updateFsIcon);
document.addEventListener('webkitfullscreenchange', updateFsIcon);


// MIT License | github.com/ChikumaTateshina/Web3DViewer