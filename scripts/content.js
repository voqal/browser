const createIframe = () => {
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sandbox.html');
    iframe.id = 'extension-sandbox-iframe';
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    return iframe;
};
let iframe = createIframe();

const body = document.getElementsByTagName('body')[0];
body.appendChild(iframe);

const handlers = new Map();
let emailCache = {}; // {html, lastUpdated}

window.addEventListener("message", async (event) => {
    if (event.source === iframe.contentWindow && event.data.voqal_resp_id) {
        const pair = handlers.get(event.data.voqal_resp_id);
        const handler = pair ? pair[0] : null;
        const time = pair ? pair[1] : null;
        if (handler) {
            const timeTaken = Date.now() - time;
            handler({
                ...event.data,
                debug: {
                    ...event.data.debug,
                    messageDuration: timeTaken
                }
            });
        } else {
            console.warn(`No handler found for message ID: ${event.data.voqal_resp_id}`);
        }
    }
});

function extractDiff(oldHtml, newHtml) {
    const diff = [];
    let i = 0;
    let j = 0;

    while (i < oldHtml.length || j < newHtml.length) {
        if (oldHtml[i] === newHtml[j]) {
            i++;
            j++;
        } else {
            // Find the start of the difference
            const start = i;
            const newStart = j;

            // Find the end of the difference
            while (i < oldHtml.length && oldHtml[i] !== newHtml[j]) i++;
            while (j < newHtml.length && newHtml[j] !== oldHtml[i]) j++;

            // Record the difference
            diff.push({
                start,
                newStart,
                oldContent: oldHtml.slice(start, i),
                newContent: newHtml.slice(newStart, j),
            });
        }
    }

    return diff;
}

function applyDiff(oldHtml, diff) {
    let result = '';
    let lastIndex = 0;

    diff.forEach(({ start, oldContent, newContent }) => {
        // Append unchanged content
        result += oldHtml.slice(lastIndex, start);
        // Replace with new content
        result += newContent;
        // Update the last processed index
        lastIndex = start + oldContent.length;
    });

    // Append remaining unchanged content
    result += oldHtml.slice(lastIndex);

    return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "evaluate") {
        const handler = (event) => {
            const data = event.result;

            function getElementByXPath(xpath) {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }

            function triggerComplexClick(element) {
                if (!element) {
                    console.error("Element not found.");
                    return;
                }
                if (element.tabIndex >= 0) {
                    element.focus();
                    console.log("Element focused.");
                }
                const mouseDownEvent = new MouseEvent("mousedown", {bubbles: true, cancelable: true, view: window});
                element.dispatchEvent(mouseDownEvent);
                console.log("Mousedown event dispatched.");
                const mouseUpEvent = new MouseEvent("mouseup", {bubbles: true, cancelable: true, view: window});
                element.dispatchEvent(mouseUpEvent);
                console.log("Mouseup event dispatched.");
                const clickEvent = new MouseEvent("click", {bubbles: true, cancelable: true, view: window});
                element.dispatchEvent(clickEvent);
                console.log("Click event dispatched.");
                if (!element.onclick && element.tabIndex >= 0) {
                    const keyEvent = new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                        key: "Enter",
                        code: "Enter"
                    });
                    element.dispatchEvent(keyEvent);
                    console.log("Enter key event dispatched.");
                }
            }

            function clickAndReevaluate(iframe, message) {
                console.log("doing click");
                const element = getElementByXPath(data.xpath);
                if (element) {
                    triggerComplexClick(element);
                } else {
                    console.error('Element not found. XPath:', data.xpath);
                }
                setTimeout(() => {
                    console.log("Reevaluating");
                    iframe.contentWindow.postMessage({
                        html: document.body.innerHTML,
                        code: message.code,
                        action: 'reevaluate',
                        voqal_resp_id: message.voqal_resp_id
                    }, "*");
                }, 1000);
            }

            function writeText(iframe, message) {
                console.log("writing text");
                const element = getElementByXPath(data.xpath);
                if (element) {
                    element.innerText = data.text;
                } else {
                    console.error('Element not found');
                }
            }

            function click(iframe, message) {
                let toClick = [];
                if (data.xpath) {
                    toClick = [getElementByXPath(data.xpath)];
                } else if (data.xpaths) {
                    toClick = data.xpaths.map(getElementByXPath);
                } else {
                    console.error('No xpath(s) provided');
                }
                toClick.forEach(element => {
                    if (element) {
                        console.log("clicking", element);
                        triggerComplexClick(element);
                    } else {
                        console.error('Element not found');
                    }
                });
            }

            if (data.action === 'get_variable') {
                const element = document.querySelector(data.query_selector);
                if (element) {
                    sendResponse({
                        result: element[data.variable_name],
                        debug: event.debug
                    });
                } else {
                    console.error('Element not found');
                    sendResponse({
                        result: null,
                        debug: event.debug
                    });
                }
                handlers.delete(event.voqal_resp_id);
            } else if (data.action === 'update_variable') {
                const element = document.querySelector(data.query_selector);
                if (element) {
                    let value = parseFloat(data.variable_value);
                    if (data.variable_operation === 'add') {
                        value += parseFloat(element[data.variable_name]);
                    }
                    element[data.variable_name] = value;
                } else {
                    console.error('Element not found');
                }

                sendResponse({
                    result: data,
                    debug: event.debug
                });
                handlers.delete(event.voqal_resp_id);
            } else if (data.action === 'update_window') {
                //split variable_name by '.' and set the value
                const variableNameParts = data.variable_name.split('.');
                let variable = window;
                for (let i = 0; i < variableNameParts.length - 1; i++) {
                    variable = variable[variableNameParts[i]];
                }
                variable[variableNameParts[variableNameParts.length - 1]] = data.variable_value;
                sendResponse({
                    result: data,
                    debug: event.debug
                });
                handlers.delete(event.voqal_resp_id);
            } else if (data.action === 'click') {
                click(iframe, message);
                sendResponse({
                    result: data,
                    debug: event.debug
                });
                handlers.delete(event.voqal_resp_id);
            } else if (data.action === 'click_and_reevaluate') {
                clickAndReevaluate(iframe, message);
            } else if (data.action === 'write_text') {
                writeText(iframe, message);
                sendResponse({
                    result: data,
                    debug: event.debug
                });
                handlers.delete(event.voqal_resp_id);
            } else {
                sendResponse({
                    result: data,
                    debug: event.debug
                });
                handlers.delete(event.voqal_resp_id);
            }
        };

        function simpleHash(input) {
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash |= 0;
            }
            return hash;
        }

        let htmlPostData = {};
        if (!emailCache.html || Date.now() - emailCache.lastUpdated > 1000) {
            const innerHTML = document.body.innerHTML
            const htmlHash = simpleHash(innerHTML);

            if (!emailCache.hash || emailCache.hash !== htmlHash) {
                if (emailCache.html) {
                    const diff = extractDiff(emailCache.html, innerHTML);

                    const diffSize = JSON.stringify(diff).length / 1024;
                    const htmlSize = innerHTML.length / 1024;
                    if (diffSize < htmlSize) {
                        htmlPostData = {
                            diff: diff,
                            hash: htmlHash
                        };

                        const appliedDiff = applyDiff(emailCache.html, diff);
                        const appliedHash = simpleHash(appliedDiff);
                        //console.log("Sending diff. Applied hash: " + appliedHash);
                    } else {
                        //console.log("Bad diff. Diff size: " + diffSize + " - Html size: " + htmlSize);
                        htmlPostData = {
                            html: innerHTML,
                            hash: htmlHash
                        };
                        //console.log("Sending full html. Hash: " + htmlHash);
                    }
                } else {
                    htmlPostData = {
                        html: innerHTML,
                        hash: htmlHash
                    };
                    //console.log("Sending full html. Hash: " + htmlHash);
                }
                emailCache = {
                    html: innerHTML,
                    hash: htmlHash,
                    lastUpdated: Date.now()
                };
            }
        }

        handlers.set(message.voqal_resp_id, [handler, Date.now()]);
        const postData = {
            ...htmlPostData,
            code: message.code,
            voqal_resp_id: message.voqal_resp_id,
            sentAt: Date.now()
        };
        const postDataJson = JSON.stringify(postData);
        const size =  (postDataJson.length / 1024);
        if (size > 10) {
            console.log("Post data size in kb: " + size + " - Hash: " + simpleHash(emailCache.html));
        }
        iframe.contentWindow.postMessage(postData, "*");

        return true;
    }
});
