# Web3DViewer

A-Frame を用いたブラウザ上の3Dモデルビューアです。ドラッグ／タッチ操作で3Dモデルを自由に回転・移動・ズームして閲覧できます。

## デモ

`index.html` をそのままブラウザで開く、または GitHub Pages 等で公開すれば動作します。

## 特徴

- ドラッグ・ピンチ操作によるモデルの回転／移動／ズーム
- 無操作時の自動回転・視点リセット
- 全画面表示ボタン
- モデル読み込み中のローディング表示
- 単色背景・360°パノラマ画像背景の切り替え
- WebVR（VRヘッドセット）／WebAR（対応スマートフォン）表示への対応（設定でON/OFF切り替え可能）
- スマートフォンの向きに合わせて視点を回転させるジャイロ操作ボタン（対応端末のみ）
- glTFに含まれるアニメーションの自動再生（視点操作中も常に再生され続けます。一時停止／再生ボタンつき）

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | ページのマークアップ |
| `style.css` | 見た目（CSS） |
| `main.js` | ビューアの挙動（JavaScript） |
| `config.js` | 表示内容の設定値 |
| `Assets/` | 3Dモデルなどのアセット置き場 |

## 設定方法

表示内容は [`config.js`](config.js) にまとめてあります。`index.html` を直接編集しなくても、この値を書き換えるだけで以下を変更できます。

| 項目 | 説明 |
| --- | --- |
| `pageTitle` | ブラウザタブに表示されるページタイトル |
| `displayTitle` | 画面左上に表示する作品タイトル |
| `modelFile` | 表示する3Dモデルのファイル名（`.gltf` / `.glb`）。`Assets` フォルダ内のファイル名のみを指定 |
| `modelPosition` / `modelRotation` / `modelScale` | モデルの初期位置・回転（度）・拡大縮小率 |
| `loadingText` | モデル読み込み中に表示するテキスト（空文字で非表示） |
| `cullBackfaces` | trueで3Dモデルの裏面（法線が逆向きの面）を描画しない |
| `playAnimations` | trueでglTFに含まれるアニメーションを自動再生 |
| `animationClip` | 再生するアニメーションクリップ名（`"*"` で全クリップを同時再生） |
| `animationLoop` | ループ方法。`"repeat"`（繰り返し） / `"once"`（1回のみ） / `"pingpong"`（往復） |
| `animationTimeScale` | アニメーションの再生速度倍率 |
| `enableWebVR` | VRモードUI（VRヘッドセットでの表示ボタン）の表示可否 |
| `enableWebAR` | ARボタンの表示可否（対応端末・ブラウザでのみ表示されます） |
| `backgroundType` | 背景の種類。`"color"`（単色）または `"image"`（360°パノラマ画像） |
| `backgroundColor` | `backgroundType` が `"color"` のときの背景色 |
| `backgroundImage` | `backgroundType` が `"image"` のときに使う360°パノラマ画像（正距円筒図法／equirectangular）のファイル名。`Assets` フォルダ内に配置 |
| `fogColor` / `fogNear` / `fogFar` | 霧の色・距離 |
| `cameraHome` | 初期カメラ位置と注視点 |
| `idleOrbitDelaySec` / `idleResetDelaySec` | 無操作時の自動回転・自動リセットまでの秒数 |

自分の3Dモデルを表示する場合は、`Assets` フォルダにモデルファイル（`.gltf`とその関連ファイル、または`.glb`）を配置し、`config.js` の `modelFile` をそのファイル名に変更してください。

360°パノラマ画像を背景にする場合は、正距円筒図法（equirectangular）の画像を `Assets` フォルダに配置し、`config.js` の `backgroundType` を `"image"`、`backgroundImage` をそのファイル名に設定してください。

## 自分のリポジトリで公開する（GitHub Pages）

コマンド操作は一切使わず、すべてブラウザ上の操作だけで公開できます。GitHubのアカウントを持っていない場合は、事前に [github.com](https://github.com/) で無料アカウントを作成しておいてください。

### 1. プロジェクトのファイル一式をダウンロードする

1. このリポジトリのGitHubページを開きます。
2. 右上あたりにある緑色の **「Code」** ボタンをクリックします。
3. 開いたメニューの一番下にある **「Download ZIP」** をクリックし、ZIPファイルをパソコンに保存します。
4. 保存したZIPファイルを右クリックして展開（解凍）します。`index.html` や `Assets` フォルダなどが入ったフォルダができます。

### 2. GitHubに新しいリポジトリを作成する

1. GitHubにログインした状態で、画面右上の **「+」アイコン** → **「New repository」** をクリックします。
2. **「Repository name」** に好きな名前を入力します（例: `my-3d-viewer`）。
3. 公開設定は **「Public」** を選択します（Freeプランでは、Publicなリポジトリでのみ無料でGitHub Pagesを使えます）。
4. 「Add a README file」「Add .gitignore」「Choose a license」は**すべてチェックを入れず**、そのままにしてください。
5. 一番下の緑色の **「Create repository」** ボタンをクリックします。

### 3. ファイルをアップロードする

1. 作成直後のリポジトリページに、「Quick setup」という案内が表示されます。その中にある **「uploading an existing file」** というリンクをクリックします。
   （見当たらない場合は、リポジトリページの **「Add file」** ボタン → **「Upload files」** からでも同じ画面に行けます。）
2. 展開したフォルダの中身（`index.html`、`style.css`、`main.js`、`config.js`、`Assets` フォルダなど）を**フォルダごとまとめて**、画面中央のアップロード領域にドラッグ＆ドロップします。
   - フォルダごとドラッグすると、`Assets/` の中のファイルも含めて構造を保ったままアップロードできます（Chrome・Edge・Firefoxなどの最新ブラウザで対応）。
   - うまくいかない場合は、アップロード領域内の **「choose your files」** リンクからファイル選択ダイアログを使ってください。
3. ページ下部の **「Commit changes」** の欄はそのままで構いません。緑色の **「Commit changes」** ボタンをクリックすると、アップロードが確定されます。

### 4. GitHub Pagesを有効化する

1. リポジトリページ上部のタブから **「Settings」** を開きます。
2. 左側のメニューから **「Pages」** を選びます。
3. 「Build and deployment」の **「Source」** が **「Deploy from a branch」** になっていることを確認します。
4. その下の **「Branch」** で、ブランチを **「main」**、フォルダを **「/ (root)」** に設定し、**「Save」** をクリックします。

### 5. 公開されたページを確認する

1. 1〜2分ほど待ってから、もう一度「Settings」→「Pages」の画面を開き直します。
2. ページ上部に緑色の帯で **「Your site is live at https://〈あなたのアカウント名〉.github.io/〈リポジトリ名〉/」** と表示されていれば公開完了です。
3. そのURL、または **「Visit site」** ボタンからアクセスすると、ブラウザ上で3Dビューアが表示されます。

### 6. 公開後にモデルや設定を変更する

1. リポジトリページで `config.js` を開き、右上の**鉛筆アイコン（Edit this file）**をクリックします。
2. 内容を書き換えたら、ページ下部の **「Commit changes」** ボタンをクリックします。
3. 1〜2分ほどでGitHub Pages側にも変更が自動的に反映されます。
4. 3Dモデルを差し替える場合も同様に、`Assets` フォルダを開いて「Add file」→「Upload files」から新しいファイルを追加し、`config.js` の `modelFile`（や `backgroundImage`）を新しいファイル名に書き換えてください。

> [!NOTE]
> GitHubには1ファイルあたり25MBまでという制限があります。3Dモデルのファイルサイズが大きい場合は、Blender等のエクスポート時にテクスチャ解像度やポリゴン数を落とすなどして、事前に軽量化してください。

## ライセンス

本リポジトリのコード（`index.html` / `style.css` / `main.js` / `config.js` 等）は [MITライセンス](LICENSE) の下で公開しています。

```
MIT License
Copyright (c) 2026 蓼科 千曲 / TATESHINA Chikuma
```

同梱の3Dモデルはサンプルです。ご自身のモデルに差し替えてご利用ください。
