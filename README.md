# Luna

Base on [didact](https://github.com/pomber/didact), This is a react like framework, no hooks,
but MVC and build-in redux like state management

** NOT FOR PRODUCTION **

## Example
### App
```tsx
const context = createContext({
  store,
})

function App() {
  return (
    <div className="App" context={context}>
      <Layout />
    </div>
  )
}

export default App
```

### Controller
```tsx
export class Controller {
  store: EnhancedStore<RootState, RootReducer>

  constructor(ctx: GlobalContext) {
    this.store = ctx.store
  }

  get state() {
    return this.store.getState()
  }
}
```

### Component
connect with controller is optional, you can wirte pure function component

```tsx
class ActivityBarController extends Controller {
  activeClass = (view: ActiveView) => {
    return cn("activity-button", {
      active: view === this.activeView
    })
  }

  changeActiveViewTo = (view: ActiveView) => () => {
    this.store.dispatch(ActivityBarCommand.CHANGE_ACTIVE_VIEW, view)
  }

  onClick = () => {
    this.store.dispatch(ActivityBarCommand.FOCUS_ACTIVITY_BAR)
  }

  get activeView() {
    return this.store.getState().activeView
  }
}

function ActivityBarComponent({
  controller,
}: ComponentProps<ActivityBarController>)  {
  const { activeClass, changeActiveViewTo, onClick } = controller
  return (
    <div className="thunder-activity-bar" onClick={onClick}>
      <div
        onClick={changeActiveViewTo(ActiveView.DOCS)}
        className={activeClass(ActiveView.DOCS)}
      >
        <img src={docsLogo} className="docs-logo" alt="docs-logo" />
      </div>
      <div
        onClick={changeActiveViewTo(ActiveView.SEARCH)}
        className={activeClass(ActiveView.SEARCH)}
      >
        <img src={searchLogo} className="search-logo" alt="search-logo" />
      </div>
      <div
        onClick={changeActiveViewTo(ActiveView.SETTING)}
        className={activeClass(ActiveView.SETTING)}
      >
        <img src={settingLogo} className="setting-logo" alt="setting-logo" />
      </div>
      <div
        onClick={changeActiveViewTo(ActiveView.STAR)}
        className={activeClass(ActiveView.STAR)}
      >
        <img src={starLogo} className="star-logo" alt="star-logo" />
      </div>
    </div>
  )
}

export default connect(ActivityBarComponent, ActivityBarController)
```