import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';
import { api } from '../lib/api';

/* ── Animated counter hook ── */
function useCounter(target, duration = 1200) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / (duration / 16));
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setVal(target); clearInterval(timer); }
            else setVal(start);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return val;
}

/* ── Bar chart component ── */
const BarChart = () => {
    const bars = [40, 70, 55, 90, 65, 80, 45, 95, 60, 75, 50, 85];
    return (
        <div className="flex items-end gap-1 h-20">
            {bars.map((h, i) => (
                <div
                    key={i}
                    className="flex-1 bg-primary/80 rounded-sm transition-all duration-700"
                    style={{ height: `${h}%`, animationDelay: `${i * 60}ms`, boxShadow: h > 70 ? '0 0 6px rgba(142,255,113,0.5)' : 'none' }}
                />
            ))}
        </div>
    );
};

/* ── Extension connection status ── */
function useExtensionStatus() {
    const [connected, setConnected] = useState(false);
    const [installUrl, setInstallUrl] = useState('');
    const [installInstructions, setInstallInstructions] = useState([]);

    useEffect(() => {
        // Attempt to communicate with extension via postMessage / window check
        // In production this would use chrome.runtime.sendMessage
        // For now we simulate based on whether chrome.runtime is available
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                setConnected(true);
            }
        } catch {
            setConnected(false);
        }

        // Fetch extension install info
        fetchExtensionInstallInfo();
    }, []);

    async function fetchExtensionInstallInfo() {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app'}/extension/install-info`);
            if (response.ok) {
                const data = await response.json();
                setInstallUrl(data.downloadUrl);
                setInstallInstructions(data.instructions);
            }
        } catch (err) {
            console.error('Failed to fetch extension install info:', err);
        }
    };

    const downloadExtension = () => {
        // Redirect to the dedicated installation page
        window.location.href = '/install-extension';
    };

    return { connected, downloadExtension };
}

/* ══════════════════════════════════════════
    DASHBOARD PAGE
═════════════════════════════════════════ */
const Dashboard = () => {
    const [stats, setStats] = useState({
        totalMeetings: 0,
        totalQuestions: 0,
        coinsRemaining: 0
    });
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { connected: extensionOnline, downloadExtension } = useExtensionStatus();
    const [filter, setFilter] = useState('all');
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    // Use counters for animation
    const meetingsCount = useCounter(stats.totalMeetings);
    const questionsCount = useCounter(stats.totalQuestions);
    const coinsCount = useCounter(stats.coinsRemaining);

    const filteredMeetings = meetings.filter(m => {
        if (filter === 'all') return true;
        if (filter === 'active') return m.status === 'active';
        if (filter === 'inactive') return m.status !== 'active';
        return true;
    });

    useEffect(() => {
        loadDashboardData();
        // Set up polling for live updates every 30 seconds
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setError(null);
            const [meetingStats, aiStats, walletData, meetingsData] = await Promise.all([
                api.getMeetingStats(),
                api.getAIStats(),
                api.getWallet(),
                api.getMeetings(1, 10) // Get first 10 meetings for recent activity
            ]);

            setStats({
                totalMeetings: meetingStats.total_meetings,
                totalQuestions: aiStats.total_questions,
                coinsRemaining: walletData.wallet.balance
            });

            setMeetings(meetingsData.meetings.map(m => ({
                date: new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(),
                time: new Date(m.created_at).toLocaleTimeString('en-US', { hour12: false, timeZone: 'GMT' }).slice(0, -3) + ' GMT',
                title: m.title.toUpperCase(),
                duration: formatDuration(m.duration_seconds),
                participants: m.participant_count || 0,
                active: m.status === 'active'
            })));
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0M 0S';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}H ${minutes}M`;
        return `${minutes}M ${secs}S`;
    };

    if (loading) {
        return (
            <TechLoader
                title="LOADING_TERMINAL_DATA"
                subtitle="LOADING_DASHBOARD_METRICS..."
                size="small"
                progress={65}
            />
        );
    }

    if (error) {
        return (
            <div className="w-full pb-0 space-y-[10px] md:space-y-8">
                <PageHeader
                    title="TERMINAL_CONTROL"
                    label="SYSTEM // OVERVIEW"
                    description="Aggregated neural telemetry and session health metrics. Monitor global meeting activity and system-wide coin distribution from this command hub."
                    mobileDescription="Monitor global meeting activity and system-wide coin distribution from this command hub."
                />
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="text-red-400 text-sm mb-4">{error}</div>
                        <button
                            onClick={loadDashboardData}
                            className="px-4 py-2 bg-primary text-black text-sm font-black uppercase tracking-widest hover:bg-primary-dim transition-colors"
                        >
                            RETRY
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full pb-0 space-y-[10px] md:space-y-8">
            <PageHeader
                title="TERMINAL_CONTROL"
                label="SYSTEM // OVERVIEW"
                description="Aggregated neural telemetry and session health metrics. Monitor global meeting activity and system-wide coin distribution from this command hub."
                mobileDescription="Monitor global meeting activity and system-wide coin distribution from this command hub."
            />
            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] md:gap-4">

                {/* Card 1 – Meetings */}
                <div className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-4 relative overflow-hidden group hover:border-outline-variant/50 transition-colors">
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                        <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase tracking-widest">TOTAL MEETINGS ATTENDED</span>
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/10 group-hover:text-on-surface-variant/20 transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
                    </div>
                    <div className="font-headline font-black text-3xl md:text-5xl text-on-surface mb-1 md:mb-3">{meetingsCount}</div>
                    <div className="h-0.5 w-full bg-surface-container-high mb-1 overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: '100%' }} />
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-primary uppercase tracking-widest">SYNC_COMPLETE // 100%</span>
                </div>

                {/* Card 2 – Questions */}
                <div className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-4 relative overflow-hidden group hover:border-outline-variant/50 transition-colors">
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                        <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase tracking-widest">QUESTIONS ANSWERED</span>
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/10 group-hover:text-on-surface-variant/20 transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
                    </div>
                    <div className="font-headline font-black text-3xl md:text-5xl text-on-surface mb-1 md:mb-3">{questionsCount}</div>
                    <div className="h-0.5 w-full bg-surface-container-high mb-1 overflow-hidden">
                        <div className="h-full bg-tertiary transition-all duration-1000" style={{ width: '78%' }} />
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary uppercase tracking-widest">CONFIDENCE_LEVEL // HIGH</span>
                </div>

                {/* Card 3 – Coins */}
                <div className="bg-surface-container border border-primary/30 p-[10px] md:p-4 relative overflow-hidden group hover:border-primary/60 transition-colors shadow-[0_0_20px_rgba(142,255,113,0.05)]">
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                        <span className="font-['JetBrains_Mono'] text-[10px] text-primary/70 uppercase tracking-widest">COINS REMAINING</span>
                        <span className="material-symbols-outlined text-3xl text-primary/20 group-hover:text-primary/30 transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>toll</span>
                    </div>
                    <div className="font-headline font-black text-3xl md:text-5xl text-primary mb-1 md:mb-3" style={{ textShadow: '0 0 20px rgba(142,255,113,0.4)' }}>
                        {coinsCount}c
                    </div>
                    <div className="h-0.5 w-full bg-surface-container-high mb-1 overflow-hidden">
                        <div className="h-full bg-primary/60 transition-all duration-1000" style={{ width: '45%' }} />
                    </div>
                    <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase tracking-widest">SYSTEM_AUTONOMOUS_LIMIT: REACHED</span>
                </div>
            </div>

            {/* ── RECENT ACTIVITY FEED ── */}
            <div>
                <div className="flex items-center justify-between mb-[-5px] md:mb-[5px]">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-primary" />
                        <h2 className="font-headline font-black text-lg text-on-surface uppercase tracking-widest whitespace-nowrap">
                            <span className="md:hidden">RECENT ACTIVITY</span>
                            <span className="hidden md:inline">RECENT ACTIVITY FEED</span>
                        </h2>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase tracking-widest">FILTER:</span>
                        <div className="relative">
                            <select
                                className="bg-surface-container-high/50 border border-outline-variant/30 text-on-surface font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest px-3 py-2 pr-8 appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none transition-colors"
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                            >
                                <option value="all">ALL SESSIONS</option>
                                <option value="active">ACTIVE ONLY</option>
                                <option value="inactive">ARCHIVED ONLY</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant/50 pointer-events-none">expand_more</span>
                        </div>
                    </div>
                    <div className="md:hidden relative">
                        <button
                            onClick={() => setShowMobileFilter(!showMobileFilter)}
                            className={`material-symbols-outlined text-[35px] transition-colors ${showMobileFilter ? 'text-primary' : 'text-on-surface-variant/50'}`}
                        >
                            tune
                        </button>
                        {showMobileFilter && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMobileFilter(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 bg-surface-container border border-outline-variant/30 shadow-lg z-[45] min-w-[160px]">
                                    <div className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant/50 uppercase tracking-widest px-3 py-2 border-b border-outline-variant/20">
                                        FILTER BY
                                    </div>
                                    <button
                                        onClick={() => { setFilter('all'); setShowMobileFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'all' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ALL SESSIONS
                                    </button>
                                    <button
                                        onClick={() => { setFilter('active'); setShowMobileFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'active' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ACTIVE ONLY
                                    </button>
                                    <button
                                        onClick={() => { setFilter('inactive'); setShowMobileFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'inactive' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ARCHIVED ONLY
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="border border-outline-variant/20 divide-y divide-outline-variant/10">
                    {filteredMeetings.map((m, i) => (
                        <div key={i} className={`flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-6 py-4 md:py-5 bg-surface-container-lowest hover:bg-surface-container-low transition-colors group ${i >= 3 ? 'hidden md:flex' : ''}`}>

                            {/* Mobile: Title and status dot */}
                            <div className="md:hidden flex items-center gap-2 mb-2">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                        backgroundColor: m.active ? '#8eff71' : '#ff7351',
                                        boxShadow: m.active ? '0 0 6px rgba(142,255,113,0.6)' : 'none'
                                    }}
                                />
                                <h3 className="font-headline font-black text-sm text-on-surface uppercase tracking-tight">{m.title}</h3>
                            </div>

                            {/* Mobile: Date/Time and CTA in same row */}
                            <div className="md:hidden flex justify-between items-center mb-2">
                                <div>
                                    <div className="font-['JetBrains_Mono'] text-[8px] text-on-surface-variant/50 uppercase mb-0.5">{m.date}</div>
                                    <div className="font-headline font-black text-xs text-on-surface">{m.time}</div>
                                </div>
                                <Link
                                    to="/history"
                                    className="shrink-0 px-3 py-2 border border-outline-variant/40 text-on-surface font-['Inter'] font-black uppercase text-[10px] tracking-widest hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                </Link>
                            </div>

                            {/* Desktop: Date / Time + Title + Meta in row */}
                            <div className="hidden md:flex md:flex-row md:items-center md:shrink-0 gap-6">
                                <div>
                                    <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase mb-1">{m.date}</div>
                                    <div className="font-headline font-black text-sm text-on-surface">{m.time}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                            backgroundColor: m.active ? '#8eff71' : '#ff7351',
                                            boxShadow: m.active ? '0 0 6px rgba(142,255,113,0.6)' : 'none'
                                        }}
                                    />
                                    <h3 className="font-headline font-black text-base text-on-surface uppercase tracking-tight truncate">{m.title}</h3>
                                </div>
                                <div className="flex items-center justify-start gap-4 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/60 uppercase">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">schedule</span>
                                        {m.duration}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs">group</span>
                                        {m.participants} PARTICIPANTS
                                    </span>
                                </div>
                            </div>

                            {/* Mobile: Meta */}
                            <div className="md:hidden flex items-center gap-3 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/60 uppercase">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                    {m.duration}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">group</span>
                                    {m.participants} PARTICIPANTS
                                </span>
                            </div>

                            {/* Desktop CTA */}
                            <Link
                                to="/history"
                                className="hidden md:flex shrink-0 px-5 py-2.5 border border-outline-variant/40 text-on-surface font-['Inter'] font-black uppercase text-[10px] tracking-widest hover:border-primary hover:text-primary transition-all items-center gap-2"
                            >
                                <span>VIEW</span>
                                <span className="material-symbols-outlined text-sm">visibility</span>
                            </Link>
                        </div>
                    ))}
                </div>


            </div>

            {/* ── BOTTOM ROW: Neural Engine + Active Node ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-4">

                {/* Neural Engine Status */}
                <div className="lg:col-span-2 bg-surface-container border border-outline-variant/20 p-[10px] md:p-6">
                    <h3 className="font-headline font-black text-base text-on-surface uppercase mb-2 md:mb-3 tracking-tight">NEURAL ENGINE STATUS</h3>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3 md:mb-5">
                        The SPECTAGLINT-core translation node is currently performing at 99.8% accuracy. All language packets are synchronized with the local cache.
                    </p>

                    {/* Waveform / bar chart */}
                    <div className="mb-3 md:mb-5 bg-surface-container-lowest border border-outline-variant/10 p-2 md:p-3">
                        <div className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant/40 uppercase mb-2 md:mb-3">AUDIO_STREAM_INPUT_V4</div>
                        <BarChart />
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                        {[
                            { label: 'LATENCY', value: '14ms' },
                            { label: 'ACTIVE_TPUS', value: '512' },
                            { label: 'ENCRYPTION', value: 'AES-512' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase mb-1">{label}</div>
                                <div className="font-headline font-black text-lg text-on-surface">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Node */}
                <div className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6 flex flex-col">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 border border-primary/30 flex items-center justify-center mb-2 md:mb-4">
                        <span className="material-symbols-outlined text-primary text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    </div>
                    <h3 className="font-headline font-black text-base md:text-lg text-on-surface uppercase mb-0.5 md:mb-1">ACTIVE NODE</h3>
                    <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase tracking-widest mb-0.5 md:mb-1">CURRENT_LOCATION</div>
                    <div className="font-headline font-black text-xl md:text-2xl text-primary mb-auto tracking-tight" style={{ textShadow: '0 0 15px rgba(142,255,113,0.3)' }}>
                        STOCKHOLM_S12
                    </div>
                    <div className="mt-3 md:mt-6 space-y-2 md:space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                            <span className="text-on-surface-variant/50">UPTIME</span>
                            <span className="text-tertiary">99.9%</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-['JetBrains_Mono'] uppercase">
                            <span className="text-on-surface-variant/50">PING</span>
                            <span className="text-on-surface">14ms</span>
                        </div>
                        <button className="w-full py-2 md:py-2.5 border border-primary/40 text-primary font-['Inter'] font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-colors mt-1 md:mt-2">
                            SWITCH_NODE
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PROTOCOL STATUS BANNER ── */}
            <ExtensionStatusBanner connected={extensionOnline} onInstall={downloadExtension} />
        </div>
    );
};

/* ── Extension Status Banner ── */
const ExtensionStatusBanner = ({ connected, onInstall }) => {
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        if (!connected) return;

        const handleMessage = (event) => {
            if (event.data?.type === 'EAR_STATUS_RESPONSE') {
                setIsLive(event.data.isListening);
            }
        };
        window.addEventListener('message', handleMessage);

        // Request status on load
        window.postMessage({ type: 'GET_EAR_STATUS' }, '*');

        // Also setup an interval to keep things synced if toggled from extension popup
        const interval = setInterval(() => {
            window.postMessage({ type: 'GET_EAR_STATUS' }, '*');
        }, 3000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(interval);
        };
    }, [connected]);

    const handleToggle = (e) => {
        const turningOn = e.target.checked;
        setIsLive(turningOn);
        if (turningOn) {
            window.postMessage({ type: 'START_EAR' }, '*');
        } else {
            window.postMessage({ type: 'STOP_EAR' }, '*');
        }
    };

    return (
        <div className={`border p-[10px] md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 transition-all duration-500 ${connected
            ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(142,255,113,0.05)]'
            : 'bg-red-900/5 border-red-800/30'
            }`}>
            <div className="flex items-start gap-3 md:gap-4">
                {/* Status icon */}
                <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center border ${connected ? 'bg-primary/10 border-primary/30' : 'bg-red-900/20 border-red-800/40'
                    }`}>
                    <span
                        className={`material-symbols-outlined text-lg md:text-xl ${connected ? 'text-primary' : 'text-red-500'}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        {connected ? 'extension' : 'extension_off'}
                    </span>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                backgroundColor: connected ? '#8eff71' : '#ef4444',
                                boxShadow: connected ? '0 0 6px rgba(142,255,113,0.8)' : '0 0 6px rgba(239,68,68,0.8)',
                                animation: 'pulse 2s infinite'
                            }}
                        />
                        <h4 className={`font-headline font-black uppercase text-xs md:text-sm tracking-wider ${connected ? 'text-primary' : 'text-red-500'}`}>
                            {connected ? 'PROTOCOL ONLINE — EXTENSION ACTIVE' : 'PROTOCOL OFFLINE — EXTENSION MISSING'}
                        </h4>
                    </div>
                    <p className="font-body text-xs md:text-sm text-on-surface-variant">
                        {connected
                            ? 'The Chrome Extension is linked. Use the toggle to begin capturing live audio from supported platforms.'
                            : 'To capture live meeting audio, the Chrome Extension must be installed and active. No audio feed is currently being received.'
                        }
                    </p>
                    {!connected && (
                        <div className="flex items-center gap-2 mt-1 md:mt-2 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase">
                            <span>SUPPORTED NODES: GOOGLE_MEET // ZOOM // MS_TEAMS</span>
                        </div>
                    )}
                </div>
            </div>

            {!connected && (
                <button
                    onClick={onInstall}
                    className="shrink-0 px-4 md:px-5 py-2 md:py-2.5 bg-primary text-on-primary font-['Inter'] font-black uppercase text-[10px] md:text-[11px] tracking-widest hover:bg-primary-dim transition-colors glow-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">download</span>
                    INSTALL EXTENSION
                </button>
            )}
            {connected && (
                <div className="shrink-0 flex items-center gap-3 px-3 md:px-4 py-1.5 md:py-2 border border-primary/20 font-['JetBrains_Mono'] text-[10px] text-primary uppercase tracking-widest bg-[#030504]">
                    <span className="material-symbols-outlined text-sm">headphones</span>
                    <span>{isLive ? 'STREAM_ACTIVE' : 'STREAM_STANDBY'}</span>
                    <label className="relative inline-flex items-center cursor-pointer ml-1">
                        <input type="checkbox" className="sr-only peer" checked={isLive} onChange={handleToggle} />
                        <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none border border-outline-variant/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-outline-variant/50 after:border-outline-variant/50 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-black"></div>
                    </label>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
