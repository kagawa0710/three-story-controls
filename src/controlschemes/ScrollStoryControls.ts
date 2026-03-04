import { BaseControls } from './BaseControls'
import { ScrollControls } from './ScrollControls'
import type { ScrollAction, EasingFunction, EasingSegment } from './ScrollControls'
import { CameraRig } from '../CameraRig'
import { EventDispatcher } from 'three'

export interface ScrollStorySection {
  id: string
  content: string
  position: string
  placement: 'left' | 'right' | 'centre'
  width?: string
  className?: string
  /** Custom fade-in range as a percentage (e.g. 5 means 5% before position). Defaults to 5. */
  fadeInRange?: number
  /** Custom fade-out proportion of the gap to the next section (0-1). Defaults to 0.4 for start, 0.6 for end. */
  fadeOutStart?: number
  fadeOutEnd?: number
  /** Custom background colour for this section */
  backgroundColor?: string
  /** Custom text colour for this section */
  color?: string
  /** Custom padding */
  padding?: string
  /** Custom border radius */
  borderRadius?: string
  /** Horizontal offset (overrides default 10vw) */
  offset?: string
}

export interface SectionActiveEvent {
  type: 'sectionactive'
  sectionId: string
  index: number
}

export interface SectionInactiveEvent {
  type: 'sectioninactive'
  sectionId: string
  index: number
}

export type ScrollStoryEventMap = {
  sectionactive: SectionActiveEvent
  sectioninactive: SectionInactiveEvent
}

export interface ScrollStoryControlsProps {
  scrollElement: HTMLElement
  sections: ScrollStorySection[]
  dampingFactor?: number
  startOffset?: string
  endOffset?: string
  canvasFadeIn?: { start: string; end: string }
  canvasFadeOut?: { start: string; end: string }
  canvasElement?: HTMLElement
  /** Easing function for camera animation progress */
  ease?: EasingFunction
  /** Piecewise easing segments for camera animation */
  easeSegments?: EasingSegment[]
  /** Use CSS scroll-driven animations for caption fade when supported. Defaults to true. */
  useCSSAnimations?: boolean
}

const defaultCanvasFadeIn = { start: '0%', end: '15%' }
const defaultCanvasFadeOut = { start: '85%', end: '100%' }

const supportsScrollDrivenAnimations = (): boolean => {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'view()')
}

let styleInjected = false
const injectScrollAnimationStyles = (): void => {
  if (styleInjected) return
  styleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @supports (animation-timeline: view()) {
      .scroll-story-caption[data-scroll-driven="true"] {
        animation: scroll-story-caption-reveal 1ms linear both;
        animation-timeline: view(block);
        animation-range: entry 0% exit 100%;
      }

      @keyframes scroll-story-caption-reveal {
        0% { opacity: 0; transform: translateY(20px); }
        15% { opacity: 1; transform: translateY(0); }
        75% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
    }
  `
  document.head.appendChild(style)
}

export class ScrollStoryControls extends EventDispatcher<ScrollStoryEventMap> implements BaseControls {
  readonly cameraRig: CameraRig
  private scrollControls: ScrollControls
  private sectionElements: HTMLElement[] = []
  private sectionObserver: IntersectionObserver | null = null
  private activeSections: Set<string> = new Set()
  private useCSSAnimations: boolean

  constructor(cameraRig: CameraRig, props: ScrollStoryControlsProps) {
    super()
    this.cameraRig = cameraRig
    this.useCSSAnimations = (props.useCSSAnimations ?? true) && supportsScrollDrivenAnimations()

    if (this.useCSSAnimations) {
      injectScrollAnimationStyles()
    }

    this.sectionElements = this.createSectionElements(props.scrollElement, props.sections)
    this.setupIntersectionObserver(props.sections)

    const scrollActions = this.buildScrollActions(props)

    this.scrollControls = new ScrollControls(cameraRig, {
      scrollElement: props.scrollElement,
      dampingFactor: props.dampingFactor ?? 0.1,
      startOffset: props.startOffset ?? '-50vh',
      endOffset: props.endOffset ?? '-50vh',
      scrollActions,
      ease: props.ease,
      easeSegments: props.easeSegments,
    })
  }

  enable(): void {
    this.scrollControls.enable()
  }

  disable(): void {
    this.scrollControls.disable()
  }

  update(time?: number): void {
    this.scrollControls.update()
  }

  getSectionElement(id: string): HTMLElement | undefined {
    return this.sectionElements.find((el) => el.id === id)
  }

  getActiveSections(): string[] {
    return Array.from(this.activeSections)
  }

  dispose(): void {
    if (this.sectionObserver) {
      this.sectionObserver.disconnect()
      this.sectionObserver = null
    }
  }

  private setupIntersectionObserver(sections: ScrollStorySection[]): void {
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const index = this.sectionElements.indexOf(el)
          if (index === -1) continue

          const sectionId = sections[index].id

          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            if (!this.activeSections.has(sectionId)) {
              this.activeSections.add(sectionId)
              this.dispatchEvent({
                type: 'sectionactive',
                sectionId,
                index,
              } as SectionActiveEvent)
            }
          } else {
            if (this.activeSections.has(sectionId)) {
              this.activeSections.delete(sectionId)
              this.dispatchEvent({
                type: 'sectioninactive',
                sectionId,
                index,
              } as SectionInactiveEvent)
            }
          }
        }
      },
      {
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0],
        rootMargin: '-10% 0px -10% 0px',
      },
    )

    this.sectionElements.forEach((el) => {
      this.sectionObserver!.observe(el)
    })
  }

  private createSectionElements(scrollElement: HTMLElement, sections: ScrollStorySection[]): HTMLElement[] {
    return sections.map((section) => {
      const el = document.createElement('div')
      el.id = section.id
      el.classList.add('scroll-story-caption')
      if (section.className) el.classList.add(section.className)
      el.innerHTML = section.content
      el.style.position = 'absolute'
      el.style.top = section.position
      el.style.width = section.width ?? '320px'
      el.style.padding = section.padding ?? '1.5rem'
      el.style.backgroundColor = section.backgroundColor ?? 'rgba(0,0,0,0.8)'
      el.style.borderRadius = section.borderRadius ?? '4px'
      el.style.color = section.color ?? 'white'

      if (this.useCSSAnimations) {
        el.dataset.scrollDriven = 'true'
      } else {
        el.style.opacity = '0'
      }

      const offset = section.offset ?? '10vw'
      switch (section.placement) {
        case 'left':
          el.style.left = offset
          break
        case 'right':
          el.style.right = offset
          break
        case 'centre':
          el.style.left = '50%'
          el.style.transform = 'translateX(-50%)'
          break
      }

      scrollElement.appendChild(el)
      return el
    })
  }

  private buildScrollActions(props: ScrollStoryControlsProps): ScrollAction[] {
    const actions: ScrollAction[] = []
    const fadeIn = props.canvasFadeIn ?? defaultCanvasFadeIn
    const fadeOut = props.canvasFadeOut ?? defaultCanvasFadeOut
    const canvasEl = props.canvasElement

    if (canvasEl) {
      actions.push({
        start: fadeIn.start,
        end: fadeIn.end,
        callback: (p: number) => {
          canvasEl.style.opacity = String(p)
        },
        startPx: 0,
        endPx: 0,
        bufferedStartPx: 0,
        bufferedEndPx: 0,
      })
      actions.push({
        start: fadeOut.start,
        end: fadeOut.end,
        callback: (p: number) => {
          canvasEl.style.opacity = String(1 - p)
        },
        startPx: 0,
        endPx: 0,
        bufferedStartPx: 0,
        bufferedEndPx: 0,
      })
    }

    if (this.useCSSAnimations) {
      return actions
    }

    const sections = props.sections
    const totalSections = sections.length
    if (totalSections === 0) return actions

    for (let i = 0; i < totalSections; i++) {
      const el = this.sectionElements[i]
      const posPercent = parseFloat(sections[i].position)
      const fadeRange = sections[i].fadeInRange ?? 5
      const sectionFadeIn = `${Math.max(0, posPercent - fadeRange)}%`
      const sectionPeak = `${posPercent}%`
      const nextPosPercent = i < totalSections - 1 ? parseFloat(sections[i + 1].position) : 100
      const fadeOutStartProp = sections[i].fadeOutStart ?? 0.4
      const fadeOutEndProp = sections[i].fadeOutEnd ?? 0.6
      const sectionFadeOut = `${posPercent + (nextPosPercent - posPercent) * fadeOutStartProp}%`
      const sectionGone = `${posPercent + (nextPosPercent - posPercent) * fadeOutEndProp}%`

      actions.push({
        start: sectionFadeIn,
        end: sectionPeak,
        callback: (p: number) => {
          el.style.opacity = String(p)
        },
        startPx: 0,
        endPx: 0,
        bufferedStartPx: 0,
        bufferedEndPx: 0,
      })

      actions.push({
        start: sectionFadeOut,
        end: sectionGone,
        callback: (p: number) => {
          el.style.opacity = String(1 - p)
        },
        startPx: 0,
        endPx: 0,
        bufferedStartPx: 0,
        bufferedEndPx: 0,
      })
    }

    return actions
  }
}
