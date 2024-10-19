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
  exec:
    language: kotlin
    preload: true
```

```kotlin
var savedText = ""

contextManager.registerContextListener {
    val text = it.context["text"] as String
    val newText = text.substring(savedText.length)
    savedText = text

    log.addSpeech(newText, it.final)
    if (it.final) {
        savedText = ""
    }
}
```