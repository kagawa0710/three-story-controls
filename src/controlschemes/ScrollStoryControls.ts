import { BaseControls } from './BaseControls'
import { ScrollControls } from './ScrollControls'
import type { ScrollAction } from './ScrollControls'
import { CameraRig } from '../CameraRig'

export interface ScrollStorySection {
  id: string
  content: string
  position: string
  placement: 'left' | 'right' | 'centre'
  width?: string
  className?: string
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
}

const defaultCanvasFadeIn = { start: '0%', end: '15%' }
const defaultCanvasFadeOut = { start: '85%', end: '100%' }

export class ScrollStoryControls implements BaseControls {
  readonly cameraRig: CameraRig
  private scrollControls: ScrollControls
  private sectionElements: HTMLElement[] = []

  constructor(cameraRig: CameraRig, props: ScrollStoryControlsProps) {
    this.cameraRig = cameraRig

    this.sectionElements = this.createSectionElements(props.scrollElement, props.sections)

    const scrollActions = this.buildScrollActions(props)

    this.scrollControls = new ScrollControls(cameraRig, {
      scrollElement: props.scrollElement,
      dampingFactor: props.dampingFactor ?? 0.1,
      startOffset: props.startOffset ?? '-50vh',
      endOffset: props.endOffset ?? '-50vh',
      scrollActions,
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
      el.style.padding = '1.5rem'
      el.style.backgroundColor = 'rgba(0,0,0,0.8)'
      el.style.borderRadius = '4px'
      el.style.color = 'white'
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.1s ease-out'

      switch (section.placement) {
        case 'left':
          el.style.left = '10vw'
          break
        case 'right':
          el.style.right = '10vw'
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

    const sections = props.sections
    const totalSections = sections.length
    if (totalSections === 0) return actions

    for (let i = 0; i < totalSections; i++) {
      const el = this.sectionElements[i]
      const posPercent = parseFloat(sections[i].position)
      const fadeRange = 5
      const sectionFadeIn = `${Math.max(0, posPercent - fadeRange)}%`
      const sectionPeak = `${posPercent}%`
      const nextPosPercent = i < totalSections - 1 ? parseFloat(sections[i + 1].position) : 100
      const sectionFadeOut = `${posPercent + (nextPosPercent - posPercent) * 0.4}%`
      const sectionGone = `${posPercent + (nextPosPercent - posPercent) * 0.6}%`

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
