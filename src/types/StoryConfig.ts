export interface StoryConfigScroll {
  height?: string
  dampingFactor?: number
  startOffset?: string
  endOffset?: string
  /** Easing function name (from built-in Easings) or 'linear'. Applied to camera animation progress. */
  ease?: string
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
  /** Custom fade-in range as percentage before position. Defaults to 5. */
  fadeInRange?: number
  /** Custom fade-out start as proportion of gap to next section (0-1). Defaults to 0.4. */
  fadeOutStart?: number
  /** Custom fade-out end as proportion of gap to next section (0-1). Defaults to 0.6. */
  fadeOutEnd?: number
  /** Custom background colour */
  backgroundColor?: string
  /** Custom text colour */
  color?: string
  /** Custom padding */
  padding?: string
  /** Custom border radius */
  borderRadius?: string
  /** Horizontal offset (overrides default 10vw) */
  offset?: string
}

export interface StoryConfig {
  version: number
  scroll?: StoryConfigScroll
  camera?: { src: string }
  transitions?: StoryConfigTransitions
  sections: StoryConfigSection[]
}
