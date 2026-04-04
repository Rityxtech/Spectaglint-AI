import React, { useState } from 'react';

/* ── MOCK DATA ── */
const LOGS_LIST = [
    {
        id: 1,
        date: '2023-11-24',
        time: '14:30:05',
        title: 'INFRASTRUCTURE STRATEGY',
        participants: 4,
        duration: '45m',
        active: true,
    },
    {
        id: 2,
        date: '2023-11-23',
        time: '09:15:22',
        title: 'Q4 SECURITY AUDIT',
        participants: 2,
        duration: '120m',
        active: false,
    },
    {
        id: 3,
        date: '2023-11-22',
        time: '16:45:00',
        title: 'API DOCUMENTATION SYNC',
        participants: 8,
        duration: '30m',
        active: false,
    },
];

const TRANSCRIPT_DATA = [
    {
        id: 1,
        timecode: '00:04:12',
        userType: 'USER_A',
        userRole: 'DEVOPS',
        userText: 'How should we scale our server infrastructure for the upcoming Q4 traffic spikes? Are we sticking with vertical upgrades or moving to auto-scaling?',
        aiContext: 'RECOMMENDATION',
        aiText: `Horizontal scaling via Kubernetes (EKS) recommended.
- Target: t4g.large instances
- Trigger: CPU utilization > 65% for 3 mins.
- Risk: Latency spikes during container cold starts.`,
        confidence: '94.2%',
    },
    {
        id: 2,
        timecode: '00:04:45',
        userType: 'USER_B',
        userRole: 'ARCHITECT',
        userText: 'What about the database? If we scale the app nodes, will RDS become the bottleneck during the peak?',
        aiContext: 'DATA_ANALYSIS',
        aiText: `Database Load Balancing suggested. Implement Read Replicas in multi-AZ. Cache-aside strategy using ElastiCache (Redis) could offload 40% of standard queries.`,
        confidence: '88.7%',
    },
];

/* ── Bar chart component for Spectrum Analysis ── */
const SpectrumBars = () => {
    // A simple animated bar component
    return (
        <div className="flex items-end gap-1 h-8 md:h-12">
            {[40, 60, 30, 80, 50, 90, 70, 40, 100, 60, 40, 80, 50].map((h, i) => (
                <div
                    key={i}
                    className="w-1.5 bg-primary/80 transition-all duration-300"
                    style={{
                        height: `${h}%`,
                        animation: `pulse ${0.5 + Math.random()}s infinite alternate`,
                        animationDelay: `${i * 0.1}s`
                    }}
                />
            ))}
        </div>
    );
};

const History = () => {
    const [activeLog, setActiveLog] = useState(1);
    const [filter, setFilter] = useState('all');
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [showMobileTransmission, setShowMobileTransmission] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [isClosingTransmission, setIsClosingTransmission] = useState(false);
    const [isOpeningTransmission, setIsOpeningTransmission] = useState(true);

    const openTransmissionModal = (log) => {
        setSelectedLog(log);
        setShowMobileTransmission(true);
        setIsOpeningTransmission(true);
        document.body.style.overflow = 'hidden';
        setTimeout(() => setIsOpeningTransmission(false), 50);
    };

    const closeTransmissionModal = () => {
        setIsClosingTransmission(true);
        document.body.style.overflow = '';
        setTimeout(() => {
            setShowMobileTransmission(false);
            setIsClosingTransmission(false);
            setIsOpeningTransmission(true);
            setSelectedLog(null);
        }, 300);
    };

    return (
        <div className="flex flex-col-reverse md:flex-row h-[calc(100vh-108px)] font-['JetBrains_Mono'] bg-[#050806] text-on-surface-variant text-sm border border-outline-variant/20 gap-[10px]">

            {/* ── LEFT SIDEBAR (Log List) ── */}
            <div className="flex-1 md:flex-none md:w-80 flex flex-col border border-outline-variant/20 bg-surface-container-lowest shrink-0">

                {/* Search */}
                <div className="px-4 py-[11px] md:p-4 border-b border-outline-variant/10">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="FILTER_LOGS..."
                            className="w-full bg-[#0a0f0d] border border-outline-variant/30 text-on-surface p-2.5 pl-3 pr-10 text-xs font-['JetBrains_Mono'] focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant/50 text-sm">search</span>
                    </div>
                </div>

                {/* List Header */}
                <div className="flex items-center justify-between px-4 py-[2px] md:py-3 border-b border-outline-variant/10 bg-surface-container-lowest/50">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 -my-[5px] md:my-0">RECENT_TRANSMISSIONS</span>
                    
                    {/* Desktop Filter */}
                    <div className="hidden md:flex items-center gap-2">
                        <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">FILTER:</span>
                        <div className="relative">
                            <select className="bg-surface-container-high/50 border border-outline-variant/30 text-on-surface font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest px-2 py-1.5 pr-6 appearance-none cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none transition-colors">
                                <option value="all">ALL</option>
                                <option value="active">ACTIVE</option>
                                <option value="archived">ARCHIVED</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/50 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    {/* Mobile Filter */}
                    <div className="md:hidden relative">
                        <button 
                            onClick={() => setShowMobileFilter(!showMobileFilter)}
                            className={`material-symbols-outlined text-lg transition-colors ${showMobileFilter ? 'text-primary' : 'text-on-surface-variant/50 hover:text-primary'}`}
                        >
                            tune
                        </button>
                        {showMobileFilter && (
                            <>
                                <div 
                                    className="fixed inset-0 z-30" 
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
                                        ALL
                                    </button>
                                    <button
                                        onClick={() => { setFilter('active'); setShowMobileFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'active' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ACTIVE
                                    </button>
                                    <button
                                        onClick={() => { setFilter('archived'); setShowMobileFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'archived' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ARCHIVED
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Logs List */}
                <div className="flex-1 overflow-y-auto">
                    {LOGS_LIST.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => {
                                setActiveLog(log.id);
                                if (window.innerWidth < 768) {
                                    openTransmissionModal(log);
                                }
                            }}
                            className={`relative px-4 py-[11px] md:py-4 cursor-pointer transition-colors border-l-2 ${activeLog === log.id
                                ? 'border-primary bg-primary/5'
                                : 'border-transparent hover:bg-surface-container-low'
                                }`}
                        >
                            <div className={`flex justify-between items-center text-[10px] mb-2 ${activeLog === log.id ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                                <span>{log.date}</span>
                                <span>{log.time}</span>
                            </div>
                            <h3 className={`font-headline font-black uppercase text-sm mb-1 truncate ${activeLog === log.id ? 'text-on-surface' : 'text-on-surface/80'}`}>
                                {log.title}
                            </h3>
                            <div className="text-[10px] text-on-surface-variant/50">
                                <span>Participants: {log.participants}</span>
                                <span className="mx-1">/</span>
                                <span>Duration: {log.duration}</span>
                            </div>
                            {/* Mobile Fullscreen Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openTransmissionModal(log);
                                }}
                                className="absolute bottom-2 right-2 md:hidden flex items-center gap-1 px-2 py-1 border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary transition-colors font-['Inter'] text-[8px] uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-[10px]">visibility</span>
                                VIEW
                            </button>
                        </div>
                    ))}
                </div>

                {/* Bottom Spectrum Widget */}
                <div className="p-2 md:p-4 bg-black border-t border-outline-variant/20">
                    <SpectrumBars />
                    <div className="flex justify-between items-center mt-1 md:mt-3 text-[9px] uppercase tracking-widest text-on-surface-variant/50">
                        <span>SPECTRUM_ANALYSIS</span>
                        <span>LIVE_OUTPUT</span>
                    </div>
                </div>
            </div>

            {/* ── RIGHT MAIN PANEL (Transcript Viewer) ── */}
            <div className="w-full md:flex-1 flex flex-col bg-[#0a0f0d] min-w-0">

                {/* Standardized Header Injection */}
                <div className="px-[10px] md:px-8 py-2.5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest/30">
                    <div className="flex items-start gap-[10px] md:gap-4">
                        <div className="w-1 h-12 bg-primary shrink-0" />
                        <div>
                            <div className="text-[10px] text-primary/80 uppercase tracking-[0.2em] font-['JetBrains_Mono'] mb-1">
                                ARCHIVE // TRANSCRIPT
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-on-surface uppercase tracking-tight font-['Inter']">
                                <span className="md:hidden">TRANSCRIPT</span>
                                <span className="hidden md:inline">INFRASTRUCTURE STRATEGY SESSION</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex gap-[10px]">
                        <button className="w-10 h-10 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">download</span>
                        </button>
                        <button className="w-10 h-10 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">share</span>
                        </button>
                    </div>
                </div>

                {/* Transcript Area */}
                <div className="hidden md:flex flex-col flex-1 overflow-y-auto p-[10px] md:p-8 space-y-[10px] md:space-y-4">

                     {TRANSCRIPT_DATA.map((block) => (
                        <div key={block.id} className="space-y-3">

                            {/* Timecode */}
                            <div className="text-xs text-on-surface-variant/40">
                                {block.timecode}
                            </div>

                            {/* User Content */}
                            <div>
                                <div className="text-[11px] mb-2 font-bold text-on-surface uppercase tracking-wider">
                                    {block.userType} <span className="text-on-surface-variant/60">[{block.userRole}]</span>
                                </div>
                                <div className="text-sm text-on-surface-variant/90 leading-relaxed font-body">
                                    {block.userText}
                                </div>
                            </div>

                            {/* AI Response Card */}
                            <div className="border-l-4 border-primary bg-surface-container-high/40 p-4 rounded-r relative overflow-hidden group">
                                {/* Background glow effect */}
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rotate-45 bg-primary shadow-[0_0_8px_rgba(142,255,113,0.8)]" />
                                        <span className="text-[10px] text-primary uppercase font-bold tracking-widest">
                                            AI_RESPONSE // {block.aiContext}
                                        </span>
                                    </div>

                                    <div className="text-sm text-primary/90 leading-relaxed font-body whitespace-pre-line flex-1 mb-6">
                                        {block.aiText}
                                    </div>

                                    {/* Confidence Footer */}
                                    <div className="mt-auto">
                                        <div className="flex justify-between items-center mb-1 text-[9px] text-on-surface-variant/60 uppercase tracking-widest">
                                            <span>CONFIDENCE_SCORE</span>
                                            <span>{block.confidence}</span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-1 bg-surface-container mt-1 overflow-hidden">
                                            <div className="h-full bg-tertiary" style={{ width: block.confidence }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Active / Typing Status */}
                    <div className="flex gap-6 max-w-5xl mt-12 pb-12">
                        <div className="w-20 shrink-0 pt-4 text-xs text-primary animate-pulse">
                            00:05:12
                        </div>

                        <div className="flex-1 bg-surface-container border border-outline-variant/20 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-primary font-['JetBrains_Mono']">
                                <span>$</span>
                                <span>Analyze security implications of multi-AZ deployment...</span>
                                <span className="w-2.5 h-4 bg-primary animate-pulse" />
                            </div>
                            <span className="material-symbols-outlined text-on-surface-variant/50">mic</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── MOBILE TRANSMISSION MODAL ── */}
            {showMobileTransmission && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div 
                        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isClosingTransmission ? 'opacity-0' : 'opacity-100'}`}
                        onClick={closeTransmissionModal}
                    />
                    {/* Slide-in Panel from Right */}
                    <div className={`absolute right-0 top-0 bottom-0 w-full bg-[#0a0f0d] border-l border-primary/30 flex flex-col transition-transform duration-300 ease-out ${isClosingTransmission ? 'translate-x-full' : isOpeningTransmission ? 'translate-x-full' : 'translate-x-0'}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-outline-variant/20 bg-surface-container-lowest">
                            <div className="flex items-start gap-3">
                                <div className="w-1 h-8 bg-primary shrink-0" />
                                <div>
                                    <div className="text-[9px] text-primary/80 uppercase tracking-[0.2em] font-['JetBrains_Mono'] mb-1">
                                        ARCHIVE // TRANSCRIPT
                                    </div>
                                    <h3 className="font-headline font-black text-sm text-on-surface uppercase tracking-widest truncate max-w-[200px]">
                                        {selectedLog?.title || 'TRANSMISSION'}
                                    </h3>
                                </div>
                            </div>
                            <button 
                                onClick={closeTransmissionModal}
                                className="w-8 h-8 flex items-center justify-center border border-outline-variant/30 hover:border-primary hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Log Info */}
                            <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 -my-[10px] md:my-0">
                                <div className="flex items-center gap-2">
                                    <span>{selectedLog?.date}</span>
                                    <span>{selectedLog?.time}</span>
                                </div>
                                <div className="flex items-center gap-1 text-on-surface-variant/50">
                                    <span>P: {selectedLog?.participants}</span>
                                    <span>/</span>
                                    <span>D: {selectedLog?.duration}</span>
                                </div>
                            </div>

                            {/* Transcript Data */}
                            <div className="space-y-4">
                                {TRANSCRIPT_DATA.map((block) => (
                                    <div key={block.id} className="space-y-3">
                                        {/* Timecode */}
                                        <div className="text-xs text-on-surface-variant/40 -my-[10px] md:my-0">
                                            {block.timecode}
                                        </div>

                                        {/* User Content */}
                                        <div>
                                            <div className="text-[11px] mb-2 font-bold text-on-surface uppercase tracking-wider">
                                                {block.userType} <span className="text-on-surface-variant/60">[{block.userRole}]</span>
                                            </div>
                                            <div className="text-sm text-on-surface-variant/90 leading-relaxed font-body">
                                                {block.userText}
                                            </div>
                                        </div>

                                        {/* AI Response Card */}
                                        <div className="border-l-4 border-primary bg-surface-container-high/40 p-4 rounded-r relative overflow-hidden">
                                            <div className="relative z-10 flex flex-col">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-2 h-2 rotate-45 bg-primary shadow-[0_0_8px_rgba(142,255,113,0.8)]" />
                                                    <span className="text-[10px] text-primary uppercase font-bold tracking-widest">
                                                        AI_RESPONSE // {block.aiContext}
                                                    </span>
                                                </div>

                                                <div className="text-sm text-primary/90 leading-relaxed font-body whitespace-pre-line mb-4">
                                                    {block.aiText}
                                                </div>

                                                {/* Confidence Footer */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1 text-[9px] text-on-surface-variant/60 uppercase tracking-widest">
                                                        <span>CONFIDENCE_SCORE</span>
                                                        <span>{block.confidence}</span>
                                                    </div>
                                                    {/* Progress Bar */}
                                                    <div className="h-1 bg-surface-container mt-1 overflow-hidden">
                                                        <div className="h-full bg-tertiary" style={{ width: block.confidence }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Active / Typing Status */}
                            <div className="mt-6 pb-6">
                                <div className="flex justify-between items-center text-xs text-primary animate-pulse mb-3">
                                    <span>00:05:12</span>
                                </div>
                                <div className="bg-surface-container border border-outline-variant/20 p-2 md:p-3 flex items-center gap-2">
                                    <div className="flex items-center gap-1 md:gap-2 text-[11px] md:text-sm text-primary font-['JetBrains_Mono'] flex-1 min-w-0">
                                        <span>$</span>
                                        <span className="truncate">Analyze security implications...</span>
                                        <span className="w-2 h-3 md:w-2.5 md:h-4 bg-primary animate-pulse shrink-0" />
                                    </div>
                                    <span className="material-symbols-outlined text-on-surface-variant/50 text-lg md:text-xl shrink-0">mic</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
