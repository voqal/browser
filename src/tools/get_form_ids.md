```yaml
type: function
function:
  name: get_form_ids
  description: Returns a list of the form ids on the current page. Useful as a precursor to input_form/click_button.
  exec:
    language: javascript
    manual_confirm: true
    execute_on_all_frames: true
```

```javascript
function getInputDescriptions() {
    const elementDescriptions = [];
    document.querySelectorAll('input, textarea, button').forEach(element => {
        const description = getElementDescription(element);
        if (description == null) {
            return;
        }
        elementDescriptions.push({description});
    });

    return elementDescriptions;
}

function getElementDescription(el) {
    const type = el.type || 'unknown';
    let description = {
        type: type,
        label: '',
        elementId: getId(el),
        elementName: el.name || '',
        type: type,
        label: '',
        elementName: el.name || '',
        innerText: el.innerText || '',
        hidden: el.hidden,
        visible: el.offsetParent !== null,
        position: getPosition(el)
    };

    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) {
        description.label = label.textContent.trim();
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        description.label = ariaLabel;
    }

    return description;
}

function getId(node) {
    return (node.id) ? node.id : (node.id = 'voqal_' + crypto.randomUUID());
}

function getPosition(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return {x, y};
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