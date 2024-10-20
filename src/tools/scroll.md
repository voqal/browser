```yaml
type: function
function:
  name: scroll
  parameters:
    type: object
    properties:
      scrollDirection:
        type: string
        description: Direction to scroll
        enum:
          - UP
          - DOWN
          - TOP
          - BOTTOM
          - START
          - END
          - MIDDLE
      scrollType:
        type: string
        description: Type of scroll. 'scroll' moves half page, 'page' moves full page.
          Default is 'scroll'
        enum:
          - scroll
          - page
    required:
      - scrollDirection
  description: Scroll the browser
  exec: javascript
```

```javascript
let scrollDirection = '{{ scrollDirection }}';
let scrollType = '{{ scrollType }}';
let scrollAmount = 0;
let scrollBy = 0;

if (scrollType === 'page') {
    scrollBy = window.innerHeight;
} else {
    scrollBy = window.innerHeight / 2;
}

switch (scrollDirection) {
    case 'UP':
        scrollAmount = -scrollBy;
        break;
    case 'DOWN':
        scrollAmount = scrollBy;
        break;
    case 'TOP':
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        scrollAmount = 0;
        break;
    case 'BOTTOM':
        scrollAmount = document.body.scrollHeight - window.scrollY;
        break;
    case 'START':
        scrollAmount = -window.scrollX;
        break;
    case 'END':
        scrollAmount = document.body.scrollWidth - window.scrollX;
        break;
    case 'MIDDLE':
        scrollAmount = (document.body.scrollHeight - window.innerHeight) / 2 - window.scrollY;
        break;
    default:
        scrollAmount = 0;
}

if (scrollAmount !== 0) {
    window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
    });
}
```
