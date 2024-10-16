```yaml
type: function
function:
  name: input_form
  description: Types the given text in the form of the given form id.
  parameters:
    type: object
    properties:
      form_id:
        type: string
        description: The form id to type text into
      text:
        type: string
        description: The text to type
    required:
      - form_id
      - text
  exec: javascript
```

```javascript
const element = getTypableElementById("{{ form_id }}");
if (element) {
    element.value = "{{ text }}";
} else {
    alert('Element with id ' + "{{ form_id }}" + ' not found.');
}

function getTypableElementById(id) {
    // Get all elements with the specified ID
    const elements = document.querySelectorAll(`#${id}`);

    // Iterate through the NodeList and return the first typable element
    for (let element of elements) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            return element; // Return the first typable element found
        }
    }

    return null; // Return null if no typable element is found
}
```