let offscreenCreating = null;
let isListening = false;
let sessionLogs = [];
let eventSource = null;
let heartbeatInterval = null;
let backendUrl = 'https://spectaglint-ai-production.up.railway.app';
let supabaseToken = '';

async function loadConfig() {
    const data = await chrome.storage.local.get(['supabaseToken', 'backendUrl']);
    if (data.backendUrl) backendUrl = data.backendUrl;
    if (data.supabaseToken) supabaseToken = data.supabaseToken;
    return { backendUrl: backendUrl, supabaseToken: supabaseToken };
}

function pushLog(htmlContent) {
    sessionLogs.push(htmlContent);
    chrome.runtime.sendMessage({ target: 'popup', action: 'live-log', html: htmlContent }).catch(() => null);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'background') return;

    if (message.action === 'get-history') {
        sendResponse({ history: sessionLogs });
    } else if (message.action === 'start-listening') {
        startListening();
    } else if (message.action === 'stop-listening') {
        stopListening();
    } else if (message.action === 'process-audio-chunk') {
        processAudioChunk(message.audioBase64);
    } else if (message.action === 'recording-error') {
        stopListening();
        pushLog(`<span style="color:#ef4444">❌ Error: ${message.error}</span>`);
        chrome.runtime.sendMessage({ target: 'popup', action: 'status-update', status: 'error', error: message.error });
    }
});

async function setupOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    if (offscreenCreating) await offscreenCreating;
    else {
        offscreenCreating = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Capturing system and browser audio for AI transcription in real-time.'
        });
        await offscreenCreating;
        offscreenCreating = null;
    }
}

function connectSSE() {
    if (eventSource) eventSource.close();
    if (!supabaseToken) return;

    eventSource = new EventSource(`${backendUrl}/live/stream?token=${supabaseToken}`);
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'LIVE_LOG') {
                pushLog(data.html);
            }
        } catch (e) {
            console.error('[SSE Parse Error]', e);
        }
    };
    eventSource.onerror = () => console.log('[SSE] Disconnected/Reconnecting...');
}

async function startListening() {
    const config = await loadConfig();
    if (!config.supabaseToken) {
        pushLog(`<span style="color:#ef4444">❌ Auth Error: Missing Token. Please open the Web Dashboard Settings to sync keys.</span>`);
        return;
    }

    await setupOffscreenDocument();
    isListening = true;
    sessionLogs = [];
    chrome.storage.local.set({ isListening: true });

    // Connect SSE locally to forward to the popup
    connectSSE();

    // Signal Backend to Start Session (resets logic on server side and pushes LIVE status)
    fetch(`${backendUrl}/live/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.supabaseToken}`
        },
        body: JSON.stringify({ status: 'LIVE' })
    }).catch(err => console.error('[Start Session Error]', err));

    chrome.runtime.sendMessage({ target: 'offscreen', action: 'start' });

    // ── Start 30s heartbeat to keep backend session alive ──
    // This lets the server know the extension is still running even across page reloads.
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
        if (!supabaseToken || !isListening) return;
        fetch(`${backendUrl}/live/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseToken}`
            },
            body: JSON.stringify({ status: 'LIVE' })
        }).catch(() => null); // fire and forget
    }, 30_000);
}

async function stopListening() {
    isListening = false;
    chrome.storage.local.set({ isListening: false });

    try {
        if (await chrome.offscreen.hasDocument()) {
            chrome.runtime.sendMessage({ target: 'offscreen', action: 'stop' });
            await chrome.offscreen.closeDocument();
        }
    } catch (e) { }

    // ── Clear heartbeat ──
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    chrome.runtime.sendMessage({ target: 'popup', action: 'status-update', status: 'stopped' });

    // Signal Backend to Stop Session
    fetch(`${backendUrl}/live/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseToken}`
        },
        body: JSON.stringify({ status: 'STOPPED' })
    }).catch(err => console.error('[Stop Session Error]', err));

    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

async function processAudioChunk(base64Data) {
    if (!base64Data || !isListening || !supabaseToken) return;

    // Convert Base64 to Blob
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/webm' });
    if (blob.size < 300) return;

    const formData = new FormData();
    formData.append('file', blob, 'chunk.webm');

    // Fire and forget POST to Backend
    fetch(`${backendUrl}/live/audio`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${supabaseToken}`
        },
        body: formData
    }).catch(err => {
        console.log('[Audio Post Error]', err);
        pushLog(`<span style="color:#ef4444; font-size:11px;">⚠️ Post Error: ${err.message}. Backend might be offline or blocked.</span>`);
    });
}
