```yaml
type: function
function:
  name: get_form_ids
  description: Returns a list of the form ids on the current page. Useful as a precursor to input_form.
  exec: javascript
```

```javascript
function getInputDescriptions() {
    const elementDescriptionPairs = [];

    document.querySelectorAll('input, textarea').forEach(element => {
        const type = element.type || 'unknown';
        if (type === 'submit' || type === 'button' || type === 'hidden') {
            return;
        }

        const description = getElementDescription(element);
        if (description == null) {
            return;
        }

        elementDescriptionPairs.push({element, description, id: element.id});
    });

    return elementDescriptionPairs;
}

function getElementDescription(el) {
    let label = document.querySelector(`label[for="${el.id}"]`);
    if (label) {
        label = label.textContent.trim();
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        label = ariaLabel;
    }

    return label;
}


const resp = {
    respId: "{{ voqal_resp_id }}",
    data: getInputDescriptions()
}

window.cefQuery({
    request: JSON.stringify(resp),
    onSuccess: function (response) {
        resolve(response);
    }
});
```
