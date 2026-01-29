
<div align="center">
  <h1>Three Story Controls</h1>
  <img width="500" src="https://media.giphy.com/media/QMim8tRiABuko/giphy.gif" />
  <h2>インタラクティブな 3D ストーリーを作成するための Three.js カメラツールキット</h2>
  <p>
    • 柔軟なカメラリグ API <br>
    • カメラアニメーション設計用のビジュアルツール <br>
    • カメラ制御スキームのコレクション <br>
    • カスタム制御スキーム用のスムーズな入力をカメラアクションに接続するヘルパーコンポーネント
    <br><br>
  </p>
  <img alt="License" src="https://img.shields.io/badge/License-Apache%202.0-yellow.svg" />
  <br/><br/>
    <a href="#デモ">デモ</a> &mdash;
    <a href="#使い方">使い方</a> &mdash;
    <a href="#インストール">インストール</a> &mdash;
    <a href="https://kagawa0710.github.io/three-story-controls/docs/three-story-controls.html">API ドキュメント</a> &mdash;
    <a href="#コントリビュート">コントリビュート</a> &mdash;
    <a href="README.md">English</a>
    <br><br>
    コンポーネント: <br>
    <a href="#camera-rig">Camera Rig</a> &mdash;
    <a href="#camera-helper">Camera Helper</a> &mdash;
    <a href="#コントロールスキーム">コントロールスキーム</a> &mdash;
    <a href="#入力アダプター">入力アダプター</a>
    <br>
    <a href="#独自のコントロールスキームを作成する">独自のコントロールスキームを作成する</a> <br><br>
    <em><strong>gawatech</strong> がメンテナンスするフォーク</em><br>
    <em>オリジナルは <a href="https://rd.nytimes.com">The New York Times R&D</a> が開発</em>
</div>


---

<br>

## デモ
* [FreeMovement コントロール](https://kagawa0710.github.io/three-story-controls/examples/demos/freemove): シーン内を自由に移動するファーストパーソンコントロール
* [Scroll + 3DOF コントロール](https://kagawa0710.github.io/three-story-controls/examples/demos/scroll-controls): ページをスクロールしてカメラアニメーションをスクラブ。マウス移動でカメラを少し回転
* [StoryPoint + 3DOF コントロール](https://kagawa0710.github.io/three-story-controls/examples/demos/story-points): シーン内の特定のポイント間を遷移。マウス移動でカメラを少し回転
* [PathPoint コントロール](https://kagawa0710.github.io/three-story-controls/examples/demos/path-points): カメラアニメーションの特定フレーム間を遷移
* [Camera Helper](https://kagawa0710.github.io/three-story-controls/examples/demos/camera-helper): カメラアニメーションや注目点を作成し、コントロールスキームで使用できる形式でエクスポートするヘルパーツール

<br>

---

<br>

## 使い方
`FreeMovementControls` スキームの例です。カメラの移動は矢印キーまたはマウスホイール、回転はマウスのクリック＆ドラッグで制御します。

```javascript
import { Scene, PerspectiveCamera, WebGLRenderer, GridHelper } from 'three'
import { CameraRig, FreeMovementControls } from 'three-story-controls'

const scene = new Scene()
const camera = new PerspectiveCamera()
const renderer = new WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const rig = new CameraRig(camera, scene)
const controls = new FreeMovementControls(rig)
controls.enable()

function render(t) {
  window.requestAnimationFrame(render)
  controls.update(t)
  renderer.render(scene, camera)
}

render()
```

<br>

---

<br>

## インストール

このライブラリは [three.js](https://threejs.org/) r129 以降と [gsap](https://greensock.com/gsap/) 3.6.1 に依存しており、別途インストールする必要があります。

### 1. ES Module
[`dist/three-story-controls.esm.min.js`](dist/three-story-controls.esm.min.js)をダウンロードするか、[CDN リンク](https://unpkg.com/three-story-controls@latest/dist/three-story-controls.esm.min.js)を使用し、`importmap-shim` で依存関係をインポートします。完全な例は[こちら](examples/installation/es-module)を参照してください。

  #### **`index.html`**
  ```html
  <script async src="https://unpkg.com/es-module-shims@0.11.1/dist/es-module-shims.js"></script>
  <script type="importmap-shim">
  {
    "imports": {
      "three": "https://cdn.skypack.dev/three@0.137.0",
      "gsap": "https://cdn.skypack.dev/gsap@3.6.1",
      "three-story-controls" : "./three-story-controls.esm.min.js"
    }
  }
  </script>
  <script src='index.js' type='module-shim'></script>
  ```

  #### **`index.js`**
  ```javascript
  import { Scene, PerspectiveCamera } from 'three'
  import { ScrollControls } from 'three-story-controls'
  ```

### 2. NPM
Webpack / Parcel / Rollup などのビルドシステムを使用する場合は、[npm](https://www.npmjs.com/package/three-story-controls) からインストールしてください：
```
npm install -s three gsap three-story-controls
```
webpack の例は[こちら](examples/installation/webpack)を参照してください。

### 3. Script タグ
[`dist/three-story-controls.min.js`](dist/three-story-controls.min.js)をダウンロードするか、[CDN リンク](https://unpkg.com/three-story-controls@latest/dist/three-story-controls.min.js)を使用し、three.js と gsap と共に HTML ファイルに script タグでインクルードします。これによりグローバル変数 `ThreeStoryControls` が公開されます。詳細は[こちら](examples/installation/script-src)を参照してください：
  ```html
  <script src="https://unpkg.com/three@0.137.0/build/three.min.js"></script>
  <script src="https://unpkg.com/gsap@3.6.1/dist/gsap.min.js"></script>
  <script src='three-story-controls.min.js'></script>
  ```

<br>

---
<br><br>

# コンポーネント

## Camera Rig
ライブラリの中核コンポーネントは `CameraRig` です - 既存のカメラ変換を気にせずに pan / tilt / dolly などのカメラアクションを簡単に指定できる three.js カメラのラッパーです。

```javascript
const rig = new CameraRig(camera, scene)
rig.do(CameraAction.Pan, Math.PI / 6)
rig.do(CameraAction.Tilt, Math.PI / 12)
```

デフォルトの up 軸を `Y` に設定した場合、アクションは以下のようにマッピングされます：

| アクション    | 変換             |
| ----------- | --------------- |
| Pan         | `Y` 軸周りの回転   |
| Tilt        | `X` 軸周りの回転   |
| Roll        | `Z` 軸周りの回転   |
| Pedestal    | `Y` 軸上の移動    |
| Truck       | `X` 軸上の移動    |
| Dolly       | `Z` 軸上の移動    |

<br>

`CameraRig` には three.js の `AnimationClip` を提供して、事前定義されたレール上でアニメーション/制御することもできます。詳細は[こちら](docs/three-story-controls.camerarig.md)を参照してください。

---

## Camera Helper

`CameraHelper` ツールは任意のシーンで有効にして、カメラ位置を記録しカメラアニメーションパスを作成できます。データは JSON ファイルとしてエクスポートでき、様々なコントロールスキームで使用できます。詳細は[こちら](docs/three-story-controls.camerahelper.md)を参照してください。

![Camera Helper](camera-helper.gif)
---

## コントロールスキーム
ライブラリには 5 つのプリビルドコントロールスキームが付属しています：


| 名前 | 説明 |
| ---- | ---- |
| [FreeMovementControls](docs/three-story-controls.freemovementcontrols.md) | クリック＆ドラッグでカメラを上下左右に回転；WASD、矢印キー、マウスホイール/トラックパッドで前後左右に移動 |
| [ScrollControls](docs/three-story-controls.scrollcontrols.md) | DOM 要素をスクロールして `AnimationClip` で指定されたパスに沿ってカメラをスクラブ |
| [StoryPointControls](docs/three-story-controls.storypointscontrols.md) | 指定されたポイント間でカメラを遷移 |
| [PathPointControls](docs/three-story-controls.pathpointscontrols.md) | `AnimationClip` で指定されたパスの特定フレームにカメラを遷移 |
| [ThreeDOFControls](docs/three-story-controls.threedofcontrols.md) | その場にいながらカメラを少し回転 - 他のコントロールスキームと併用することを想定 |


---

## 入力アダプター
アダプターは入力データをスムージングし、より扱いやすい形式に変換し、変換されたデータでイベントを発行する役割を担います。

| 名前 | 説明 |
| ---- | ---- |
| [PointerAdaptor](docs/three-story-controls.pointeradaptor.md) | ポインター移動、クリック＆ドラッグ、マルチタッチイベントを処理 |
| [KeyboardAdaptor](docs/three-story-controls.keyboardadaptor.md) | 指定されたキーのキーボードイベントを処理 |
| [ScrollAdaptor](docs/three-story-controls.scrolladaptor.md) | 指定された DOM 要素のスクロール距離計算を処理 |
| [SwipeAdaptor](docs/three-story-controls.swipeadaptor.md) | スワイプイベントを検出して処理 |
| [WheelAdaptor](docs/three-story-controls.wheeladaptor.md) | マウスホイールイベントを処理し、しきい値付きホイール移動を検出 |

---

## 独自のコントロールスキームを作成する
`Adaptor` と `CameraRig` を組み合わせて独自のコントロールスキームを構築できます。以下は TypeScript での大まかな実装です。例として既存の[コントロールスキーム](src/controlschemes)を参照してください。

```typescript
class MyCustomControls implements BaseControls {
  constructor(cameraRig) {
    this.rig = rig
    // 必要なアダプターを初期化
    this.keyboardAdaptor = new KeyboardAdaptor( /* props */ )
    this.pointerAdaptor = new PointerAdaptor( /* props */ )
    // このクラスインスタンスをイベントハンドラー関数にバインド（以下で実装）
    this.onKey = this.onKey.bind(this)
    this.onPointer = this.onPointer.bind(this)
  }


  // イベントを処理
  // アダプターはスムージングされた（および正規化された）値を発行し、必要に応じて処理できます
  // イベントシグネチャの詳細はアダプターのドキュメントを参照
  private onKey(event) {
    // Camera Rig に特定のアクションを指定された量で実行するよう指示
    this.cameraRig.do(CameraAction.Dolly, event.value.backward - event.value.forward)
  }

  private onPointer(event) {
    this.cameraRig.do(CameraAction.Pan, event.deltas.x)
  }

  // BaseControl メソッドを実装
  enable() {
    // アダプターを接続
    this.keyboardAdaptor.connect()
    this.pointerAdaptor.connect()
    this.keyboardAdaptor.addEventListener('update', this.onKey)
    this.pointerAdaptor.addEventListener('update', this.onPointer)
    this.enabled = true
  }

  // BaseControl メソッドを実装
  disable() {
    // 切断、イベントリスナーを削除、enabled を false に設定
  }

  // BaseControl メソッドを実装
  update(time: number): void {
    if (this.enabled) {
      this.keyboardAdaptor.update()
      this.pointerAdaptor.update(time)
    }
  }
}
```


---

## API とデモ
API ドキュメントは[こちら](docs/three-story-controls.md)、デモは[こちら](https://kagawa0710.github.io/three-story-controls/)で確認できます。デモのコードは [`examples/demos`](examples/demos) にあります。

---

## コントリビュート
コントリビューションを歓迎します！ローカルで開発するには、`npm install` を実行してから `npm run dev` を実行します。[demos](examples/demos) ディレクトリが監視され、`http://localhost:8080/examples/demos` で提供されます。変更をテストするための新しいページを追加できます（テストページは git で無視されるようにしてください）。

新しいコンポーネントを追加する場合は、例を作成し、[TSDoc](https://tsdoc.org/) 標準に従ってドキュメント化してください。ライブラリは [API Extractor](https://api-extractor.com/) を使用しており、[いくつかの追加](https://api-extractor.com/pages/tsdoc/doc_comment_syntax/)コメントタグが利用可能です。ドキュメントを抽出するには、`npm run docs` を実行します。

---

## クレジット

これは [nytimes/three-story-controls](https://github.com/nytimes/three-story-controls) のフォークです。オリジナルは The New York Times の Research & Development チームが開発しました。詳細は [rd.nytimes.com](https://rd.nytimes.com) をご覧ください。

このフォークは **gawatech** がメンテナンスしており、そのままの状態でご利用いただけます。
