```yaml
type: function
function:
  name: go_back
  description: Go back in browser
  exec: kotlin
```

```kotlin
log.debug("canGoBack: " + browser.canGoBack())
browser.goBack()
```