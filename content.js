// content.js - Minimal bridge to sync Auth Tokens from Web Dashboard to Extension

window.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_KEYS') {
        const payload = event.data.payload;
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set(payload, () => {
                console.log('[Extension] Configuration & Auth Synced from Dashboard');
            });
        }
    }
});
