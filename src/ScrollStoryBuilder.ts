import { Camera, Scene, AnimationClip } from 'three'
import { CameraRig } from './CameraRig'
import { ScrollStoryControls } from './controlschemes/ScrollStoryControls'
import type { StoryConfig } from './types/StoryConfig'

export interface ScrollStoryResult {
  controls: ScrollStoryControls
  rig: CameraRig
}

export async function createScrollStory(
  config: StoryConfig,
  camera: Camera,
  scene: Scene,
  canvasElement: HTMLElement,
  scrollElement: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraData?: { animationClip?: any },
): Promise<ScrollStoryResult> {
  const rig = new CameraRig(camera, scene)

  const data = cameraData ?? (config.camera?.src ? await fetchCameraData(config.camera.src) : null)

  if (data?.animationClip) {
    rig.setAnimationClip(AnimationClip.parse(data.animationClip))
    rig.setAnimationTime(0)
  }

  if (config.scroll?.height) {
    scrollElement.style.height = config.scroll.height
  }

  const controls = new ScrollStoryControls(rig, {
    scrollElement,
    sections: config.sections,
    dampingFactor: config.scroll?.dampingFactor ?? 0.1,
    startOffset: config.scroll?.startOffset ?? '-50vh',
    endOffset: config.scroll?.endOffset ?? '-50vh',
    canvasFadeIn: config.transitions?.canvasFadeIn ?? { start: '0%', end: '15%' },
    canvasFadeOut: config.transitions?.canvasFadeOut ?? { start: '85%', end: '100%' },
    canvasElement,
  })

  return { controls, rig }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCameraData(src: string): Promise<{ animationClip?: any }> {
  const response = await fetch(src)
  return response.json()
}
