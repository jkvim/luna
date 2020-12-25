import { AnyFunction, SubType } from "./index.d"
import { Middelware, applyMiddlewares } from "./Middleware"

type State = { [K: string]: any }
export type ExtractPayload<Command, Reducer> = Command extends keyof Reducer
  ? Reducer[Command] extends (state: any, payload: infer Payload) => any
    ? Payload
    : never
  : never
export type ReducerObject = { [K: string]: AnyFunction }
type WithPaylodHanlder = (state: any, payload: any) => any
type WithoutPayloadHandler = (state: any) => any
type WithPayloadReducer<Reducer> = SubType<Reducer, WithPaylodHanlder>
type WithoutPaylodReducer<Reducer> = SubType<Reducer, WithoutPayloadHandler>

export interface Dispatch<RootReducer> {
  <Command extends keyof WithoutPaylodReducer<RootReducer>>(
    command: Command
  ): void
  <Command extends keyof WithPayloadReducer<RootReducer>>(
    command: Command,
    args: ExtractPayload<Command, RootReducer>
  ): void
}

export class Store<RootState, RootReducer extends ReducerObject> {
  reducers: RootReducer
  state: RootState
  listeners: AnyFunction[] = []

  constructor(rootState: RootState, rootReducer: RootReducer) {
    this.reducers = rootReducer
    this.state = rootState
  }

  getState() {
    return this.state
  }

  dispatch: Dispatch<RootReducer> = (command, args?) => {
    const reducer = this.reducers[command]
    if (reducer) {
      this.updateState(reducer(this.state, args))
      for (const listener of this.listeners) {
        listener()
      }
    }
  }
  updateState(nextState: State) {
    if (nextState) {
      for (const key of Object.keys(nextState)) {
        this.state[key] = nextState[key]
      }
    }
  }

  subscribe(listner: AnyFunction) {
    this.listeners.push(listner)
  }

  static createStore<RootState, RootReducer extends ReducerObject>(
    rootState: RootState,
    rootReducer: RootReducer,
    middlewares: Middelware<RootState, RootReducer>[]
  ): EnhancedStore<RootState, RootReducer> {
    const store = new Store(rootState, rootReducer)

    const dispatch = applyMiddlewares(store, middlewares)

    return {
      getState: store.getState.bind(store),
      subscribe: store.subscribe.bind(store),
      dispatch,
    }
  }
}

export type EnhancedStore<RootState, RootReducer> = {
  getState: () => RootState
  subscribe: (listener: AnyFunction) => any
  dispatch: Dispatch<RootReducer>
}
