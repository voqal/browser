let webSocket = null;
let reconnectIntervalId = null;
let keepAliveIntervalId = null;
let enabled = false;
let contextUpdaters = [defaultContextUpdater];
let contextUpdaterMessageId = 0;

const updaterStats = new Map(); // { updater: { count, totalTime } }
setInterval(async () => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        const updaterPromises = contextUpdaters.map(async (updater, index) => {
            const startTime = performance.now();
            try {
                const result = await updater();
                const endTime = performance.now();

                if (!updaterStats.has(index)) {
                    updaterStats.set(index, { count: 0, totalTime: 0 });
                }
                const stats = updaterStats.get(index);
                stats.count += 1;
                stats.totalTime += (endTime - startTime);

                return {
                    ...result,
                    debug: {
                        ...result.debug,
                        ...stats
                    }
                };
            } catch (err) {
                console.error("Error in updater:", err);
                return null;
            }
        });

        const results = await Promise.all(updaterPromises);
        results.forEach(result => {
            if (result !== null) {
                //console.log("Sending context update:", result);
                webSocket.send(JSON.stringify(result));
            }
        });
    }
}, 1000);


async function defaultContextUpdater() {
    const tabs = await chrome.tabs.query({});
    const browserInfo = {}
    browserInfo['tabs'] = tabs.map(tab => {
        const urlParams = new URLSearchParams(new URL(tab.url).search);
        const urlParamsObj = {};
        for (const [key, value] of urlParams) {
            urlParamsObj[key] = value;
        }
        return {
            id: tab.id,
            url: tab.url,
            urlParams: urlParamsObj,
            host: new URL(tab.url).host,
            title: tab.title,
            active: tab.active,
        }
    });
    browserInfo['activeTab'] = browserInfo['tabs'].find(tab => tab.active);

    return {
        result: browserInfo,
        type: 'context_update',
        context: 'integration'
    };
}

chrome.runtime.onStartup.addListener(function () {
    console.log('open');
    chrome.storage.local.get("enabled", (data) => {
        enabled = data.enabled || false;
        if (enabled) {
            startReconnectionLoop();
        }
    });
})

chrome.action.setIcon({path: 'icons/socket-disabled.png'});
chrome.action.onClicked.addListener(async () => {
    enabled = !enabled;
    chrome.storage.local.set({enabled});

    if (enabled) {
        startReconnectionLoop();
    } else {
        stopReconnectionLoop();
    }
});

function connect() {
    if (webSocket && (webSocket.readyState === WebSocket.OPEN || webSocket.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket is already connected or connecting. Skipping connect.");
        return;
    }

    //console.log('Connecting to WebSocket server...');
    webSocket = new WebSocket('ws://localhost:22171/integration/chrome'); //todo: dynamic

    webSocket.onopen = () => {
        chrome.action.setIcon({path: 'icons/socket-active.png'});
        console.log('WebSocket connection established.');
        clearReconnectInterval();
        startKeepAlive();
    };

    webSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        //console.log("Event type: ", data.type);

        if (data.type === 'open_url') {
            const url = data.payload.url;
            await chrome.tabs.update({url});

            const resp = {
                result: {
                    status: 'success'
                },
                replyTo: data.replyTo
            }
            webSocket.send(JSON.stringify(resp));
        } else if (data.type === 'create_tab') {
            console.log(JSON.stringify(data));
            const url = data.payload.url;
            await chrome.tabs.create({url});

            //todo: sync with context update?
            const resp = {
                result: {
                    status: 'success'
                },
                replyTo: data.replyTo
            };
            webSocket.send(JSON.stringify(resp));
        } else if (data.type === 'make_tab_active') {
            console.log(JSON.stringify(data));
            const tabId = data.payload.tab_id
            const tabIdNum = parseInt(tabId);
            await chrome.tabs.update(tabIdNum, {active: true});

            //todo: sync with context update?
            const resp = {
                result: {
                    status: 'success'
                },
                replyTo: data.replyTo
            };
            webSocket.send(JSON.stringify(resp));
        } else if (data.type === 'javascript') {
            let tabId = null;
            //todo: selector is on backend context. this is more like "specifier"
            //const selector = data.metadata.selector;
            // if (selector) {
            //     if (selector.host) {
            //         const tabs = await getTabsByHost(selector.host);
            //         if (tabs.length > 0) {
            //             if (tabs.length > 1) {
            //                 console.log('Found multiple tabs by host', tabs);
            //
            //                 const activeTab = await getActiveTab();
            //                 if (activeTab) {
            //                     const url = new URL(activeTab.url);
            //                     if (url.host === selector.host) {
            //                         console.log("Using active tab");
            //                         tabId = activeTab.id;
            //                     } else {
            //                         console.log("Defaulting to first tab by host");
            //                         tabId = tabs[0].id;
            //                     }
            //                 } else {
            //                     console.log("Defaulting to first tab by host");
            //                     tabId = tabs[0].id;
            //                 }
            //             } else {
            //                 tabId = tabs[0].id;
            //             }
            //         } else {
            //             console.error('No tabs found by host:', selector.host);
            //             const resp = {
            //                 'result': {
            //                     'status': 'error',
            //                     'message': 'No tabs found by host: ' + selector.host,
            //                     'info': 'Tell the user to open a tab'
            //                 },
            //                 'replyTo': data.replyTo
            //             }
            //             webSocket.send(JSON.stringify(resp));
            //             return;
            //         }
            //     } else {
            //         console.error('Invalid selector:', selector);
            //         const resp = {
            //             'result': {
            //                 'status': 'error',
            //                 'message': 'Invalid selector: ' + selector,
            //                 'info': 'Tell the user to check the selector'
            //             },
            //             'replyTo': data.replyTo
            //         }
            //         webSocket.send(JSON.stringify(resp));
            //         return;
            //     }
            // } else {
                const activeTab = await getActiveTab();
                if (!activeTab) {
                    console.log('No active tab found');
                    const resp = {
                        'result': {
                            'status': 'error',
                            'message': 'No active tab found',
                            'info': 'Tell the user to open a tab'
                        },
                        'replyTo': data.replyTo
                    }
                    webSocket.send(JSON.stringify(resp));
                    return;
                }
                tabId = activeTab.id;
            // }

            const execFunc = {
                type: "evaluate",
                code: data.payload,
                voqal_resp_id: data.replyTo
            }
            chrome.tabs.sendMessage(tabId, execFunc, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError);
                } else {
                    const resp = {
                        result: response.result,
                        replyTo: data.replyTo
                    };

                    //console.log("Sending resp: ", resp);
                    webSocket.send(JSON.stringify(resp));
                }
            });
        } else if (data.type === 'context_updater') {
            console.log("Adding context updater: " + JSON.stringify(data));
            const contextLibrary = data.library;
            const contextUpdaterName = data.name
            const contextUpdater = async function () {
                let tabId = null;
                const activeTab = await getActiveTab();
                if (!activeTab) {
                    console.log('No active tab found');
                    return {
                        result: null,
                        type: 'context_update',
                        context: 'library',
                        name: contextUpdaterName,
                        library: contextLibrary
                    }
                }
                tabId = activeTab.id;
                //console.log("executing context updater on tabId: ", tabId);

                const execFunc = {
                    type: "evaluate",
                    code: data.payload,
                    voqal_resp_id: "gen-" + contextUpdaterMessageId++
                }

                const response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tabId, execFunc, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            //console.log("Context updater result:", response);
                            resolve(response);
                        }
                    });
                });
                //console.log("The response: " + JSON.stringify(response));

                return {
                    ...response,
                    type: 'context_update',
                    context: 'library',
                    name: contextUpdaterName,
                    library: contextLibrary
                };
            };
            contextUpdaters.push(contextUpdater);

            const resp = {
                result: {
                    status: 'success'
                },
                replyTo: data.replyTo
            };
            webSocket.send(JSON.stringify(resp));
        } else if (data.type === 'pong') {
            //console.log('Received pong');
        } else {
            console.error('Unknown event type:', data.type);
        }
    };

    webSocket.onclose = () => {
        //console.log('WebSocket connection closed');
        webSocket = null;
        clearKeepAlive();

        if (enabled) {
            chrome.action.setIcon({path: 'icons/socket-inactive.png'});
            if (!reconnectIntervalId) {
                startReconnectionLoop();
            }
        }
    };
}

async function getActiveTab() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    return tabs[0];
}

async function getTabsByHost(host) {
    const tabs = await chrome.tabs.query({});
    return tabs.filter(tab => {
        const url = new URL(tab.url);
        return url.host === host;
    });
}

function disconnect() {
    console.log('Disconnecting from WebSocket server...');
    if (webSocket) {
        webSocket.close();
        webSocket = null;
    }
}

function startKeepAlive() {
    console.log('Starting keep alive interval...');
    clearKeepAlive();
    keepAliveIntervalId = setInterval(() => {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            webSocket.send(JSON.stringify({type: 'ping'}));
        } else {
            clearKeepAlive();
        }
    }, 20 * 1000);
}

function clearKeepAlive() {
    //console.log('Clearing keep alive interval...');
    if (keepAliveIntervalId) {
        clearInterval(keepAliveIntervalId);
        keepAliveIntervalId = null;
    }
}

function startReconnectionLoop() {
    console.log('Starting reconnection loop...');
    chrome.action.setIcon({path: 'icons/socket-inactive.png'});
    contextUpdaters = [defaultContextUpdater];

    connect();
    reconnectIntervalId = setInterval(() => {
        //console.log('Attempting to reconnect...');
        connect();
    }, 5000);
}

function stopReconnectionLoop() {
    console.log('Stopping reconnection loop...');
    chrome.action.setIcon({path: 'icons/socket-disabled.png'});
    clearInterval(reconnectIntervalId);
    reconnectIntervalId = null;
    disconnect();
}

function clearReconnectInterval() {
    console.log('Clearing reconnect interval...');
    if (reconnectIntervalId) {
        clearInterval(reconnectIntervalId);
        reconnectIntervalId = null;
    }
}
