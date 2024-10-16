```yaml
type: function
function:
  name: go_forward
  description: Go forward in browser
  exec: kotlin
```

```kotlin
println("canGoForward: " + browser.canGoForward())
browser.goForward()
```