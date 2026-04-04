import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
    MessageSquare,
    Copy,
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
    // ── DB-backed AI response cards
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const liveItemsRef = useRef([]);

    // ── Real-time terminal log lines streamed from extension
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

    // ── Merge DB results with extension-pushed live items
    const mergeResponses = (dbItems) => {
        const filtered = liveItemsRef.current.filter(live =>
            !dbItems.some(db => db.question === live.question && db.answer === live.answer)
        );
        return [...filtered, ...dbItems];
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 8000);

        let eventSource;

        const connectSSE = async () => {
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
                    if (data.type === 'EXTENSION_AI_RESPONSE') {
                        const newResponse = data.payload;
                        const alreadyExists = liveItemsRef.current.some(
                            r => r.question === newResponse.question && r.answer === newResponse.answer
                        );
                        if (!alreadyExists) {
                            liveItemsRef.current = [newResponse, ...liveItemsRef.current];
                            setResponses(prev => {
                                if (prev.some(r => r.question === newResponse.question && r.answer === newResponse.answer)) return prev;
                                return [newResponse, ...prev];
                            });
                        }
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
            clearInterval(interval);
            if (eventSource) eventSource.close();
        };
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getAIResponses(1, 20);
            setResponses(mergeResponses(data.responses || []));
        } catch (err) {
            console.error('Failed to pull intelligence feed:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => navigator.clipboard.writeText(text);
    const clearTerminal = () => setLogLines([]);

    if (loading) return <TechLoader />;

    const isLive = extStatus === 'LIVE';

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
                        {isLive ? 'CONNECTED — WAITING FOR AUDIO INPUT...' : 'TERMINAL IDLE — ACTIVATE EXTENSION TO BEGIN'}
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
                description="Secure real-time neural uplink. Monitor AI-generated insights and transcriptions as they stream from your active meeting nodes."
                mobileDescription="Monitor AI insights and transcriptions streaming from your active meeting nodes."
            />

            {/* ── STATUS BANNER */}
            <div className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border font-['JetBrains_Mono'] text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-500 ${isLive
                ? 'bg-primary/5 border-primary/40 text-primary'
                : extStatus === 'STOPPED'
                    ? 'bg-red-900/5 border-red-800/30 text-red-400'
                    : 'bg-surface-container border-outline-variant/20 text-on-surface-variant/50'
                }`}>
                <div className="flex items-center gap-2">
                    <span
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0"
                        style={{
                            backgroundColor: isLive ? '#8eff71' : extStatus === 'STOPPED' ? '#ef4444' : '#475569',
                            boxShadow: isLive ? '0 0 8px rgba(142,255,113,0.8)' : 'none',
                            animation: isLive ? 'pulse 1.5s infinite' : 'none'
                        }}
                    />
                    <span className="truncate">
                        {isLive ? '● EXTENSION ACTIVE — CAPTURING AUDIO' : extStatus === 'STOPPED' ? '■ SESSION ENDED — OFFLINE' : '○ AWAITING EXTENSION ACTIVATION'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isLive && <Radio size={10} className="animate-pulse" />}
                    {!isLive && <WifiOff size={10} className="opacity-40" />}
                    {/* Mobile fullscreen button */}
                    <button
                        onClick={openFullscreen}
                        className="md:hidden flex items-center gap-1 text-[9px] uppercase tracking-widest border border-current/30 px-2 py-1 hover:bg-current/10 transition-colors ml-2"
                        title="Fullscreen terminal"
                    >
                        <Maximize2 size={10} /> EXPAND
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

                {/* Right: AI cards + telemetry */}
                <div className="md:col-span-5 flex flex-col gap-3">
                    <ResponsesPanel responses={responses} onCopy={copyToClipboard} logLines={logLines} isLive={isLive} />
                </div>
            </div>

            {/* ── MOBILE LAYOUT: stacked */}
            <div className="md:hidden flex flex-col gap-[10px]">

                {/* Mobile terminal — compact height */}
                <div className="bg-[#030504] border border-outline-variant/20 flex flex-col">
                    <TerminalHeader isLive={isLive} onClear={clearTerminal} />
                    <TerminalContent scrollRef={mobileTerminalRef} height="55vw" />
                </div>

                {/* Mobile AI response cards */}
                <ResponsesPanel responses={responses} onCopy={copyToClipboard} logLines={logLines} isLive={isLive} />
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

                        {/* Bottom AI response strip */}
                        <div className="shrink-0 border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
                            <div className="text-[9px] font-['JetBrains_Mono'] text-on-surface-variant/40 uppercase tracking-widest mb-2">
                                AI_RESPONSES // {responses.length} LOGGED
                            </div>
                            <div className="space-y-2 max-h-52 overflow-y-auto">
                                {responses.length === 0 ? (
                                    <p className="text-[9px] text-on-surface-variant/30 italic">No AI responses yet.</p>
                                ) : (
                                    responses.map((res, i) => (
                                        <div key={res.id || i} className="bg-surface-container border border-outline-variant/15 p-2 rounded-sm">
                                            <p className="text-[9px] text-on-surface-variant/50 italic mb-1 truncate">"{res.question}"</p>
                                            <p className="text-[11px] text-on-surface/80 leading-snug line-clamp-3">{res.answer}</p>
                                        </div>
                                    ))
                                )}
                            </div>
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

// ── Right panel: response cards + telemetry
const ResponsesPanel = ({ responses, onCopy, logLines, isLive }) => (
    <>
        <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-primary" />
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                AI_RESPONSES // {responses.length} LOGGED
            </span>
        </div>

        <div className="space-y-[10px] md:space-y-3">
            {responses.length === 0 ? (
                <div className="border border-dashed border-outline-variant/20 p-8 flex flex-col items-center justify-center text-center">
                    <MessageSquare size={28} className="mb-3 text-on-surface-variant/20" />
                    <div className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-on-surface-variant/30">
                        NO_AI_RESPONSES_YET
                    </div>
                    <p className="text-[9px] text-on-surface-variant/20 mt-1.5 max-w-[160px]">
                        Questions detected during the session will appear here.
                    </p>
                </div>
            ) : (
                responses.map((res, i) => (
                    <IntelligenceCard key={res.id || i} data={res} onCopy={() => onCopy(res.answer)} />
                ))
            )}
        </div>

        <div className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-4 font-['JetBrains_Mono']">
            <h3 className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-[0.2em] mb-3 flex items-center gap-2">
                SYSTEM_TELEMETRY <Activity size={10} className="text-primary" />
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-2 gap-3">
                <div>
                    <div className="text-[9px] text-on-surface-variant/30 uppercase mb-1">SESSION_LOG</div>
                    <div className="text-sm font-bold text-on-surface">{logLines.length}</div>
                </div>
                <div>
                    <div className="text-[9px] text-on-surface-variant/30 uppercase mb-1">AI_ANSWERS</div>
                    <div className="text-sm font-bold text-primary">{responses.length}</div>
                </div>
                <div>
                    <div className="text-[9px] text-on-surface-variant/30 uppercase mb-1">NODE</div>
                    <div className="text-[11px] font-bold text-on-surface">GROQ</div>
                </div>
                <div>
                    <div className="text-[9px] text-on-surface-variant/30 uppercase mb-1">STATUS</div>
                    <div className={`text-[11px] font-bold ${isLive ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                        {isLive ? 'LIVE' : 'IDLE'}
                    </div>
                </div>
            </div>
        </div>
    </>
);

// ── Individual AI response card
const IntelligenceCard = ({ data, onCopy }) => (
    <div className="group relative bg-[#0a0f0d] border border-outline-variant/20 hover:border-primary/30 transition-all duration-300">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
        <div className="p-3 md:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <div className="px-1.5 py-0.5 bg-primary/5 border border-primary/20 text-primary text-[8px] font-bold uppercase tracking-widest font-['JetBrains_Mono']">
                        AI_RESPONSE
                    </div>
                    <span className="text-[9px] font-['JetBrains_Mono'] text-on-surface-variant/30 uppercase">
                        {new Date(data.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <button onClick={onCopy} className="p-1 hover:bg-surface-container-high transition-colors text-on-surface-variant/30 hover:text-primary rounded-sm">
                    <Copy size={12} />
                </button>
            </div>
            <div className="mb-2 bg-surface-container-high/20 p-2 border-l border-outline-variant/20">
                <div className="text-[8px] font-['JetBrains_Mono'] text-on-surface-variant/30 uppercase mb-1">DETECTED_QUESTION</div>
                <p className="text-[11px] font-['Inter'] text-on-surface/70 italic leading-snug">"{data.question}"</p>
            </div>
            <div className="text-[12px] font-['Inter'] text-on-surface/90 leading-relaxed">
                {data.answer}
            </div>
        </div>
    </div>
);

export default IntelligenceFeed;
