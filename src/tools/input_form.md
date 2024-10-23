```yaml
type: function
function:
  name: input_form
  description: Types the given text in the forms based on the provided form IDs and texts.
  parameters:
    type: object
    properties:
      inputs:
        type: array
        description: A list of form inputs, each containing a form ID and the corresponding text to type.
        items:
          type: object
          properties:
            form_id:
              type: string
              description: The form ID to type text into.
            text:
              type: string
              description: The text to type into the form.
          required:
            - form_id
            - text
    required:
      - inputs
  exec:
    language: javascript
    manual_confirm: true
    trigger_response: true
    execute_on_all_frames: true
```

```javascript
const inputsArray = {{ context }}.inputs;
for (const input of inputsArray) {
    const element = getTypableElementById(input.form_id);
    if (element) {
        scrollToElement(element);

        element.value = "";
        typeText(element, input.text);
    } else {
        console.log('Element with id ' + input.form_id + ' not found.');
    }
}

const resp = {
    respId: "{{ voqal_resp_id }}",
    data: [{
        status: "success",
    }]
}
window.cefQuery({
    request: JSON.stringify(resp),
    onSuccess: function (response) {
        resolve(response);
    }
});

function getTypableElementById(id) {
    const elements = document.querySelectorAll(`#${id}`);
    for (let element of elements) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            return element;
        }
    }
    return null;
}

function scrollToElement(element) {
    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function typeText(element, text, delay = 20) {
    let currentIndex = 0;
    const interval = setInterval(() => {
        element.value += text[currentIndex];
        currentIndex++;
        if (currentIndex === text.length) {
            clearInterval(interval);
            element.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }, delay);
}
```