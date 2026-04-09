// content.js - Minimal bridge to sync Auth Tokens and Control Ear from Web Dashboard

window.addEventListener('message', (event) => {
    // 1. Existing Config Sync
    if (event.data?.type === 'SYNC_KEYS') {
        const payload = event.data.payload;
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set(payload, () => {
                console.log('[Extension] Configuration & Auth Synced from Dashboard');
            });
        }
    }

    // 2. Start Listening from Web App
    if (event.data?.type === 'START_EAR') {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ target: 'background', action: 'start-listening' });
        }
    }

    // 3. Stop Listening from Web App
    if (event.data?.type === 'STOP_EAR') {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ target: 'background', action: 'stop-listening' });
        }
    }

    // 4. Allow web app to ask for current state
    if (event.data?.type === 'GET_EAR_STATUS') {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['isListening'], (result) => {
                window.postMessage({
                    type: 'EAR_STATUS_RESPONSE',
                    isListening: result.isListening || false
                }, '*');
            });
        }
    }

    // 5. ── Extension presence probe ──
    // The web dashboard sends PING_EXTENSION on mount and waits up to 1s for a PONG.
    // No PONG = extension not installed. PONG = extension is installed & linked.
    if (event.data?.type === 'PING_EXTENSION') {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['isListening'], (result) => {
                window.postMessage({
                    type: 'PONG_EXTENSION',
                    isListening: result.isListening || false,
                    version: chrome.runtime.getManifest?.()?.version || '1.0.0'
                }, '*');
            });
        }
    }
});
