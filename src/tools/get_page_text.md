```yaml
type: function
function:
  name: get_page_text
  description: Returns the visible text on the current page.
  exec:
    language: javascript
    manual_confirm: true
```

```javascript
function extractVisibleText() {
    function isVisible(element) {
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }

    function getTextFromElement(element) {
        if (!isVisible(element)) return '';
        let text = '';
        for (let node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent.trim() + ' ';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                text += getTextFromElement(node);
            }
        }
        return text;
    }

    return getTextFromElement(document.body).replace(/\s+/g, ' ').trim();
}

const pageText = extractVisibleText();
const resp = {
    respId: "{{ voqal_resp_id }}",
    data: pageText
}

window.cefQuery({
    request: JSON.stringify(resp),
    onSuccess: function (response) {
        resolve(response);
    }
});
```