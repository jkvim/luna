
export enum EffectTag {
  UPDATE = "UPDATE",
  CREATE = "CREATE",
  DELETION = "DELETION",
  REPLACE = "REPLACE"
}

export enum ElementType {
  TEXT_ELEMENT = "TEXT_ELEMENT"
}

export type DOM = HTMLElement | Text
export type AnyFunction = (...args: any[]) => any;
export interface Element {
  type: string | AnyFunction;
  props: {
    children: any[];
    [K : string]: any;
  }
}

export interface TextElement {
  type: string
  props: {
    children: any[];
    nodeValue: string;
  }
}

export interface Fiber {
  parent?: any;
  type?: string | AnyFunction;
  dom: Text | HTMLElement;
  props: {
    [K : string]: any;
    children: any[];
  };
  alternate: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  effectTag?: EffectTag;
  key?: string;
  controller?: any;
  replaceNode?: DOM;
  context?: any;
}

export interface Stateful {
  onMount?: () => void
  onDestory?: () => void
  didUpdate?: () => void
}

export type FilterFlag<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
}

export type AllowedNames<Base, Condition> = FilterFlag<Base, Condition>[keyof Base]

export type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>

export type ComponentProps<Controller> = {
  controller: Controller
  [k: string]: any
}
