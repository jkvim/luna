import { Dispatch, ReducerObject, Store } from "./Store"

export type Middelware<RootState, RootReducer> = (
  store: MiddlewareAPI<RootState, RootReducer>
) => (next: Dispatch<RootReducer>) => Dispatch<RootReducer>

export type DispatchParameter<R> = Parameters<Dispatch<R>>

export type MiddlewareAPI<S, R> = {
  getState: () => S
  dispatch: Dispatch<R>
}

export const applyMiddlewares = <RootState, RootReducer extends ReducerObject>(
  store: Store<RootState, RootReducer>,
  middlewares: Middelware<RootState, RootReducer>[]
): Dispatch<RootReducer> => {
  let dispatch: Dispatch<RootReducer> = () => {
    throw new Error(
      "Dispatching while constructing your middleware is not allowed."
    )
  }
  const middlewareAPI: MiddlewareAPI<RootState, RootReducer> = {
    getState: store.getState.bind(store),
    dispatch: (...args) => dispatch(args[0], args[1]),
  }
  const chain = middlewares.map((middleware) => middleware(middlewareAPI))
  dispatch = compose(...chain)(store.dispatch.bind(store))
  return dispatch
}

// tslint:disable-next-line: ban-types
export default function compose(...funcs: Function[]) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <T>(arg: T) => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args: any) => a(b(...args)))
}
