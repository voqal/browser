```yaml
type: function
function:
  name: attach_file
  description: Attaches a file to a file input element on the page.
  parameters:
    type: object
    properties:
      file_location:
        type: string
        description: The location of the file to attach
      form_id:
        type: string
        description: The form id to attach the file to
    required:
      - file_location
      - form_id
  exec:
    language: javascript
    execute_on_all_frames: true
    trigger_response: true
```

```javascript
console.log("Attaching file to form: {{ form_id }} - Frame: {{ voqal_frame_id }}");
let element = document.getElementById("{{ form_id }}");
console.log({element, form_id: "{{ form_id }}"});

if (element == null) {
    console.error("Element not found - Frame: {{ voqal_frame_id }}");
    return;
}

let value = "{{ file_location }}";
console.log("File: " + value);

const selfHost = window.location.origin;
const storageLocation = selfHost + "/{{ voqal_storage_uuid }}/" + value;
console.log("Storage Location: " + storageLocation);

loadFileToInput(storageLocation, element);

async function loadFileToInput(url, fileInput) {
    try {
        const response = await fetch(url);
        const fileContent = await response.blob();
        const urlSegments = url.split('/');
        const fileName = urlSegments[urlSegments.length - 1];
        const myFile = new File([fileContent], fileName);

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(myFile);

        fileInput.files = dataTransfer.files;
        console.log('File loaded and set in input:', fileInput.files);

        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
        console.error('Error loading file:', error);
    }
}
```