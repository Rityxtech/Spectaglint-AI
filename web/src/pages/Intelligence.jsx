import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
    Activity,
    Terminal as TerminalIcon,
    X,
    Radio,
    WifiOff,
    Maximize2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';

const IntelligenceFeed = () => {
    // ── Real-time terminal log lines streamed from extension
    const [loading, setLoading] = useState(false);
    const [logLines, setLogLines] = useState([]);
    const [serviceMode, setServiceMode] = useState('LIVE_ANSWERS');
    const prevServiceMode = useRef('LIVE_ANSWERS');
    const [extStatus, setExtStatus] = useState('IDLE'); // 'IDLE' | 'LIVE' | 'STOPPED'
    const [extLinked, setExtLinked] = useState(null); // null=checking, true=installed, false=not installed
    const [actionToast, setActionToast] = useState({ open: false, type: 'success', title: '', desc: '' });

    // File upload states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadFileName, setUploadFileName] = useState('');
    const fileInputRef = useRef(null);

    const terminalRef = useRef(null);
    const mobileTerminalRef = useRef(null);

    // ── Mobile fullscreen modal
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isOpening, setIsOpening] = useState(true);

    const openFullscreen = () => {
        setShowFullscreen(true);
        setIsOpening(true);
        document.body.style.overflow = 'hidden';
        setTimeout(() => setIsOpening(false), 50);
    };

    const closeFullscreen = () => {
        setIsClosing(true);
        document.body.style.overflow = '';
        setTimeout(() => {
            setShowFullscreen(false);
            setIsClosing(false);
            setIsOpening(true);
        }, 300);
    };

    // ── Extension presence detection (PING/PONG via content.js bridge) ──
    // We send a PING_EXTENSION message; content.js replies with PONG_EXTENSION within ~100ms.
    // If no PONG arrives within 1.5s, we know the extension is not installed.
    useEffect(() => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                setExtLinked(false); // no pong received = not installed
            }
        }, 1500);

        const handlePong = (event) => {
            if (event.data?.type === 'PONG_EXTENSION' && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                setExtLinked(true);
                // Also hydrate isListening status from extension's local storage
                if (event.data.isListening) setExtStatus('LIVE');
            }
        };

        window.addEventListener('message', handlePong);
        window.postMessage({ type: 'PING_EXTENSION' }, '*');

        return () => {
            window.removeEventListener('message', handlePong);
            clearTimeout(timeout);
        };
    }, []);

    // ── Auto-scroll both desktop and mobile terminals on new entries
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
        if (mobileTerminalRef.current) {
            mobileTerminalRef.current.scrollTop = mobileTerminalRef.current.scrollHeight;
        }
    }, [logLines]);

    useEffect(() => {
        let eventSource;

        const connectSSE = async () => {
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const backendUrl = import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app';

            // Forcefully sync the auth token to the extension instantly when the feed page loads
            window.postMessage({
                type: 'SYNC_KEYS',
                payload: {
                    supabaseToken: session.access_token,
                    backendUrl: backendUrl
                }
            }, '*');

            // ── Fetch persisted extension status from backend (fixes reload bug) ──
            // This is the server-side truth, independent of the SSE connection.
            try {
                const statusRes = await fetch(`${backendUrl}/live/extension-status`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setExtStatus(statusData.status || 'STOPPED');
                    if (statusData.linked) setExtLinked(true); // extension has checked in before
                }
            } catch (_) { /* non-fatal */ }

            eventSource = new EventSource(`${backendUrl}/live/stream?token=${session.access_token}`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'EXTENSION_STATUS') {
                        setExtStatus(data.status);
                    }
                    if (data.type === 'LIVE_LOG') {
                        setLogLines(prev => [...prev, { id: Date.now() + Math.random(), html: data.html }]);
                    }
                } catch (err) {
                    console.error('[SSE] JSON parse error', err);
                }
            };

            eventSource.onerror = (err) => {
                console.error('[SSE] Connection error', err);
            };
        };

        connectSSE();

        return () => {
            if (eventSource) eventSource.close();
        };
    }, []);

    const clearTerminal = () => {
        setLogLines([]);
        window.postMessage({ type: 'CLEAR_CACHE' }, '*');
        setActionToast({
            open: true,
            type: 'success',
            title: 'CACHE PURGED',
            desc: 'Internal telemetry buffer and visual state have been securely wiped.'
        });
    };

    // ── Clear terminal when switching protocol modes to prevent bleed-over ──
    // e.g. live chat logs must not appear in FILE_ANSWERS dropzone view
    useEffect(() => {
        if (prevServiceMode.current !== serviceMode) {
            prevServiceMode.current = serviceMode;
            setLogLines([]);
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [serviceMode]);

    const exportLog = () => {
        if (logLines.length === 0) {
            setActionToast({
                open: true,
                type: 'error',
                title: 'EXPORT FAILED',
                desc: 'No telemetry data available for generating an export manifold.'
            });
            return;
        }

        const dateString = new Date().toISOString().replace(/[:.]/g, '-');
        let content = `SPECTAGLINT AI COMPANION | TELEMETRY LOG EXPORT\n`;
        content += `Session Generated: ${new Date().toLocaleString()}\n`;
        content += `Protocol Mode: ${serviceMode}\n`;
        content += `====================================================\n\n`;

        logLines.forEach(line => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = line.html;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            let timestamp = '';

            // Only parse timestamp from timestamp-based items, else fallback
            if (!isNaN(new Date(line.id).getTime())) {
                timestamp = `[${new Date(line.id).toISOString().substr(11, 8)}] `;
            }

            content += `${timestamp}${plainText.trim()}\n`;
        });

        content += `\n====================================================\n`;
        content += `END OF LOGS. Packets Processed: ${logLines.length}`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spectaglint_export_${dateString}.txt`;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setActionToast({
            open: true,
            type: 'success',
            title: 'LOG EXPORTED',
            desc: 'Telemetry block successfully formulated and downloaded to your local drive.'
        });
    };

    if (loading) return <TechLoader />;

    const isLive = extStatus === 'LIVE';
    const isCheckingExt = extLinked === null;

    const handleToggle = (e) => {
        if (!extLinked) {
            // Shouldn't be reachable, but guard anyway
            setActionToast({ open: true, type: 'error', title: 'EXTENSION NOT FOUND', desc: 'Install the Spectaglint browser extension to start capturing audio.' });
            return;
        }
        const turningOn = e.target.checked;
        if (turningOn) {
            window.postMessage({ type: 'START_EAR', payload: { protocol: serviceMode } }, '*');
        } else {
            window.postMessage({ type: 'STOP_EAR' }, '*');
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 24 * 1024 * 1024) {
            setActionToast({ open: true, type: 'error', title: 'FILE TOO LARGE', desc: 'Please select an audio file under 24MB for Groq processing.' });
            return;
        }

        setUploadFileName(file.name);
        setIsUploading(true);
        setUploadProgress(15);

        try {
            const { supabase } = await import('../lib/supabase');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error('Authentication locked. Please re-login to authorize transcription.');
            }

            const formData = new FormData();
            formData.append('audioFile', file);
            formData.append('mode', serviceMode);

            const backendUrl = import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app';

            setUploadProgress(40);

            const response = await fetch(`${backendUrl}/process/audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: formData
            });

            const data = await response.json();

            setUploadProgress(100);
            setIsUploading(false);

            if (!response.ok) throw new Error(data.message || data.error || JSON.stringify(data) || 'Data processing failed');

            // Render the blocks directly to the terminal!
            const newLines = data.blocks.map(b => ({ id: Date.now() + Math.random(), html: b.html }));
            setLogLines(prev => [...prev, ...newLines]);

            setActionToast({ open: true, type: 'success', title: 'PROCESSING COMPLETE', desc: 'Audio payload fully rendered to terminal interface.' });

            // Wipe file input 
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err) {
            console.error(err);
            setIsUploading(false);
            setUploadProgress(0);
            setActionToast({ open: true, type: 'error', title: 'PROCESSING FAILED', desc: err.message });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // TerminalContent is defined OUTSIDE this component (below IntelligenceFeed)
    // to ensure React never treats it as a new component type on re-render.
    // All dynamic values are passed as explicit props.
    const terminalProps = { logLines, serviceMode, isLive, isUploading, fileInputRef, handleFileSelect, clearTerminal };

    // ── placeholder so jsx below still compiles — actual component defined at bottom of file
    const _unused = null;
    void _unused;

    // [── INLINE REMOVED — see TerminalContent component at bottom of file ──]
    const _TerminalContent_removed = ({ scrollRef, height, className = "" }) => {
        if (serviceMode === 'LIVE_ANSWERS') {
            return (
                <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-4 space-y-1.5 font-['JetBrains_Mono'] text-xs ${className}`} style={height ? { height } : undefined}>
                    {logLines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[120px] md:min-h-[200px] text-center">
                            <TerminalIcon size={24} className="text-on-surface-variant/15 mb-2 md:mb-3 md:w-[28px] md:h-[28px]" />
                            <div className="text-[9px] md:text-[10px] text-on-surface-variant/30 uppercase tracking-widest px-2">
                                {isLive ? 'CONNECTED — WAITING FOR AUDIO INPUT...' : 'TERMINAL IDLE — CAPTURE ENGINE OFFLINE'}
                            </div>
                            {isLive && (
                                <div className="flex items-center gap-1.5 mt-2 md:mt-3 text-primary/50 text-[8px] md:text-[9px]">
                                    <span className="animate-pulse">▋</span> LISTENING...
                                </div>
                            )}
                        </div>
                    ) : (
                        logLines.map(line => (
                            <div key={line.id} className="leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5 hover:border-primary/30 transition-all" dangerouslySetInnerHTML={{ __html: line.html }} />
                        ))
                    )}
                    {isLive && (
                        <div className="text-primary/70 text-[11px] pl-3 flex items-center gap-1 mt-1">
                            <span className="animate-pulse">▋</span>
                        </div>
                    )}
                </div>
            );
        }

        if (serviceMode === 'LIVE_TRANSCRIPTION') {
            return (
                <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-5 font-mono text-xs tracking-wide ${className}`} style={height ? { height } : undefined}>
                    {logLines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[120px] md:min-h-[200px] text-center font-['JetBrains_Mono']">
                            <span className="material-symbols-outlined text-3xl md:text-4xl text-on-surface-variant/15 mb-2 md:mb-3">graphic_eq</span>
                            <div className="text-[9px] md:text-[10px] text-on-surface-variant/30 uppercase tracking-widest md:mb-1 px-2">
                                {isLive ? 'AWAITING VOCAL CAPTURE STREAM' : 'LIVE TRANSCRIPTION ENGINE OFFLINE'}
                            </div>
                            <div className="text-[7px] md:text-[8px] text-on-surface-variant/20 uppercase tracking-widest mt-1 md:mt-0">CONTINUOUS RAW TEXT OUTPUT</div>
                        </div>
                    ) : (
                        <div className="text-on-surface-variant/80 font-['JetBrains_Mono'] leading-relaxed space-y-2 md:space-y-3">
                            {logLines.map((line) => (
                                <div key={line.id} className="flex gap-3 md:gap-4 p-1.5 md:p-2 hover:bg-surface-container-high/30 transition-colors border-l-2 border-transparent hover:border-tertiary/40">
                                    <span className="text-[8.5px] md:text-[9px] text-tertiary/40 shrink-0 mt-0.5">
                                        [{new Date().toISOString().substr(11, 8)}]
                                    </span>
                                    <span dangerouslySetInnerHTML={{ __html: line.html }} />
                                </div>
                            ))}
                        </div>
                    )}
                    {isLive && (
                        <div className="text-tertiary text-[9px] md:text-[10px] font-['JetBrains_Mono'] flex items-center gap-2 mt-3 md:mt-4 ml-12 md:ml-[72px]">
                            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-tertiary animate-pulse shadow-[0_0_5px_rgba(255,255,255,0.4)]"></span> TRANSCRIBING...
                        </div>
                    )}
                </div>
            );
        }

        if (serviceMode === 'FILE_ANSWERS' || serviceMode === 'FILE_TRANSCRIPTION') {
            const isTranscription = serviceMode === 'FILE_TRANSCRIPTION';
            const themeBorderHover = isTranscription ? 'hover:border-tertiary/40' : 'hover:border-primary/40';
            const themeBgHover = isTranscription ? 'hover:bg-tertiary/5' : 'hover:bg-primary/5';
            const themeText = isTranscription ? 'text-tertiary' : 'text-primary';
            const themeButtonClasses = isTranscription
                ? 'border-tertiary text-tertiary hover:bg-tertiary hover:text-black'
                : 'border-primary text-primary hover:bg-primary hover:text-black';
            const themeBorderColor = isTranscription ? 'border-tertiary/40' : 'border-primary/40';

            return (
                <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-4 flex flex-col font-['JetBrains_Mono'] text-xs ${className}`} style={height ? { height } : undefined}>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" className="hidden" />

                    {/* ── Upload dropzone: only shown when no results yet and not uploading */}
                    {!isUploading && logLines.length === 0 && (
                        <div onClick={() => fileInputRef.current?.click()} className={`flex-1 flex flex-col items-center justify-center min-h-[140px] md:min-h-[250px] border-2 border-dashed border-outline-variant/20 ${themeBorderHover} ${themeBgHover} transition-all cursor-pointer group p-4 md:p-8 text-center rounded-sm`}>
                            <span className={`material-symbols-outlined text-3xl md:text-5xl mb-2 md:mb-4 transition-transform group-hover:-translate-y-1 ${themeText}`}>
                                {isTranscription ? 'description' : 'neurology'}
                            </span>
                            <div className={`text-[11px] md:text-sm font-black uppercase tracking-widest mb-1 md:mb-2 ${themeText}`}>
                                UPLOAD AUDIO MANIFEST
                            </div>
                            <div className="text-[8px] md:text-[10px] text-on-surface-variant/50 tracking-wider mb-3 md:mb-6 max-w-[280px]">
                                Drop your recorded {isTranscription ? 'audio file for bulk high-fidelity transcription' : 'meeting here to automatically extract Q&A insights'} or click to browse.
                            </div>
                            <button className={`px-4 md:px-5 py-2 md:py-2.5 bg-transparent border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${themeButtonClasses}`}>
                                SELECT LOCAL FILE
                            </button>
                            <div className="text-[7px] md:text-[8px] text-on-surface-variant/30 mt-2 md:mt-4 uppercase tracking-widest">
                                SUPPORTED FORMATS: .MP3, .WAV, .M4A
                            </div>
                        </div>
                    )}

                    {/* ── Processing spinner */}
                    {isUploading && (
                        <div className="flex-1 flex flex-col items-center justify-center animate-pulse min-h-[140px] md:min-h-[250px] border border-outline-variant/20 p-4 md:p-8 bg-[#0a0f0d]">
                            <span className={`material-symbols-outlined text-3xl md:text-5xl mb-3 md:mb-4 animate-spin ${themeText}`}>autorenew</span>
                            <div className="text-[10px] md:text-[12px] text-on-surface font-black uppercase tracking-widest mb-1">
                                PROCESSING SECURE PAYLOAD...
                            </div>
                            <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 tracking-widest uppercase text-center max-w-[250px]">
                                Uploading and decoding structural audio data. Please keep window open.
                            </div>
                        </div>
                    )}

                    {/* ── Results: rendered after successful upload */}
                    {!isUploading && logLines.length > 0 && (
                        <>
                            {/* Toolbar row */}
                            <div className={`flex items-center justify-between mb-2 md:mb-3 pb-2 border-b ${themeBorderColor} shrink-0`}>
                                <div className={`text-[9px] uppercase tracking-widest font-black ${themeText}`}>
                                    {logLines.length} BLOCK{logLines.length !== 1 ? 'S' : ''} DECODED
                                </div>
                                <button
                                    onClick={() => { clearTerminal(); }}
                                    className={`text-[8px] uppercase tracking-widest border px-2.5 py-1 transition-colors ${themeButtonClasses}`}
                                >
                                    ↑ NEW UPLOAD
                                </button>
                            </div>

                            {/* Result blocks */}
                            <div className="space-y-1.5 md:space-y-2">
                                {logLines.map(line => (
                                    <div
                                        key={line.id}
                                        className={`leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5 transition-all ${isTranscription ? 'hover:border-tertiary/30' : 'hover:border-primary/30'
                                            }`}
                                        dangerouslySetInnerHTML={{ __html: line.html }}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Standby placeholder: only when fresh with no results */}
                    {!isUploading && logLines.length === 0 && (
                        <div className="mt-2 md:mt-4 p-2.5 md:p-4 border border-outline-variant/10 bg-[#0a0f0d] flex items-center justify-between opacity-50 grayscale pointer-events-none">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="material-symbols-outlined text-[16px] md:text-[24px] text-on-surface-variant">audio_file</span>
                                <div>
                                    <div className="text-[9px] md:text-[10px] text-on-surface font-bold uppercase tracking-widest">AWAITING_UPLOAD.WAV</div>
                                    <div className="text-[7px] md:text-[8px] text-on-surface-variant/50 uppercase">0 MB / 0 MB</div>
                                </div>
                            </div>
                            <div className="text-[8px] md:text-[9px] text-on-surface-variant/40">STANDBY</div>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    }; // end _TerminalContent_removed (not used)

    return (
        <div className="w-full flex flex-col gap-[10px] md:gap-4 flex-1">

            <PageHeader
                title="LIVE_INTELLIGENCE"
                label="MODULE // LIVE_FEED"
                description="Secure real-time neural uplink. Monitor translated insights and transcriptions as they stream directly from your local environment."
                mobileDescription="Monitor translated insights and transcriptions streaming from your environment."
            />

            {/* ── STATUS BANNER */}
            <div className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border font-['JetBrains_Mono'] text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-500 ${isCheckingExt
                ? 'bg-surface-container border-outline-variant/20 text-on-surface-variant/50'
                : extLinked === false
                    ? 'bg-yellow-900/10 border-yellow-600/40 text-yellow-400'
                    : isLive
                        ? 'bg-primary/5 border-primary/40 text-primary'
                        : 'bg-red-900/10 border-red-800/40 text-red-400'
                }`}>
                <div className="flex items-center gap-2">
                    <span
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: isCheckingExt ? '#64748b' : extLinked === false ? '#ca8a04' : isLive ? '#8eff71' : '#ef4444',
                            boxShadow: isCheckingExt ? 'none' : extLinked === false ? '0 0 8px rgba(202,138,4,0.6)' : isLive ? '0 0 8px rgba(142,255,113,0.8)' : '0 0 8px rgba(239,68,68,0.5)',
                            animation: isCheckingExt ? 'pulse 1s infinite' : isLive ? 'pulse 1.5s infinite' : 'pulse 2s infinite'
                        }}
                    />
                    <span className="truncate hidden sm:inline">
                        {isCheckingExt
                            ? 'SCANNING FOR EXTENSION...'
                            : extLinked === false
                                ? '⚠ EXTENSION NOT DETECTED — INSTALL REQUIRED'
                                : isLive ? '● ENGINE ACTIVE — CAPTURING' : '■ ENGINE ONLINE — ACTIVATE TO BEGIN'
                        }
                    </span>
                    {/* Mobile short label */}
                    <span className="truncate sm:hidden text-[8px]">
                        {isCheckingExt ? 'SCANNING...' : extLinked === false ? '⚠ NOT INSTALLED' : isLive ? '● LIVE' : '■ OFFLINE'}
                    </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* ── Extension installed: show normal toggle ── */}
                    {!isCheckingExt && extLinked && (
                        <div className="flex items-center gap-2 md:gap-3 border-r border-current/20 pr-3">
                            <span className={`font-black text-[10px] md:text-sm tracking-widest ${isLive ? 'text-primary' : 'text-on-surface'}`}>
                                {isLive ? 'STREAM_ON' : 'STREAM_OFF'}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer ml-1 md:ml-2">
                                <input type="checkbox" className="sr-only peer" checked={isLive} onChange={handleToggle} />
                                <div className="w-12 h-6 md:w-16 md:h-8 bg-surface-container-highest peer-focus:outline-none border border-outline-variant/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#0a0f0d] after:content-[''] after:absolute after:top-[2px] after:left-[2px] md:after:left-[3px] after:bg-outline-variant/50 after:border-outline-variant/50 after:border after:rounded-full after:h-5 after:w-5 md:after:h-7 md:after:w-7 after:transition-all peer-checked:bg-primary peer-checked:after:bg-[#0a0f0d] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] cursor-pointer"></div>
                            </label>
                        </div>
                    )}

                    {/* ── Extension not installed: show install CTA ── */}
                    {!isCheckingExt && extLinked === false && (
                        <a
                            href="/install"
                            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border border-yellow-500/50 text-yellow-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[12px] md:text-[14px]">extension</span>
                            <span className="hidden sm:inline">INSTALL EXTENSION</span>
                            <span className="sm:hidden">INSTALL</span>
                        </a>
                    )}

                    {isLive && extLinked && <Radio size={12} className="animate-pulse hidden md:block" />}
                    {!isLive && extLinked && <WifiOff size={12} className="opacity-40 hidden md:block" />}

                    {/* Mobile fullscreen button */}
                    <button
                        onClick={openFullscreen}
                        className="md:hidden flex items-center gap-1 text-[9px] uppercase tracking-widest border border-current/30 px-2 py-1.5 hover:bg-current/10 transition-colors ml-1"
                        title="Fullscreen terminal"
                    >
                        <Maximize2 size={12} /> EXPAND
                    </button>
                </div>
            </div>

            {/* ── DESKTOP LAYOUT: side-by-side grid */}
            <div className="hidden md:grid md:grid-cols-12 gap-6 items-stretch flex-1 min-h-[400px]">

                {/* Left: Terminal */}
                <div className="md:col-span-7 flex flex-col h-full">
                    <div className="bg-[#030504] border border-outline-variant/20 flex flex-col h-full">
                        <TerminalHeader isLive={isLive} onClear={clearTerminal} />
                        <TerminalContent scrollRef={terminalRef} className="flex-1" {...terminalProps} />
                    </div>
                </div>

                {/* Right: Active Telemetry / Trans Matrix */}
                <div className="md:col-span-5 flex flex-col gap-3">
                    <ActiveSessionPanel logLines={logLines} isLive={isLive} onClear={clearTerminal} serviceMode={serviceMode} setServiceMode={setServiceMode} onExport={exportLog} />
                </div>
            </div>

            {/* ── MOBILE LAYOUT: stacked */}
            <div className="md:hidden flex flex-col gap-[10px]">

                {/* Mobile terminal — compact height */}
                <div className="bg-[#030504] border border-outline-variant/20 flex flex-col">
                    <TerminalHeader isLive={isLive} onClear={clearTerminal} />
                    <TerminalContent scrollRef={mobileTerminalRef} height="60vh" {...terminalProps} />
                </div>

                {/* Mobile Session Metrics */}
                <ActiveSessionPanel logLines={logLines} isLive={isLive} onClear={clearTerminal} serviceMode={serviceMode} setServiceMode={setServiceMode} onExport={exportLog} />
            </div>

            {/* ── MOBILE FULLSCREEN SLIDE-IN MODAL */}
            {showFullscreen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                        onClick={closeFullscreen}
                    />
                    {/* Slide-in panel from right */}
                    <div className={`absolute right-0 top-0 bottom-0 w-full bg-[#030504] border-l border-primary/30 flex flex-col transition-transform duration-300 ease-out ${isClosing ? 'translate-x-full' : isOpening ? 'translate-x-full' : 'translate-x-0'}`}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface-container-lowest shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                                    <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-primary' : 'bg-surface-container-high'}`} />
                                </div>
                                <span className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant/50 uppercase tracking-widest ml-1">
                                    SPECTAGLINT_TERMINAL
                                </span>
                                {isLive && <span className="text-primary text-[9px] animate-pulse">● LIVE</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearTerminal}
                                    className="text-[9px] font-['JetBrains_Mono'] text-on-surface-variant/30 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    <X size={9} /> CLR
                                </button>
                                <button
                                    onClick={closeFullscreen}
                                    className="w-7 h-7 flex items-center justify-center border border-outline-variant/30 hover:border-primary hover:text-primary transition-colors ml-1"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Full terminal content in modal */}
                        <TerminalContent scrollRef={mobileTerminalRef} className="flex-1" {...terminalProps} />

                    </div>
                </div>
            )}

            {/* ── ACTION TOAST MODAL */}
            {actionToast.open && (
                <div className="fixed inset-0 z-[100] flex md:items-center md:justify-center items-end bg-black/60 md:bg-black/80 backdrop-blur-sm transition-opacity">
                    <div className="bg-[#030504] border-t md:border border-outline-variant/20 w-full md:w-[400px] p-6 md:p-8 relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-2xl">
                        <button onClick={() => setActionToast({ open: false })} className="absolute top-4 right-4 text-on-surface-variant/50 hover:text-on-surface transition-colors">
                            <X size={16} />
                        </button>
                        <div className="flex flex-col items-center text-center mt-2">
                            <div className={`w-14 h-14 flex items-center justify-center rounded-full mb-5 bg-opacity-10 ${actionToast.type === 'error' ? 'bg-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-primary text-primary shadow-[0_0_20px_rgba(142,255,113,0.15)]'}`}>
                                <span className="material-symbols-outlined text-[32px]">{actionToast.type === 'error' ? 'warning' : 'check_circle'}</span>
                            </div>
                            <h3 className={`text-sm md:text-base font-black uppercase tracking-[0.1em] mb-3 font-['JetBrains_Mono'] ${actionToast.type === 'error' ? 'text-red-400' : 'text-primary'}`}>
                                {actionToast.title}
                            </h3>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant/60 uppercase tracking-wider font-['JetBrains_Mono'] leading-relaxed max-w-[280px]">
                                {actionToast.desc}
                            </p>
                            <button onClick={() => setActionToast({ open: false })} className={`mt-6 w-full py-3.5 border transition-all text-[10px] font-black uppercase tracking-widest font-['JetBrains_Mono'] active:scale-[0.98] ${actionToast.type === 'error' ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' : 'border-primary/20 text-primary hover:bg-primary/10'}`}>
                                ACKNOWLEDGE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// TerminalContent — defined OUTSIDE IntelligenceFeed intentionally.
// If defined inside the parent, React recreates the component type on every
// render, causing full unmount → broken refs, flicker, lost scroll position.
// All state is passed as explicit props; the component itself is pure/stable.
// ─────────────────────────────────────────────────────────────────────────────
const TerminalContent = ({
    scrollRef, height, className = '',
    logLines, serviceMode, isLive, isUploading, fileInputRef, handleFileSelect, clearTerminal
}) => {
    if (serviceMode === 'LIVE_ANSWERS') {
        return (
            <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-4 space-y-1.5 font-['JetBrains_Mono'] text-xs ${className}`} style={height ? { height } : undefined}>
                {logLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[120px] md:min-h-[200px] text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant/15 mb-2 md:mb-3"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        <div className="text-[9px] md:text-[10px] text-on-surface-variant/30 uppercase tracking-widest px-2">
                            {isLive ? 'CONNECTED — WAITING FOR AUDIO INPUT...' : 'TERMINAL IDLE — CAPTURE ENGINE OFFLINE'}
                        </div>
                        {isLive && (
                            <div className="flex items-center gap-1.5 mt-2 md:mt-3 text-primary/50 text-[8px] md:text-[9px]">
                                <span className="animate-pulse">▋</span> LISTENING...
                            </div>
                        )}
                    </div>
                ) : (
                    logLines.map(line => (
                        <div key={line.id} className="leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5 hover:border-primary/30 transition-all" dangerouslySetInnerHTML={{ __html: line.html }} />
                    ))
                )}
                {isLive && <div className="text-primary/70 text-[11px] pl-3 flex items-center gap-1 mt-1"><span className="animate-pulse">▋</span></div>}
            </div>
        );
    }

    if (serviceMode === 'LIVE_TRANSCRIPTION') {
        return (
            <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-5 font-mono text-xs tracking-wide ${className}`} style={height ? { height } : undefined}>
                {logLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[120px] md:min-h-[200px] text-center font-['JetBrains_Mono']">
                        <span className="material-symbols-outlined text-3xl md:text-4xl text-on-surface-variant/15 mb-2 md:mb-3">graphic_eq</span>
                        <div className="text-[9px] md:text-[10px] text-on-surface-variant/30 uppercase tracking-widest md:mb-1 px-2">
                            {isLive ? 'AWAITING VOCAL CAPTURE STREAM' : 'LIVE TRANSCRIPTION ENGINE OFFLINE'}
                        </div>
                        <div className="text-[7px] md:text-[8px] text-on-surface-variant/20 uppercase tracking-widest mt-1 md:mt-0">CONTINUOUS RAW TEXT OUTPUT</div>
                    </div>
                ) : (
                    <div className="text-on-surface-variant/80 font-['JetBrains_Mono'] leading-relaxed space-y-2 md:space-y-3">
                        {logLines.map(line => (
                            <div key={line.id} className="flex gap-3 md:gap-4 p-1.5 md:p-2 hover:bg-surface-container-high/30 transition-colors border-l-2 border-transparent hover:border-tertiary/40">
                                <span className="text-[8.5px] md:text-[9px] text-tertiary/40 shrink-0 mt-0.5">[{new Date().toISOString().substr(11, 8)}]</span>
                                <span dangerouslySetInnerHTML={{ __html: line.html }} />
                            </div>
                        ))}
                    </div>
                )}
                {isLive && (
                    <div className="text-tertiary text-[9px] md:text-[10px] font-['JetBrains_Mono'] flex items-center gap-2 mt-3 md:mt-4 ml-12 md:ml-[72px]">
                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-tertiary animate-pulse"></span> TRANSCRIBING...
                    </div>
                )}
            </div>
        );
    }

    if (serviceMode === 'FILE_ANSWERS' || serviceMode === 'FILE_TRANSCRIPTION') {
        const isTranscription = serviceMode === 'FILE_TRANSCRIPTION';
        const themeText = isTranscription ? 'text-tertiary' : 'text-primary';
        const themeBorderHover = isTranscription ? 'hover:border-tertiary/40' : 'hover:border-primary/40';
        const themeBgHover = isTranscription ? 'hover:bg-tertiary/5' : 'hover:bg-primary/5';
        const themeButtonCls = isTranscription
            ? 'border-tertiary text-tertiary hover:bg-tertiary hover:text-black'
            : 'border-primary  text-primary  hover:bg-primary  hover:text-black';
        const themeBorderColor = isTranscription ? 'border-tertiary/40' : 'border-primary/40';

        return (
            <div ref={scrollRef} className={`overflow-y-auto p-3 md:p-4 flex flex-col font-['JetBrains_Mono'] text-xs ${className}`} style={height ? { height } : undefined}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" className="hidden" />

                {/* Dropzone — only when idle and no results */}
                {!isUploading && logLines.length === 0 && (
                    <div onClick={() => fileInputRef.current?.click()} className={`flex-1 flex flex-col items-center justify-center min-h-[140px] md:min-h-[250px] border-2 border-dashed border-outline-variant/20 ${themeBorderHover} ${themeBgHover} transition-all cursor-pointer group p-4 md:p-8 text-center rounded-sm`}>
                        <span className={`material-symbols-outlined text-3xl md:text-5xl mb-2 md:mb-4 transition-transform group-hover:-translate-y-1 ${themeText}`}>{isTranscription ? 'description' : 'neurology'}</span>
                        <div className={`text-[11px] md:text-sm font-black uppercase tracking-widest mb-1 md:mb-2 ${themeText}`}>UPLOAD AUDIO MANIFEST</div>
                        <div className="text-[8px] md:text-[10px] text-on-surface-variant/50 tracking-wider mb-3 md:mb-6 max-w-[280px]">
                            Drop your recorded {isTranscription ? 'audio file for bulk high-fidelity transcription' : 'meeting here to extract Q&A insights'} or click to browse.
                        </div>
                        <button className={`px-4 md:px-5 py-2 md:py-2.5 bg-transparent border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${themeButtonCls}`}>SELECT LOCAL FILE</button>
                        <div className="text-[7px] md:text-[8px] text-on-surface-variant/30 mt-2 md:mt-4 uppercase tracking-widest">SUPPORTED FORMATS: .MP3 .WAV .M4A</div>
                    </div>
                )}

                {/* Uploading spinner */}
                {isUploading && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-pulse min-h-[140px] md:min-h-[250px] border border-outline-variant/20 p-4 md:p-8 bg-[#0a0f0d]">
                        <span className={`material-symbols-outlined text-3xl md:text-5xl mb-3 md:mb-4 animate-spin ${themeText}`}>autorenew</span>
                        <div className="text-[10px] md:text-[12px] text-on-surface font-black uppercase tracking-widest mb-1">PROCESSING SECURE PAYLOAD...</div>
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 tracking-widest uppercase text-center max-w-[250px]">Uploading and decoding structural audio data. Please keep window open.</div>
                    </div>
                )}

                {/* Results */}
                {!isUploading && logLines.length > 0 && (
                    <>
                        <div className={`flex items-center justify-between mb-2 md:mb-3 pb-2 border-b ${themeBorderColor} shrink-0`}>
                            <div className={`text-[9px] uppercase tracking-widest font-black ${themeText}`}>{logLines.length} BLOCK{logLines.length !== 1 ? 'S' : ''} DECODED</div>
                            <button onClick={clearTerminal} className={`text-[8px] uppercase tracking-widest border px-2.5 py-1 transition-colors ${themeButtonCls}`}>↑ NEW UPLOAD</button>
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                            {logLines.map(line => (
                                <div key={line.id} className={`leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5 transition-all ${isTranscription ? 'hover:border-tertiary/30' : 'hover:border-primary/30'}`} dangerouslySetInnerHTML={{ __html: line.html }} />
                            ))}
                        </div>
                    </>
                )}

                {/* Standby card */}
                {!isUploading && logLines.length === 0 && (
                    <div className="mt-2 md:mt-4 p-2.5 md:p-4 border border-outline-variant/10 bg-[#0a0f0d] flex items-center justify-between opacity-50 grayscale pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="material-symbols-outlined text-[16px] md:text-[24px] text-on-surface-variant">audio_file</span>
                            <div>
                                <div className="text-[9px] md:text-[10px] text-on-surface font-bold uppercase tracking-widest">AWAITING_UPLOAD.WAV</div>
                                <div className="text-[7px] md:text-[8px] text-on-surface-variant/50 uppercase">0 MB / 0 MB</div>
                            </div>
                        </div>
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/40">STANDBY</div>
                    </div>
                )}
            </div>
        );
    }

    return null;
};

// ── Terminal header bar (shared between desktop and mobile)
const TerminalHeader = ({ isLive, onClear }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/15 bg-surface-container-lowest shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-primary' : 'bg-surface-container-high'}`} />
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/40 uppercase tracking-widest ml-1">
                SPECTAGLINT_TERMINAL — AUDIO_UPLINK
            </span>
        </div>
        <button
            onClick={onClear}
            className="text-[9px] font-['JetBrains_Mono'] text-on-surface-variant/30 hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1"
        >
            <X size={10} /> CLEAR
        </button>
    </div>
);

// ── Right panel: Active Session Analytics & Routing
const ActiveSessionPanel = ({ logLines, isLive, onClear, serviceMode, setServiceMode, onExport }) => {
    const MODES = [
        { id: 'LIVE_ANSWERS', icon: 'chat', label: 'LIVE AI ANSWERS', desc: 'Real-time Q&A via Ext.' },
        { id: 'LIVE_TRANSCRIPTION', icon: 'closed_caption', label: 'LIVE TRANSCRIPTION', desc: 'Real-time text feed' },
        { id: 'FILE_ANSWERS', icon: 'audio_file', label: 'FILE AI ANSWERS', desc: 'Upload audio for Q&A' },
        { id: 'FILE_TRANSCRIPTION', icon: 'description', label: 'FILE TRANSCRIPTION', desc: 'Upload audio to text' }
    ];

    return (
        <div className="flex flex-col gap-[10px] md:gap-4 h-full">
            {/* SERVICE ROUTING MODE */}
            <div className="bg-surface-container border border-outline-variant/20 p-3 md:p-5 font-['JetBrains_Mono'] relative overflow-hidden group shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                <div className="relative z-10 flex items-center mb-3">
                    <span className="material-symbols-outlined text-primary text-sm mr-2">settings_suggest</span>
                    <span className="text-[10px] font-black uppercase text-on-surface tracking-widest">OPERATION PROTOCOL</span>
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MODES.map(mode => {
                        const isActive = serviceMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setServiceMode && setServiceMode(mode.id)}
                                className={`flex items-start gap-2.5 p-2.5 border text-left transition-all ${isActive
                                    ? 'bg-primary/5 border-primary shadow-[0_0_10px_rgba(142,255,113,0.05)]'
                                    : 'bg-[#030504] border-outline-variant/10 hover:border-primary/40'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-base mt-0.5 ${isActive ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                                    {mode.icon}
                                </span>
                                <div>
                                    <div className={`text-[9.5px] font-black uppercase tracking-widest mb-0.5 mt-0.5 ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                                        {mode.label}
                                    </div>
                                    <div className="text-[7.5px] text-on-surface-variant/50 uppercase leading-snug">
                                        {mode.desc}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* REAL-TIME SESSION METRICS */}
            <div className="bg-surface-container border border-outline-variant/20 p-3 md:p-4 font-['JetBrains_Mono'] flex-1 min-h-[140px] md:min-h-[200px]">
                <h3 className="text-[10px] font-black uppercase text-on-surface-variant/50 tracking-[0.2em] mb-2 md:mb-4 flex items-center gap-2">
                    LIVE_SESSION_TELEMETRY <Activity size={12} className={isLive ? "text-primary animate-pulse" : "text-outline-variant/50"} />
                </h3>

                <div className="grid grid-cols-2 gap-2 md:gap-3 h-[calc(100%-24px)] md:h-[calc(100%-30px)]">
                    <div className="border border-outline-variant/10 p-2 md:p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                        <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1 md:mb-2">PACKETS_PROCESSED</div>
                        <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-on-surface' : 'text-on-surface-variant/30'}`}>{isLive ? (logLines.length * 14) : 0}</div>
                    </div>
                    <div className="border border-outline-variant/10 p-2 md:p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                        <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1 md:mb-2">ACTIVE_LATENCY</div>
                        <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-tertiary shadow-sm' : 'text-on-surface-variant/30'}`}>{isLive ? '14ms' : '---'}</div>
                    </div>
                    <div className="border border-outline-variant/10 p-2 md:p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                        <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1 md:mb-2">NOISE_FLOOR</div>
                        <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-primary' : 'text-on-surface-variant/30'}`}>{isLive ? '-45dB' : 'IDLE'}</div>
                    </div>
                    <div className="border border-outline-variant/10 p-2 md:p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                        <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1 md:mb-2">VAD_CONFIDENCE</div>
                        <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-on-surface' : 'text-on-surface-variant/30'}`}>{isLive ? '99.4%' : '0.0%'}</div>
                    </div>
                </div>
            </div>

            {/* QUICK CONTROLS */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
                <button onClick={onExport} className="flex items-center justify-center gap-2 py-3 border border-outline-variant/20 text-on-surface-variant text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/50 transition-all bg-[#0a0f0d] active:scale-[0.98] group">
                    <span className="material-symbols-outlined text-sm group-hover:-translate-y-0.5 transition-transform">download</span>
                    EXPORT_LOG
                </button>
                <button onClick={onClear} className="flex items-center justify-center gap-2 py-3 border border-outline-variant/20 text-on-surface-variant text-[10px] font-black uppercase tracking-widest hover:text-red-400 hover:border-red-400/50 transition-all bg-[#0a0f0d] active:scale-[0.98] group">
                    <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">delete</span>
                    PURGE_CACHE
                </button>
            </div>
        </div>
    );
};

export default IntelligenceFeed;
