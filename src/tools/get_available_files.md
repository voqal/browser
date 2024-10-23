```yaml
type: function
function:
  name: get_available_files
  description: Returns a list of the files available in the local storage. This is how you get files from the "storage".
  exec:
    language: kotlin
    manual_confirm: true
```

```kotlin
import java.io.File

val storageLocation = File(installDir, "storage")
val files = storageLocation.listFiles()
contextManager.confirmFinished(
    mapOf(
        "respId" to voqal_resp_id,
        "data" to mapOf(
            "files" to files.map { it.name }
        ) 
    )
)
```
