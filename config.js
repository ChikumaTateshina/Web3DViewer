// ============================================================
// ビューア設定ファイル
// 展示物や公開環境ごとに変更する項目をここにまとめています。
// index.html 自体を編集しなくても、この値を書き換えるだけで
// 表示するモデルやタイトル、背景などを切り替えられます。
// ============================================================
const VIEWER_CONFIG = {
    // ブラウザのタブに表示されるページタイトル
    pageTitle: "3D Model Viewer",

    // 画面左上に表示する作品タイトル（配列の要素ごとに改行されます）
    displayTitle: ["Sample Model", "3D Model Viewer"],

    // 表示する3Dモデルのファイル名（.gltf / .glb）。
    // 「Assets」フォルダ内に配置し、ファイル名のみを指定してください（例: "index.gltf"）
    modelFile: "index.gltf",

    // モデルの初期位置・回転（度）・拡大縮小率
    modelPosition: { x: 0, y: 0, z: 0 },
    modelRotation: { x: 0, y: 0, z: 0 },
    modelScale:    { x: 1, y: 1, z: 1 },

    // モデル読み込み中に表示するテキスト（空文字にすると読み込み中の表示自体を無効化）
    loadingText: "読み込み中...",

    // trueにすると、3Dモデルの裏面（法線が逆向きの面）を描画しません
    // モデル内部が透けて見えてしまう場合や、裏面のちらつきを抑えたい場合に有効化してください
    cullBackfaces: false,

    // trueにすると、glTFファイルに含まれるアニメーションを自動再生します
    playAnimations: true,
    // 再生するアニメーションクリップ名（"*" を指定すると全てのクリップを同時に再生）
    animationClip: "*",
    // ループ方法: "repeat"（繰り返し） / "once"（1回のみ） / "pingpong"（往復）
    animationLoop: "repeat",
    // 再生速度の倍率（1が等速、2で2倍速、0.5で半分の速さ）
    animationTimeScale: 1,

    // trueにするとVR/ARヘッドセットやスマートフォンでの表示ボタンを有効化します
    // enableWebAR は対応端末・ブラウザ（WebXR対応、主にAndroid Chrome等）でのみボタンが表示されます
    enableWebVR: true,
    enableWebAR: true,

    // trueにすると、スマートフォンなどの向きセンサーと視点を同期させるボタンを有効化します
    // 対応端末（ジャイロセンサー搭載のスマートフォン等）でのみボタンが表示されます
    enableDeviceOrientation: true,

    // 背景の種類: "color"（単色） または "image"（360°パノラマ画像）
    backgroundType: "color",

    // backgroundType が "color" のときの背景色
    backgroundColor: "#8FA8BF",

    // backgroundType が "image" のときに使う360°パノラマ画像のファイル名
    // 正距円筒図法（equirectangular）(.jpgイメージ1MB以内推奨)の画像を用意し、「Assets」フォルダ内に配置してください
    backgroundImage: "",

    // 霧（フォグ）の色・距離。3Dモデルの色調に合わせて調整してください
    fogColor: "#8FA8BF",
    fogNear: 60,
    fogFar: 120,

    // 初期カメラ位置 (px, py, pz) と注視点 (tx, ty, tz)
    // 「視点をリセット」ボタンや自動リセットもこの位置に戻ります
    cameraHome: { px: 20, py: 20, pz: 15, tx: 0, ty: 2, tz: 0 },

    // 無操作状態が続いたときに自動回転を開始するまでの秒数
    idleOrbitDelaySec: 30,

    // 無操作状態が続いたときに初期視点へ自動的に戻るまでの秒数
    idleResetDelaySec: 60,

    // 無操作時の自動回転（カメラが自動でぐるっと動く演出）の速さや上下の揺れ方を調整できます
    autoOrbit: {
        // 水平方向の回転速度の範囲（度/秒）。この範囲内でランダムに変化し続けます
        // （値を大きくするほど速く回転します。min/maxを同じ値にすると常に一定速度になります）
        speedMinDeg: 10,
        speedMaxDeg: 45,

        // 上下方向のランダムな揺れの可動範囲（度）。cameraHomeで指定した見上げ角を中心に、
        // この範囲内で上下にゆっくり揺れ動きます（0にすると上下には揺れなくなります）。
        // 大きくするほど、水平線を越えてモデルを見上げるような動き（マイナス方向）も出てきます。
        // 真上・真下付近（絶対値で±約8.6°以内）には安全のため到達しません
        verticalRangeDeg: 160,

        // 上下方向の揺れの変化速度の最大値（度/秒）
        verticalSpeedMaxDeg: 20
    }
};

// MIT License | github.com/ChikumaTateshina/Web3DViewer
