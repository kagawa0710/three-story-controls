import {
  Quaternion,
  Vector3,
  PerspectiveCamera,
  AnimationClip,
  VectorKeyframeTrack,
  QuaternionKeyframeTrack,
  NumberKeyframeTrack,
} from 'three'
import gsap from 'gsap'
import { CameraRig } from '../CameraRig'
import { FreeMovementControls } from '../controlschemes/FreeMovementControls'
import { Easings } from '../controlschemes/ScrollControls'
import type { EasingFunction } from '../controlschemes/ScrollControls'
import './index.css'

const easeFunctions = ['none', 'power1', 'power2', 'power3', 'power4', 'sine', 'expo', 'circ']

const scrollEaseFunctions: Record<string, EasingFunction> = {
  linear: Easings.linear,
  easeInQuad: Easings.easeInQuad,
  easeOutQuad: Easings.easeOutQuad,
  easeInOutQuad: Easings.easeInOutQuad,
  easeInCubic: Easings.easeInCubic,
  easeOutCubic: Easings.easeOutCubic,
  easeInOutCubic: Easings.easeInOutCubic,
}

function drawEasingCurve(canvas: HTMLCanvasElement, easeFn: EasingFunction): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const padding = 8

  ctx.clearRect(0, 0, w, h)

  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.strokeRect(padding, padding, w - padding * 2, h - padding * 2)

  ctx.beginPath()
  ctx.strokeStyle = '#6cf'
  ctx.lineWidth = 2
  const steps = 100
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const v = easeFn(t)
    const x = padding + t * (w - padding * 2)
    const y = h - padding - v * (h - padding * 2)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

interface POI {
  position: Vector3
  quaternion: Quaternion
  duration: number
  ease: string
  fov: number
  image: string
}

const DOMClass = {
  visit: 'visit',
  remove: 'remove',
  duration: 'duration',
  ease: 'ease',
  fov: 'fov',
  fovRange: 'fov-range',
  moveUp: 'move-up',
  moveDown: 'move-down',
}

/**
 * A helper tool for creating camera animation paths and/or choosing camera look-at positions for points of interest in a scene
 *
 * @remarks
 * The `CameraHelper` can be set up with any scene along with {@link three-story-controls#FreeMovementControls | FreeMovementControls}.
 *
 * It renders as an overlay with functionality to add/remove/reorders points of interest, and create an animation path between them.
 *  Each saved camera position is displayed with an image on the `CameraHelper` panel.
 *
 * The data can be exported as a JSON file that can then be used with different control schemes.
 *
 * @example
 * ```js
 * const cameraHelper = new CameraHelper(rig, controls, renderer.domElement)
 *
 * function render(t) {
 *   controls.update(t)
 *   renderer.render(scene, camera)
 *   cameraHelper.update(t)
 *   window.requestAnimationFrame(render)
 * }
 * ```
 */
export class CameraHelper {
  readonly rig: CameraRig
  readonly controls: FreeMovementControls
  readonly canvas: HTMLCanvasElement
  private pois: POI[]
  private currentIndex: number | null
  private drawer: HTMLElement
  private domList: HTMLElement
  private collapseBtn: HTMLElement
  private fileInput: HTMLInputElement
  private doCapture: boolean
  private animationClip: AnimationClip
  private isPlaying: boolean
  private playStartTime: number
  private useSlerp = true
  private scrollPreviewMode = false
  private scrollAutoPlaying = false
  private scrollAutoPlayStart: number
  private scrollAutoPlayDuration = 5000
  private scrollSlider: HTMLInputElement
  private sliderLabel: HTMLElement
  private poiCountEl: HTMLElement
  private btnScrollAutoPlay: HTMLElement
  private scrollEase: EasingFunction = Easings.linear
  private scrollEaseName = 'linear'
  private easeCurveCanvas: HTMLCanvasElement

  constructor(rig: CameraRig, controls: FreeMovementControls, canvas: HTMLCanvasElement, canvasParent?: HTMLElement) {
    this.rig = rig
    this.controls = controls
    this.canvas = canvas
    this.pois = []
    this.currentIndex = null
    this.doCapture = false
    this.isPlaying = false
    this.initUI(canvasParent)
  }

  private capture(): void {
    this.doCapture = true
  }

  update(time: number): void {
    if (this.doCapture) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 640
      canvas.height = 360
      ctx.drawImage(this.canvas, 0, 0, canvas.width, canvas.height)
      const image = canvas.toDataURL()

      this.addPoi(image)
      this.doCapture = false
    }
    if (this.isPlaying) {
      if (!this.playStartTime) {
        this.playStartTime = time
        this.controls.disable()
        this.rig.packTransform()
      }
      const t = (time - this.playStartTime) / 1000
      this.rig.setAnimationTime(t)
      const progress = Math.min(t / this.animationClip.duration, 1)
      if (this.scrollSlider) this.scrollSlider.value = String(progress * 1000)
      if (this.sliderLabel) this.sliderLabel.textContent = `${Math.round(progress * 100)}%`
      if (t > this.animationClip.duration) {
        this.isPlaying = false
        this.playStartTime = null
        this.controls.enable()
        this.rig.unpackTransform()
      }
    }
    if (this.scrollAutoPlaying) {
      if (!this.scrollAutoPlayStart) {
        this.scrollAutoPlayStart = time
        this.controls.disable()
        this.rig.packTransform()
      }
      const elapsed = time - this.scrollAutoPlayStart
      const progress = Math.min(elapsed / this.scrollAutoPlayDuration, 1)
      const easedProgress = this.scrollEase(progress)
      this.rig.setAnimationPercentage(easedProgress)
      if (this.scrollSlider) this.scrollSlider.value = String(progress * 1000)
      if (this.sliderLabel) this.sliderLabel.textContent = `${Math.round(progress * 100)}%`
      if (progress >= 1) {
        this.scrollAutoPlaying = false
        this.scrollAutoPlayStart = null
        this.controls.enable()
        this.rig.unpackTransform()
      }
    }
  }

  private getCurrentFov(): number {
    if (this.rig.camera instanceof PerspectiveCamera) {
      return this.rig.camera.fov
    }
    return 60
  }

  private addPoi(image: string): void {
    this.pois.push({
      ...this.rig.getWorldCoordinates(),
      duration: 1,
      ease: 'power1',
      fov: this.getCurrentFov(),
      image,
    })
    this.currentIndex = this.pois.length - 1
    this.createClip()
    this.render()
  }

  private updatePoi(index: number, props: Partial<POI>): void {
    this.pois[index] = {
      ...this.pois[index],
      ...props,
    }
  }

  private movePoi(index: number, direction: number): void {
    if (index + direction >= 0 && index + direction < this.pois.length) {
      const temp = this.pois[index]
      this.pois[index] = this.pois[index + direction]
      this.pois[index + direction] = temp
      this.render()
    }
  }

  private removePoi(index: number): void {
    this.pois.splice(index, 1)
    this.render()
  }

  private goToPoi(index: number): void {
    const poi = this.pois[index]
    this.rig.flyTo(poi.position, poi.quaternion, poi.duration, poi.ease, this.useSlerp)
  }

  private createClip(): void {
    if (this.pois.length > 0) {
      const times = []
      const positionValues = []
      const quaternionValues = []
      const fovValues = []
      const tmpPosition = new Vector3()
      const tmpQuaternion = new Quaternion()
      const framesPerPoi = 10

      let tweenStartTime = 0

      const defaultFov = this.getCurrentFov()

      if (!this.pois[0].quaternion.isQuaternion && !this.pois[0].position.isVector3) {
        for (let i = 0; i < this.pois.length; i++) {
          const p = this.pois[i]
          p.quaternion = new Quaternion(p.quaternion[0], p.quaternion[1], p.quaternion[2], p.quaternion[3])
          p.position = new Vector3(p.position[0], p.position[1], p.position[2])
          if (p.fov == null) p.fov = defaultFov
        }
      }

      for (let i = 0; i < this.pois.length - 1; i++) {
        const p1 = this.pois[i]
        const p2 = this.pois[i + 1]

        const values = {
          px: p1.position.x,
          py: p1.position.y,
          pz: p1.position.z,
          qx: p1.quaternion.x,
          qy: p1.quaternion.y,
          qz: p1.quaternion.z,
          qw: p1.quaternion.w,
          fov: p1.fov,
          slerpAmount: 0,
        }

        const target = {
          px: p2.position.x,
          py: p2.position.y,
          pz: p2.position.z,
          qx: p2.quaternion.x,
          qy: p2.quaternion.y,
          qz: p2.quaternion.z,
          qw: p2.quaternion.w,
          fov: p2.fov,
          slerpAmount: 1,
          duration: p2.duration,
          ease: p2.ease,
        }

        const tween = gsap.to(values, target)

        for (let j = 0; j < framesPerPoi; j++) {
          const lerpAmount = p2.duration * (j / framesPerPoi)
          times.push(tweenStartTime + lerpAmount)
          tween.seek(lerpAmount)
          if (this.useSlerp) {
            tmpQuaternion.slerpQuaternions(p1.quaternion, p2.quaternion, values.slerpAmount)
          } else {
            tmpQuaternion.set(values.qx, values.qy, values.qz, values.qw)
          }
          tmpPosition.set(values.px, values.py, values.pz)
          tmpQuaternion.toArray(quaternionValues, quaternionValues.length)
          tmpPosition.toArray(positionValues, positionValues.length)
          fovValues.push(values.fov)
        }
        tweenStartTime += p2.duration
      }

      const last = this.pois[this.pois.length - 1]
      last.quaternion.toArray(quaternionValues, quaternionValues.length)
      last.position.toArray(positionValues, positionValues.length)
      fovValues.push(last.fov)
      times.push(tweenStartTime)

      const tracks = [
        new VectorKeyframeTrack('Translation.position', times, positionValues),
        new QuaternionKeyframeTrack('Rotation.quaternion', times, quaternionValues),
        new NumberKeyframeTrack('Fov.fov', times, fovValues),
      ]

      this.animationClip = new AnimationClip(null, tweenStartTime, tracks)
      this.rig.setAnimationClip(this.animationClip)
    }
  }

  private scrubClip(amount: number): void {
    if (this.pois.length > 0) {
      const easedAmount = this.scrollEase(amount)
      this.rig.setAnimationPercentage(easedAmount)
      if (this.sliderLabel) this.sliderLabel.textContent = `${Math.round(amount * 100)}%`
    }
  }

  private exportStoryConfig(): void {
    if (this.pois.length === 0) return

    const config = {
      version: 1,
      scroll: {
        height: '600vh',
        dampingFactor: 0.1,
        startOffset: '-50vh',
        endOffset: '-50vh',
        ease: this.scrollEaseName !== 'linear' ? this.scrollEaseName : undefined,
      },
      transitions: {
        canvasFadeIn: { start: '0%', end: '15%' },
        canvasFadeOut: { start: '85%', end: '100%' },
      },
      sections: this.pois.map((poi, i) => ({
        id: `section-${i + 1}`,
        content: `<p>Section ${i + 1}</p>`,
        position: `${Math.round((i / (this.pois.length - 1 || 1)) * 80 + 10)}%`,
        placement: i % 2 === 0 ? 'left' : 'right',
      })),
    }

    const data = 'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2))
    const a = document.createElement('a')
    a.href = 'data:' + data
    a.download = 'story-config.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  private playClip(): void {
    if (this.pois.length > 0) {
      this.isPlaying = true
    }
  }

  private import(): void {
    if (this.fileInput) {
      this.fileInput.click()
      const reader = new FileReader()

      this.fileInput.onchange = () => {
        reader.readAsText(this.fileInput.files[0])
        reader.onload = (e) => {
          const parsed = JSON.parse(<string>e.target.result)
          this.pois = parsed.pois
          this.animationClip = parsed.animationClip
          this.createClip()
          this.render()
        }
      }
    }
  }

  private export({ draft }): void {
    if (this.pois.length > 0) {
      const jsondata = {} as any
      jsondata.pois = this.pois.map((poi) => {
        const position = [poi.position.x, poi.position.y, poi.position.z]
        const quaternion = [poi.quaternion.x, poi.quaternion.y, poi.quaternion.z, poi.quaternion.w]
        const obj = {
          position,
          quaternion,
          duration: poi.duration,
          ease: poi.ease,
          fov: poi.fov,
        } as any

        if (draft) {
          obj.image = poi.image
        }

        return obj
      })
      if (this.animationClip) {
        jsondata.animationClip = AnimationClip.toJSON(this.animationClip)
      }
      const data = 'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsondata))
      const a = document.createElement('a')
      a.href = 'data:' + data
      a.download = `camera-data${draft ? '-draft' : ''}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  private exportImages(): void {
    const link = document.createElement('a')
    document.body.appendChild(link)
    this.pois.forEach((poi, index) => {
      link.href = poi.image
      link.download = `camera-poi-${index}.png`
      link.click()
    })
    link.remove()
  }

  // UI

  private initUI(canvasParent?: HTMLElement): void {
    this.drawer = document.createElement('div')
    this.drawer.classList.add('tb-ch')

    // Header
    const header = document.createElement('div')
    header.classList.add('ch-header')
    const title = document.createElement('h3')
    title.textContent = 'Camera Helper'
    this.poiCountEl = document.createElement('span')
    this.poiCountEl.classList.add('poi-count')
    this.poiCountEl.textContent = '0 POIs'
    header.append(title, this.poiCountEl)

    // Floating buttons
    const btnAdd = document.createElement('button')
    btnAdd.classList.add('btn-round', 'add')
    btnAdd.innerText = '+'
    btnAdd.title = 'Capture camera position'
    btnAdd.onclick = this.capture.bind(this)

    this.collapseBtn = document.createElement('button')
    this.collapseBtn.classList.add('btn-round', 'collapse')
    this.collapseBtn.innerText = '<'
    this.collapseBtn.title = 'Toggle panel'
    this.collapseBtn.onclick = this.collapse.bind(this)

    // POI list
    this.domList = document.createElement('div')
    this.domList.classList.add('pois')
    this.domList.onclick = this.handleEvents.bind(this)
    this.domList.onchange = this.handleEvents.bind(this)
    this.domList.oninput = this.handleEvents.bind(this)

    // Controls panel
    const controlWrapper = document.createElement('div')
    controlWrapper.classList.add('controls')

    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = 'application/json'
    this.fileInput.style.display = 'none'

    // Row 1: Import / Export
    const ioGroup = document.createElement('div')
    ioGroup.classList.add('control-group')

    const btnImport = document.createElement('button')
    btnImport.classList.add('btn-action')
    btnImport.textContent = 'Import'
    btnImport.onclick = this.import.bind(this)

    const btnExportDraft = document.createElement('button')
    btnExportDraft.classList.add('btn-action')
    btnExportDraft.textContent = 'Draft'
    btnExportDraft.title = 'Export draft JSON (with images)'
    btnExportDraft.onclick = this.export.bind(this, { draft: true })

    const btnExport = document.createElement('button')
    btnExport.classList.add('btn-action', 'primary')
    btnExport.textContent = 'Export'
    btnExport.title = 'Export production JSON'
    btnExport.onclick = this.export.bind(this, { draft: false })

    const btnExportImages = document.createElement('button')
    btnExportImages.classList.add('btn-action')
    btnExportImages.textContent = 'Images'
    btnExportImages.title = 'Export POI images'
    btnExportImages.onclick = this.exportImages.bind(this)

    ioGroup.append(this.fileInput, btnImport, btnExportDraft, btnExport, btnExportImages)

    // Row 2: Play / Scroll Preview
    const playGroup = document.createElement('div')
    playGroup.classList.add('control-group')

    const btnPlay = document.createElement('button')
    btnPlay.classList.add('btn-action')
    btnPlay.textContent = 'Play'
    btnPlay.onclick = this.playClip.bind(this)

    this.btnScrollAutoPlay = document.createElement('button')
    this.btnScrollAutoPlay.classList.add('btn-action')
    this.btnScrollAutoPlay.textContent = 'Auto-scroll'
    this.btnScrollAutoPlay.title = 'Animate 0% to 100%'
    this.btnScrollAutoPlay.style.display = 'none'
    this.btnScrollAutoPlay.onclick = () => {
      if (this.pois.length > 0 && !this.scrollAutoPlaying) {
        this.scrollAutoPlaying = true
        this.scrollAutoPlayStart = null
      }
    }

    const scrollPreviewToggle = document.createElement('label')
    scrollPreviewToggle.classList.add('scroll-preview-toggle')
    const scrollPreviewCheckbox = document.createElement('input')
    scrollPreviewCheckbox.type = 'checkbox'
    scrollPreviewCheckbox.onchange = () => {
      this.scrollPreviewMode = scrollPreviewCheckbox.checked
      if (this.scrollPreviewMode) {
        this.controls.disable()
        this.rig.packTransform()
        this.btnScrollAutoPlay.style.display = ''
      } else {
        this.controls.enable()
        this.rig.unpackTransform()
        this.btnScrollAutoPlay.style.display = 'none'
      }
    }
    scrollPreviewToggle.append(scrollPreviewCheckbox, document.createTextNode(' Scroll preview'))

    playGroup.append(btnPlay, this.btnScrollAutoPlay, scrollPreviewToggle)

    // Row 3: Slider + progress label
    const sliderRow = document.createElement('div')
    sliderRow.classList.add('slider-row')

    this.scrollSlider = document.createElement('input')
    this.scrollSlider.type = 'range'
    this.scrollSlider.min = '0'
    this.scrollSlider.max = '1000'
    this.scrollSlider.step = '0.1'
    this.scrollSlider.value = '0'

    this.sliderLabel = document.createElement('span')
    this.sliderLabel.classList.add('slider-label')
    this.sliderLabel.textContent = '0%'

    const updateTime = this.scrubClip.bind(this)
    this.scrollSlider.onmousedown = () => this.rig.packTransform()
    this.scrollSlider.ontouchstart = () => this.rig.packTransform()
    this.scrollSlider.onmouseup = () => {
      if (!this.scrollPreviewMode) this.rig.unpackTransform()
    }
    this.scrollSlider.ontouchend = () => {
      if (!this.scrollPreviewMode) this.rig.unpackTransform()
    }
    this.scrollSlider.oninput = (e) => updateTime(parseInt((<HTMLInputElement>e.target).value) / 1000)

    sliderRow.append(this.scrollSlider, this.sliderLabel)

    // Row 4: Scroll easing
    const easeGroup = document.createElement('div')
    easeGroup.classList.add('control-group')

    const easeLabel = document.createElement('label')
    easeLabel.textContent = 'Scroll ease'
    easeLabel.style.fontSize = '0.7rem'
    easeLabel.style.color = '#999'
    easeLabel.style.flexShrink = '0'

    const scrollEaseSelect = document.createElement('select')
    scrollEaseSelect.classList.add('btn-action')
    scrollEaseSelect.style.flex = '1'
    Object.keys(scrollEaseFunctions).forEach((name) => {
      const op = document.createElement('option')
      op.value = name
      op.textContent = name
      op.selected = name === this.scrollEaseName
      scrollEaseSelect.appendChild(op)
    })
    scrollEaseSelect.onchange = () => {
      this.scrollEaseName = scrollEaseSelect.value
      this.scrollEase = scrollEaseFunctions[this.scrollEaseName] ?? Easings.linear
      drawEasingCurve(this.easeCurveCanvas, this.scrollEase)
    }

    easeGroup.append(easeLabel, scrollEaseSelect)

    // Row 5: Easing curve preview
    this.easeCurveCanvas = document.createElement('canvas')
    this.easeCurveCanvas.width = 300
    this.easeCurveCanvas.height = 80
    this.easeCurveCanvas.style.width = '100%'
    this.easeCurveCanvas.style.height = '50px'
    this.easeCurveCanvas.style.borderRadius = '4px'
    this.easeCurveCanvas.style.background = '#1a1a1e'
    drawEasingCurve(this.easeCurveCanvas, this.scrollEase)

    // Row 6: Auto-scroll speed
    const speedGroup = document.createElement('div')
    speedGroup.classList.add('slider-row')
    const speedLabel = document.createElement('label')
    speedLabel.textContent = 'Speed'
    speedLabel.style.fontSize = '0.7rem'
    speedLabel.style.color = '#999'
    speedLabel.style.flexShrink = '0'
    const speedSlider = document.createElement('input')
    speedSlider.type = 'range'
    speedSlider.min = '1000'
    speedSlider.max = '20000'
    speedSlider.step = '500'
    speedSlider.value = String(this.scrollAutoPlayDuration)
    const speedValueLabel = document.createElement('span')
    speedValueLabel.classList.add('slider-label')
    speedValueLabel.textContent = `${this.scrollAutoPlayDuration / 1000}s`
    speedSlider.oninput = () => {
      this.scrollAutoPlayDuration = parseInt(speedSlider.value)
      speedValueLabel.textContent = `${this.scrollAutoPlayDuration / 1000}s`
    }
    speedGroup.append(speedLabel, speedSlider, speedValueLabel)

    // Row 7: Export story config
    const storyConfigGroup = document.createElement('div')
    storyConfigGroup.classList.add('control-group')

    const btnExportStoryConfig = document.createElement('button')
    btnExportStoryConfig.classList.add('btn-action')
    btnExportStoryConfig.textContent = 'Story Config'
    btnExportStoryConfig.title = 'Export full story config JSON'
    btnExportStoryConfig.onclick = this.exportStoryConfig.bind(this)

    storyConfigGroup.append(btnExportStoryConfig)

    controlWrapper.append(ioGroup, playGroup, sliderRow, easeGroup, this.easeCurveCanvas, speedGroup, storyConfigGroup)

    this.drawer.append(header, btnAdd, this.collapseBtn, this.domList, controlWrapper)

    const parent = canvasParent || document.body
    parent.append(this.drawer)

    this.render()
  }

  private handleEvents(event): void {
    const index = event.target.dataset.index
    if (index) {
      if (event.target.classList.contains(DOMClass.visit)) {
        this.goToPoi(parseInt(index))
      } else if (event.target.classList.contains(DOMClass.remove)) {
        this.removePoi(parseInt(index))
      } else if (event.target.classList.contains(DOMClass.duration)) {
        this.updatePoi(parseInt(index), { duration: parseFloat((<HTMLInputElement>event.target).value) })
      } else if (event.target.classList.contains(DOMClass.ease)) {
        this.updatePoi(parseInt(index), { ease: (<HTMLSelectElement>event.target).value })
      } else if (event.target.classList.contains(DOMClass.fov)) {
        const fov = parseFloat((<HTMLInputElement>event.target).value)
        this.updatePoi(parseInt(index), { fov })
        const card = event.target.closest('.poi')
        if (card) {
          const rangeInput = card.querySelector(`.${DOMClass.fovRange}`) as HTMLInputElement
          if (rangeInput && rangeInput !== event.target) rangeInput.value = String(fov)
          const numInput = card.querySelector(`input.${DOMClass.fov}[type="number"]`) as HTMLInputElement
          if (numInput && numInput !== event.target) numInput.value = String(fov)
        }
      } else if (event.target.classList.contains(DOMClass.fovRange)) {
        const fov = parseFloat((<HTMLInputElement>event.target).value)
        this.updatePoi(parseInt(index), { fov })
        const card = event.target.closest('.poi')
        if (card) {
          const numInput = card.querySelector(`input.${DOMClass.fov}[type="number"]`) as HTMLInputElement
          if (numInput) numInput.value = String(fov)
        }
      } else if (event.target.classList.contains(DOMClass.moveUp)) {
        this.movePoi(parseInt(index), -1)
      } else if (event.target.classList.contains(DOMClass.moveDown)) {
        this.movePoi(parseInt(index), 1)
      }
      this.createClip()
    }
  }

  private collapse(): void {
    if (this.drawer.classList.contains('collapsed')) {
      this.drawer.classList.remove('collapsed')
      this.collapseBtn.innerText = '<'
    } else {
      this.drawer.classList.add('collapsed')
      this.collapseBtn.innerText = '>'
    }
  }

  private render(): void {
    this.domList.innerHTML = ''

    if (this.poiCountEl) {
      this.poiCountEl.textContent = `${this.pois.length} POI${this.pois.length !== 1 ? 's' : ''}`
    }

    if (this.pois.length === 0) {
      const empty = document.createElement('div')
      empty.classList.add('pois-empty')
      empty.textContent = 'Press + to capture a camera position'
      this.domList.appendChild(empty)
      return
    }

    this.pois.forEach((poi, index) => {
      const div = document.createElement('div')
      div.classList.add('poi')

      // Header row: index + action buttons
      const poiHeader = document.createElement('div')
      poiHeader.classList.add('poi-header')

      const poiIndex = document.createElement('span')
      poiIndex.classList.add('poi-index')
      poiIndex.textContent = `#${index + 1}`

      const poiActions = document.createElement('div')
      poiActions.classList.add('poi-actions')

      const btnVisit = document.createElement('button')
      btnVisit.classList.add('poi-btn', DOMClass.visit)
      btnVisit.title = 'Go to this position'
      btnVisit.dataset.index = `${index}`
      btnVisit.innerHTML = '&#8594;'

      const btnMoveUp = document.createElement('button')
      btnMoveUp.classList.add('poi-btn', DOMClass.moveUp)
      btnMoveUp.title = 'Move up'
      btnMoveUp.dataset.index = `${index}`
      btnMoveUp.innerHTML = '&#8593;'

      const btnMoveDown = document.createElement('button')
      btnMoveDown.classList.add('poi-btn', DOMClass.moveDown)
      btnMoveDown.title = 'Move down'
      btnMoveDown.dataset.index = `${index}`
      btnMoveDown.innerHTML = '&#8595;'

      const btnRemove = document.createElement('button')
      btnRemove.classList.add('poi-btn', DOMClass.remove)
      btnRemove.title = 'Remove'
      btnRemove.dataset.index = `${index}`
      btnRemove.innerHTML = '&#215;'

      poiActions.append(btnVisit, btnMoveUp, btnMoveDown, btnRemove)
      poiHeader.append(poiIndex, poiActions)

      // Thumbnail
      const image = new Image()
      image.src = poi.image
      image.classList.add('poi-thumbnail')

      // Params
      const params = document.createElement('div')
      params.classList.add('poi-params')

      // Duration
      const durationRow = document.createElement('div')
      durationRow.classList.add('param-row')
      const labelDuration = document.createElement('label')
      labelDuration.textContent = 'Dur'
      const inputDuration = document.createElement('input')
      inputDuration.classList.add(DOMClass.duration)
      inputDuration.dataset.index = `${index}`
      inputDuration.type = 'number'
      inputDuration.step = '0.1'
      inputDuration.min = '0.1'
      inputDuration.value = String(poi.duration)
      durationRow.append(labelDuration, inputDuration)

      // FOV
      const fovRow = document.createElement('div')
      fovRow.classList.add('param-row')
      const labelFov = document.createElement('label')
      labelFov.textContent = 'FOV'
      const inputFov = document.createElement('input')
      inputFov.classList.add(DOMClass.fov)
      inputFov.dataset.index = `${index}`
      inputFov.type = 'number'
      inputFov.min = '1'
      inputFov.max = '179'
      inputFov.step = '1'
      inputFov.value = String(Math.round(poi.fov))
      const sliderFov = document.createElement('input')
      sliderFov.classList.add(DOMClass.fovRange)
      sliderFov.dataset.index = `${index}`
      sliderFov.type = 'range'
      sliderFov.min = '1'
      sliderFov.max = '179'
      sliderFov.step = '1'
      sliderFov.value = String(Math.round(poi.fov))
      fovRow.append(labelFov, inputFov, sliderFov)

      // Ease
      const easeRow = document.createElement('div')
      easeRow.classList.add('param-row')
      const labelEase = document.createElement('label')
      labelEase.textContent = 'Ease'
      const selectEase = document.createElement('select')
      selectEase.classList.add(DOMClass.ease)
      selectEase.dataset.index = `${index}`
      const options = easeFunctions.map((x) => {
        const op = document.createElement('option')
        op.textContent = x
        op.value = x
        op.selected = x === poi.ease
        return op
      })
      selectEase.append(...options)
      easeRow.append(labelEase, selectEase)

      params.append(durationRow, fovRow, easeRow)
      div.append(poiHeader, image, params)
      this.domList.appendChild(div)
    })
  }
}
