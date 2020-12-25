import {
  TextElement,
  Fiber,
  ElementType,
  EffectTag,
  DOM,
  Element,
  Stateful,
} from "./types/Luna";
import { toKebabCase } from "./Util";

function createElement(type: string, props: any, ...children: any): Element {
  return {
    type,
    props: {
      ...props,
      children: children
        .filter((clild) => clild !== false)
        .flat()
        .map((child) =>
          typeof child === "object" ? child : createTextElement(child)
        ),
    },
  };
}

function createTextElement(text: string): TextElement {
  return {
    type: ElementType.TEXT_ELEMENT,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber: Fiber) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  const domParent = domParentFiber.dom;
  if (fiber.effectTag === EffectTag.CREATE && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === EffectTag.UPDATE && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === EffectTag.DELETION) {
    commitDeletion(domParent, fiber);
  } else if (fiber.effectTag === EffectTag.REPLACE && fiber.dom !== null) {
    domParent.replaceChild(fiber.dom, fiber.replaceNode);
  }
  if (fiber.effectTag !== EffectTag.DELETION) {
    commitWork(fiber.child);
    commitWork(fiber.sibling);
  }

  if (
    fiber.type instanceof Function &&
    (fiber.effectTag === EffectTag.CREATE ||
      fiber.effectTag === EffectTag.REPLACE) &&
    fiber.controller &&
    fiber.controller.onMount
  ) {
    fiber.controller.onMount();
  }

  if (
    fiber.type instanceof Function &&
    fiber.effectTag === EffectTag.UPDATE &&
    fiber.controller &&
    fiber.controller.afterUpdate
  ) {
    fiber.controller.afterUpdate();
  }

  if (
    fiber.type instanceof Function &&
    fiber.effectTag === EffectTag.DELETION &&
    fiber.controller &&
    fiber.controller.onDestory
  ) {
    fiber.controller.onDestory();
  }

  if (
    fiber.effectTag === EffectTag.CREATE &&
    fiber.dom !== null &&
    fiber.props.ref instanceof Function
  ) {
    fiber.props.ref(fiber.dom);
  }
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key: string) => prev[key] !== next[key];
const isGone = (prev, next) => (key: string) => !(key in next);
const isStyle = (key: string) => key === "style";
const isNonNull = (prop: object) => (key: string) =>
  prop[key] !== undefined && prop[key] !== null;

function commitDeletion(domParent: DOM, fiber: Fiber) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(domParent, fiber.child);
  }
}

function updateDom(dom: DOM, prevProps, nextProps) {
  // remove old or changed event listener
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => {
      return !(key in nextProps) || isNew(prevProps, nextProps)(key);
    })
    .forEach((name) => {
      const eventType = name.toLocaleLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = "";
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // Add new event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name: string) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });

  // Add style
  Object.keys(nextProps)
    .filter(isStyle)
    .filter(isNonNull(nextProps))
    .forEach((name: string) => {
      if (dom instanceof HTMLElement) {
        for (const prop of Object.keys(nextProps[name])) {
          dom.style[prop] = nextProps[name][prop];
        }
      }
    });
}

function createDom(fiber: Fiber): DOM {
  if (typeof fiber.type === "string") {
    const dom =
      fiber.type === ElementType.TEXT_ELEMENT
        ? document.createTextNode("")
        : document.createElement(fiber.type);

    updateDom(dom, {}, fiber.props);

    return dom;
  } else if (fiber.type instanceof Function) {
    const container = toKebabCase(fiber.type.name);
    console.log("container", fiber.type);

    return document.createElement(container);
  }
}

function render(element: Element, container: Text | HTMLElement) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
    key: "root",
  };

  nextUnitOfWork = wipRoot;
  deletions = [];
}

let nextUnitOfWork: Fiber = null;
let currentRoot: Fiber = null;
let wipRoot: Fiber = null;
let deletions: Fiber[] = null;
const fiberControllers: Stateful = {};

function workLoop(deadline) {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  // not exist in safari, replace with a scheduler
  window.requestIdleCallback(workLoop);
}

window.requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // return next unit of work
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function updateFunctionComponent(fiber: Fiber) {
  const children = [
    fiber.type instanceof Function &&
      fiber.type({
        ...fiber.props,
        controller: fiber?.controller,
        context: fiber?.context,
      }),
  ];
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(fiber: Fiber, elements: Element[]) {
  let index = 0;
  let prevSibling = null;
  let oldFiber = fiber.alternate && fiber.alternate.child;

  while (index < elements.length || !!oldFiber) {
    const element = elements[index];
    let newFiber: Fiber = null;

    const sameType = oldFiber && element && element.type === oldFiber.type;
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        parent: fiber,
        dom: oldFiber.dom,
        alternate: oldFiber,
        effectTag: EffectTag.UPDATE,
        controller: oldFiber.controller,
        context: oldFiber.context,
      };
    }
    if (element && !oldFiber && !sameType) {
      const context = element.props.context || fiber.context;
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: fiber,
        alternate: null,
        effectTag: EffectTag.CREATE,
        controller: getStateController(element, context),
        context,
      };
    }
    if (element && oldFiber && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: fiber,
        alternate: null,
        effectTag: EffectTag.REPLACE,
        controller: getStateController(element, oldFiber.context),
        replaceNode: oldFiber.dom,
        context: oldFiber.context,
      };
    }

    if (!element && oldFiber && !sameType) {
      oldFiber.effectTag = EffectTag.DELETION;
      deletions.push(oldFiber);
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      fiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}

function getStateController(element: Element, context: any) {
  if (element.type instanceof Function) {
    const StateClass = fiberControllers[element.type.name];
    if (StateClass) {
      return observe(new StateClass(context));
    }
  }
  return null;
}

function dispatch() {
  if (currentRoot) {
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
      type: currentRoot.type,
      controller: currentRoot.controller,
    };

    nextUnitOfWork = wipRoot;
    deletions = [];
  }
}

function connect(component, controller) {
  fiberControllers[component.name] = controller;
  return component;
}

const observable = (constructor: FunctionConstructor) => () => {
  return observe(new constructor());
};

function observe(obj: object) {
  return new Proxy(obj, {
    set(target, key, value) {
      target[key] = value;
      dispatch();
      return true;
    },
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (value instanceof Function) {
        return function (...args) {
          const result = value.apply(this, args);
          return result;
        };
      }
      return value;
    },
  });
}

function createContext(contextMap: { [k: string]: object }) {
  const context = {};
  for (const key of Object.keys(contextMap)) {
    context[key] = observe(contextMap[key]);
  }
  return context;
}

const Luna = {
  createElement,
  createTextElement,
  workLoop,
  dispatch,
  render,
  connect,
  observable,
  createContext,
};

window.Luna = Luna;

export {
  createElement,
  createTextElement,
  workLoop,
  dispatch,
  render,
  connect,
  observable,
  createContext,
};
