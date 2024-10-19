```yaml
type: function
function:
  name: tts
  description: Speaks the given text. Use this to respond to the user with spoken text.
  parameters:
    type: object
    properties:
      text:
        type: string
        description: The text to speak
    required:
      - text
  exec: kotlin
```

```kotlin
log.info("{{ text }}")
```