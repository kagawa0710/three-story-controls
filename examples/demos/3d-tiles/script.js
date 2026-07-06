import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { TilesRenderer } from '3d-tiles-renderer'
import { CameraRig, FreeMovementControls } from 'three-story-controls'

const canvasParent = document.querySelector('.canvas-parent')
const scene = new Scene()
scene.background = new Color('#dbe7f0')

const camera = new PerspectiveCamera(60, 1, 0.1, 10000)
const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(canvasParent.clientWidth, canvasParent.clientHeight)
canvasParent.appendChild(renderer.domElement)

scene.add(new AmbientLight(0xffffff, 1.4))

const sun = new DirectionalLight(0xffffff, 1.6)
sun.position.set(50, 80, 20)
scene.add(sun)

const rig = new CameraRig(camera, scene)
const controls = new FreeMovementControls(rig, {
  domElement: canvasParent,
  pointerScaleFactor: 12,
  wheelScaleFactor: 0.15,
  keyboardScaleFactor: 1.25,
})
controls.enable()

const tilesRenderer = new TilesRenderer(
  'https://cdn.jsdelivr.net/gh/CesiumGS/3d-tiles-samples@main/tilesets/TilesetWithDiscreteLOD/tileset.json'
)

tilesRenderer.setCamera(camera)
tilesRenderer.setResolutionFromRenderer(camera, renderer)
scene.add(tilesRenderer.group)

let framedTiles = false

function frameTiles() {
  const bounds = new Box3().setFromObject(tilesRenderer.group)
  if (bounds.isEmpty()) {
    return false
  }

  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  const distance = Math.max(size.x, size.y, size.z) * 1.5
  const position = center.clone().add(new Vector3(distance, distance * 0.5, distance))
  const direction = center.clone().sub(position).normalize()
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), direction)

  rig.setWorldCoordinates({ position, quaternion })
  framedTiles = true
  return true
}

tilesRenderer.addEventListener('load-tile-set', frameTiles)

function render(time) {
  window.requestAnimationFrame(render)
  controls.update(time)
  camera.updateMatrixWorld()
  tilesRenderer.update()
  if (!framedTiles) {
    frameTiles()
  }
  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  const width = canvasParent.clientWidth
  const height = canvasParent.clientHeight
  camera.aspect = width / Math.max(height, 1)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  tilesRenderer.setResolutionFromRenderer(camera, renderer)
})

window.dispatchEvent(new Event('resize'))
render()
