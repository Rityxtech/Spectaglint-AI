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
    const [extStatus, setExtStatus] = useState('IDLE'); // 'IDLE' | 'LIVE' | 'STOPPED'
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
                // SSE will automatically attempt reconnection
            };
        };

        connectSSE();

        return () => {
            if (eventSource) eventSource.close();
        };
    }, []);

    const clearTerminal = () => setLogLines([]);

    if (loading) return <TechLoader />;

    const isLive = extStatus === 'LIVE';

    const handleToggle = (e) => {
        const turningOn = e.target.checked;
        if (turningOn) {
            window.postMessage({ type: 'START_EAR' }, '*');
        } else {
            window.postMessage({ type: 'STOP_EAR' }, '*');
        }
    };

    // ── Reusable terminal body content
    const TerminalContent = ({ scrollRef, height }) => (
        <div
            ref={scrollRef}
            className="overflow-y-auto p-4 space-y-1.5 font-['JetBrains_Mono'] text-xs"
            style={{ height }}
        >
            {logLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <TerminalIcon size={28} className="text-on-surface-variant/15 mb-3" />
                    <div className="text-[10px] text-on-surface-variant/30 uppercase tracking-widest">
                        {isLive ? 'CONNECTED — WAITING FOR AUDIO INPUT...' : 'TERMINAL IDLE — CAPTURE ENGINE OFFLINE'}
                    </div>
                    {isLive && (
                        <div className="flex items-center gap-1.5 mt-3 text-primary/50 text-[9px]">
                            <span className="animate-pulse">▋</span> LISTENING...
                        </div>
                    )}
                </div>
            ) : (
                logLines.map(line => (
                    <div
                        key={line.id}
                        className="leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5 hover:border-primary/30 transition-all"
                        dangerouslySetInnerHTML={{ __html: line.html }}
                    />
                ))
            )}
            {isLive && (
                <div className="text-primary/70 text-[11px] pl-3 flex items-center gap-1 mt-1">
                    <span className="animate-pulse">▋</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-[10px] md:gap-4">

            <PageHeader
                title="LIVE_INTELLIGENCE"
                label="MODULE // LIVE_FEED"
                description="Secure real-time neural uplink. Monitor translated insights and transcriptions as they stream directly from your local environment."
                mobileDescription="Monitor translated insights and transcriptions streaming from your environment."
            />

            {/* ── STATUS BANNER */}
            <div className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border font-['JetBrains_Mono'] text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-500 ${isLive
                ? 'bg-primary/5 border-primary/40 text-primary'
                : 'bg-red-900/10 border-red-800/40 text-red-400'
                }`}>
                <div className="flex items-center gap-2">
                    <span
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: isLive ? '#8eff71' : '#ef4444',
                            boxShadow: isLive ? '0 0 8px rgba(142,255,113,0.8)' : '0 0 8px rgba(239,68,68,0.5)',
                            animation: isLive ? 'pulse 1.5s infinite' : 'pulse 2s infinite'
                        }}
                    />
                    <span className="truncate hidden sm:inline">
                        {isLive ? '● ENGINE ACTIVE — CAPTURING' : '■ ENGINE OFFLINE — ACTIVATE TO BEGIN'}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 border-r border-current/20 pr-3">
                        <span className={`font-black text-[10px] md:text-sm tracking-widest ${isLive ? 'text-primary' : 'text-on-surface'}`}>{isLive ? 'STREAM_ON' : 'STREAM_OFF'}</span>
                        <label className="relative inline-flex items-center cursor-pointer ml-1 md:ml-2">
                            <input type="checkbox" className="sr-only peer" checked={isLive} onChange={handleToggle} />
                            <div className="w-12 h-6 md:w-16 md:h-8 bg-surface-container-highest peer-focus:outline-none border border-outline-variant/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#0a0f0d] after:content-[''] after:absolute after:top-[2px] after:left-[2px] md:after:left-[3px] after:bg-outline-variant/50 after:border-outline-variant/50 after:border after:rounded-full after:h-5 after:w-5 md:after:h-7 md:after:w-7 after:transition-all peer-checked:bg-primary peer-checked:after:bg-[#0a0f0d] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] cursor-pointer"></div>
                        </label>
                    </div>
                    {isLive && <Radio size={12} className="animate-pulse hidden md:block" />}
                    {!isLive && <WifiOff size={12} className="opacity-40 hidden md:block" />}
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
            <div className="hidden md:grid md:grid-cols-12 gap-6">

                {/* Left: Terminal */}
                <div className="md:col-span-7 flex flex-col">
                    <div className="bg-[#030504] border border-outline-variant/20 flex flex-col">
                        <TerminalHeader isLive={isLive} onClear={clearTerminal} />
                        <TerminalContent scrollRef={terminalRef} height="calc(100vh - 340px)" />
                    </div>
                </div>

                {/* Right: Active Telemetry / Trans Matrix */}
                <div className="md:col-span-5 flex flex-col gap-3">
                    <ActiveSessionPanel logLines={logLines} isLive={isLive} onClear={clearTerminal} />
                </div>
            </div>

            {/* ── MOBILE LAYOUT: stacked */}
            <div className="md:hidden flex flex-col gap-[10px]">

                {/* Mobile terminal — compact height */}
                <div className="bg-[#030504] border border-outline-variant/20 flex flex-col">
                    <TerminalHeader isLive={isLive} onClear={clearTerminal} />
                    <TerminalContent scrollRef={mobileTerminalRef} height="55vw" />
                </div>

                {/* Mobile Session Metrics */}
                <ActiveSessionPanel logLines={logLines} isLive={isLive} onClear={clearTerminal} />
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
                        <div
                            ref={mobileTerminalRef}
                            className="flex-1 overflow-y-auto p-4 space-y-2 font-['JetBrains_Mono'] text-xs"
                        >
                            {logLines.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center min-h-[300px]">
                                    <TerminalIcon size={32} className="text-on-surface-variant/15 mb-3" />
                                    <div className="text-[10px] text-on-surface-variant/30 uppercase tracking-widest">
                                        {isLive ? 'CONNECTED — WAITING FOR AUDIO...' : 'ACTIVATE EXTENSION TO BEGIN'}
                                    </div>
                                </div>
                            ) : (
                                logLines.map(line => (
                                    <div
                                        key={line.id}
                                        className="leading-relaxed border-l-2 border-outline-variant/10 pl-3 py-0.5"
                                        dangerouslySetInnerHTML={{ __html: line.html }}
                                    />
                                ))
                            )}
                            {isLive && (
                                <div className="text-primary/70 text-[11px] pl-3 flex items-center gap-1 mt-1">
                                    <span className="animate-pulse">▋</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
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
const ActiveSessionPanel = ({ logLines, isLive, onClear }) => (
    <div className="flex flex-col gap-[10px] md:gap-4 h-full">
        {/* ACTIVE TRANSLATION ROUTING */}
        <div className="bg-surface-container border border-outline-variant/20 p-4 md:p-6 font-['JetBrains_Mono'] relative overflow-hidden group shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
            <div className="relative z-10 flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-sm">swap_horiz</span>
                <span className="text-[10px] font-black uppercase text-on-surface tracking-widest">TRANSLATION ROUTING MATRIX</span>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 border border-outline-variant/10 bg-[#030504] p-3 md:p-4 shadow-inner">
                <div className="w-full md:w-auto">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1">SOURCE_AUDIO</div>
                    <div className="text-sm md:text-base font-bold text-on-surface flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-tertiary shadow-[0_0_5px_rgba(255,255,255,0.4)] animate-pulse' : 'bg-on-surface-variant/20'}`} />
                        AUTO-DETECT (ANY)
                    </div>
                </div>
                <span className="material-symbols-outlined text-outline-variant/50 hidden md:block rotate-90 md:rotate-0">arrow_right_alt</span>
                <div className="relative w-full md:w-auto text-left md:text-right border-t md:border-t-0 md:border-l border-outline-variant/10 pt-2 md:pt-0 md:pl-4">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-1 md:text-right">TARGET_OUTPUT</div>
                    <div className="text-sm md:text-base font-bold text-primary flex items-center justify-start md:justify-end gap-2">
                        ENGLISH (US)
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-primary shadow-[0_0_5px_rgba(142,255,113,0.4)]' : 'bg-on-surface-variant/20'}`} />
                    </div>
                </div>
            </div>
        </div>

        {/* REAL-TIME SESSION METRICS */}
        <div className="bg-surface-container border border-outline-variant/20 p-4 font-['JetBrains_Mono'] flex-1 min-h-[200px]">
            <h3 className="text-[10px] font-black uppercase text-on-surface-variant/50 tracking-[0.2em] mb-4 flex items-center gap-2">
                LIVE_SESSION_TELEMETRY <Activity size={12} className={isLive ? "text-primary animate-pulse" : "text-outline-variant/50"} />
            </h3>

            <div className="grid grid-cols-2 gap-3 h-[calc(100%-30px)]">
                <div className="border border-outline-variant/10 p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-2">PACKETS_PROCESSED</div>
                    <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-on-surface' : 'text-on-surface-variant/30'}`}>{isLive ? (logLines.length * 14) : 0}</div>
                </div>
                <div className="border border-outline-variant/10 p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-2">ACTIVE_LATENCY</div>
                    <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-tertiary shadow-sm' : 'text-on-surface-variant/30'}`}>{isLive ? '14ms' : '---'}</div>
                </div>
                <div className="border border-outline-variant/10 p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-2">NOISE_FLOOR</div>
                    <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-primary' : 'text-on-surface-variant/30'}`}>{isLive ? '-45dB' : 'IDLE'}</div>
                </div>
                <div className="border border-outline-variant/10 p-3 bg-[#030504] flex flex-col justify-center transition-colors">
                    <div className="text-[9px] text-on-surface-variant/40 uppercase mb-2">VAD_CONFIDENCE</div>
                    <div className={`text-xl md:text-2xl font-bold ${isLive ? 'text-on-surface' : 'text-on-surface-variant/30'}`}>{isLive ? '99.4%' : '0.0%'}</div>
                </div>
            </div>
        </div>

        {/* QUICK CONTROLS */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
            <button className="flex items-center justify-center gap-2 py-3 border border-outline-variant/20 text-on-surface-variant text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/50 transition-all bg-[#0a0f0d] active:scale-[0.98] group">
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

export default IntelligenceFeed;
