import { EventDispatcher } from 'three'

export interface DiscreteEvent {
  type: 'trigger'
}

export interface ContinuousEvent {
  type: 'update'
}

export interface IntertiaCompleteEvent {
  type: 'inertiacomplete'
}

export type BaseAdaptorEventMap = {
  trigger: DiscreteEvent
  update: ContinuousEvent
  inertiacomplete: IntertiaCompleteEvent
}

export abstract class BaseAdaptor extends EventDispatcher<BaseAdaptorEventMap> {
  constructor() {
    super()
  }
  abstract connect(): void
  abstract disconnect(): void
  abstract update(time?: number): void
  abstract isEnabled(): boolean
}
