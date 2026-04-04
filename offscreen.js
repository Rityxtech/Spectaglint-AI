// offscreen.js — Zero-Gap Real-Time Streaming Pipeline
// Chunks every 4s, 600ms silence detection, recorder restarts BEFORE dispatch

let mediaRecorder = null;
let audioContext = null;
let analyser = null;
let stream = null;
let isRecording = false;
let audioChunks = [];
let silenceTimer = null;
let forceChunkTimer = null;

// Tuned for maximum real-time speed while preserving whole words
const CHUNK_INTERVAL_MS = 7500;    // Cut after 7.5s if they speak without breathing
const SILENCE_THRESHOLD_MS = 750;  // Dispatch just 750ms after they stop speaking
const SILENCE_LEVEL = 8;           // Increased from 4 to 8: ignore background static/hum

// ─── Entry Points ──────────────────────────────────────────────────────────────

async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'monitor' },
            audio: {
                autoGainControl: true,     // Automatically boosts quiet voices and lowers shouting
                echoCancellation: true,    // Removes hollow room bouncing/echo
                noiseSuppression: true,    // Chrome's built-in AI filter for traffic, fans, hums
                sampleRate: 44100
            }
        });

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            throw new Error("No audio track found. Enable 'Share system audio' in the screen picker.");
        }

        // We only need audio — drop the video track immediately
        stream.getVideoTracks().forEach(track => track.stop());

        setupSilenceDetection(stream);
        isRecording = true;
        startNewRecorder();

    } catch (err) {
        chrome.runtime.sendMessage({ target: 'background', action: 'recording-error', error: err.message });
    }
}

function stopRecording() {
    isRecording = false;
    if (forceChunkTimer) { clearInterval(forceChunkTimer); forceChunkTimer = null; }
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (audioContext) audioContext.close();
}

// ─── Silence Detection ─────────────────────────────────────────────────────────

function setupSilenceDetection(audioStream) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let wasSpeaking = false;

    function checkVolume() {
        if (!isRecording) return;

        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

        if (avg > SILENCE_LEVEL) {
            // Audio is active
            wasSpeaking = true;
            if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        } else if (wasSpeaking && !silenceTimer) {
            // Speech just ended — cut chunk after short pause
            silenceTimer = setTimeout(() => {
                wasSpeaking = false;
                silenceTimer = null;
                cutChunk();
            }, SILENCE_THRESHOLD_MS);
        }

        requestAnimationFrame(checkVolume);
    }

    checkVolume();
}

// ─── Recorder Lifecycle ────────────────────────────────────────────────────────

function startNewRecorder() {
    if (!isRecording) return;

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        // ▶ CRITICAL: snapshot the captured audio
        const captured = [...audioChunks];
        audioChunks = [];

        // ▶ Restart recorder IMMEDIATELY — zero listening gap before dispatching
        if (isRecording) startNewRecorder();

        // ▶ Now dispatch the previously captured chunk
        if (captured.length > 0) {
            const blob = new Blob(captured, { type: 'audio/webm' });
            if (blob.size > 300) dispatchChunk(blob); // skip near-empty blobs
        }
    };

    mediaRecorder.start();

    // Always force a cut every CHUNK_INTERVAL_MS regardless of silence
    if (forceChunkTimer) clearInterval(forceChunkTimer);
    forceChunkTimer = setInterval(cutChunk, CHUNK_INTERVAL_MS);
}

function cutChunk() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop(); // onstop handles restart + dispatch
    }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

function dispatchChunk(blob) {
    const reader = new FileReader();
    reader.onloadend = () => {
        chrome.runtime.sendMessage({
            target: 'background',
            action: 'process-audio-chunk',
            audioBase64: reader.result.split(',')[1]
        });
    };
    reader.readAsDataURL(blob);
}

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;
    if (message.action === 'start') startRecording();
    else if (message.action === 'stop') stopRecording();
});
