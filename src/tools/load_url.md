```yaml
type: function
function:
  name: load_url
  parameters:
    type: object
    properties:
      url:
        type: string
        description: URL to load
    required:
      - url
  description: Open the specified URL in the browser
  exec: kotlin
```

```kotlin
browser.loadURL(url)
```
