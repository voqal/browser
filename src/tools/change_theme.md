```yaml
type: function
function:
  name: change_theme
  description: Changes the theme of the browser.
  parameters:
    type: object
    properties:
      theme:
        type: string
        description: The theme to switch to.
        enum: [ 'light', 'dark' ]
    required:
      - theme
  exec: kotlin
```

```kotlin
browser.changeTheme(theme)
```