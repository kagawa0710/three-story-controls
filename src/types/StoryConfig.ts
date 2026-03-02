export interface StoryConfigScroll {
  height?: string
  dampingFactor?: number
  startOffset?: string
  endOffset?: string
}

export interface StoryConfigTransitions {
  canvasFadeIn?: { start: string; end: string }
  canvasFadeOut?: { start: string; end: string }
}

export interface StoryConfigSection {
  id: string
  content: string
  position: string
  placement: 'left' | 'right' | 'centre'
  width?: string
  className?: string
}

export interface StoryConfig {
  version: number
  scroll?: StoryConfigScroll
  camera?: { src: string }
  transitions?: StoryConfigTransitions
  sections: StoryConfigSection[]
}
