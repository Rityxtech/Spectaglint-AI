import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';

const SmartAnalyticsPanel = () => (
    <>
        {/* Resume Intelligence */}
        <div className="bg-surface-container border border-primary/20 p-[10px] md:p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 blur-xl rounded-full"></div>
            <h4 className="font-headline font-black text-sm text-on-surface uppercase mb-2 md:mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                RESUME INTELLIGENCE
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed font-body mb-3 md:mb-4">
                Your persona currently achieves a <strong className="text-on-surface">92% average match rate</strong> for Senior Frontend roles.
                <br className="hidden md:block" />
                <span className="text-primary mt-1 md:mt-2 block">Recommendation:</span> Add "GraphQL" to skill matrix to unlock 45 additional opportunities.
            </p>
            <button className="w-full px-4 py-2 border border-primary/40 text-primary font-['Inter'] font-black uppercase text-[10px] tracking-widest hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span> UPDATE PERSONA
            </button>
        </div>

        {/* Auto-Apply Queue */}
        <div className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-5">
            <div className="flex items-center justify-between mb-3 md:mb-4">
                <h4 className="font-headline font-black text-sm text-on-surface uppercase">AUTO-APPLY QUEUE</h4>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">schedule</span>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-['JetBrains_Mono'] uppercase">DAILY LIMIT</span>
                    <span className="text-on-surface font-black">45 / 50</span>
                </div>
                <div className="w-full bg-surface-container-high h-1 md:h-1.5 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-1000 shadow-[0_0_10px_rgba(142,255,113,0.5)]" style={{ width: '90%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[9px] md:text-[10px] text-on-surface-variant/50 font-['JetBrains_Mono'] tracking-widest uppercase pt-1">
                    <span>STATUS: ACTIVE</span>
                    <span>RESET IN: 4H 12M</span>
                </div>
            </div>
        </div>
    </>
);

const JobExplorerTab = () => {
    const [showMobileSettings, setShowMobileSettings] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [filter, setFilter] = useState('all');

    // ── Global Modal Body Scroll Lock ──
    useEffect(() => {
        if (showMobileSettings || showFilter) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showMobileSettings, showFilter]);

    // Mock jobs
    const jobs = [
        { title: 'Senior AI Engineer', company: 'Neuralink Corp', match: 98, type: 'Full-time', location: 'Remote', salary: '$160k - $210k' },
        { title: 'Frontend Developer', company: 'Spectaglint AI', match: 95, type: 'Full-time', location: 'Stockholm (Hybrid)', salary: '$120k - $150k' },
        { title: 'Backend Systems Architect', company: 'Stark Industries', match: 88, type: 'Contract', location: 'New York, NY', salary: '$150/hr' },
        { title: 'Machine Learning Lead', company: 'Cyberdyne Systems', match: 82, type: 'Full-time', location: 'San Francisco, CA', salary: '$180k - $220k' },
        { title: 'DevOps Automation Engineer', company: 'Aperture Science', match: 79, type: 'Full-time', location: 'Remote', salary: '$130k - $170k' }
    ];

    const filteredJobs = jobs.filter(j => {
        if (filter === 'all') return true;
        if (filter === 'full-time') return j.type === 'Full-time';
        if (filter === 'contract') return j.type === 'Contract';
        return true;
    });

    return (
        <div className="space-y-2 md:space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 md:gap-4 bg-surface-container border border-outline-variant/20 p-2 md:p-4">
                <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 w-full">
                    <div className="flex-1 border bg-surface-container-lowest border-outline-variant/30 flex items-center px-2 md:px-3 group focus-within:border-primary transition-colors">
                        <span className="material-symbols-outlined text-on-surface-variant/50 mr-1.5 md:mr-2 group-focus-within:text-primary transition-colors">search</span>
                        <input type="text" placeholder="SEARCH JOB TITLES, KEYWORDS, COMPANIES..." className="w-full bg-transparent border-none text-xs md:text-sm text-on-surface py-1.5 md:py-3 focus:outline-none font-['JetBrains_Mono'] placeholder:text-on-surface-variant/30 uppercase" />
                    </div>
                    <div className="w-full md:w-48 border bg-surface-container-lowest border-outline-variant/30 flex items-center px-2 md:px-3 group focus-within:border-primary transition-colors relative">
                        <span className="material-symbols-outlined text-on-surface-variant/50 mr-1.5 md:mr-2 group-focus-within:text-primary transition-colors">location_on</span>
                        <input type="text" placeholder="LOCATION (REMOTE)" className="w-full bg-transparent border-none text-xs md:text-sm text-on-surface py-1.5 md:py-3 focus:outline-none font-['JetBrains_Mono'] placeholder:text-on-surface-variant/30 uppercase" />
                        <button
                            onClick={() => setShowMobileSettings(true)}
                            className="md:hidden material-symbols-outlined text-on-surface-variant/50 hover:text-primary focus:outline-none transition-colors border-l border-outline-variant/30 pl-2 ml-1 py-1"
                        >
                            settings
                        </button>
                    </div>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className={`px-3 py-1.5 md:px-4 md:py-2 border border-outline-variant/30 bg-surface-container-low font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap ${showFilter ? 'text-primary border-primary' : 'text-on-surface'}`}
                        >
                            <span className="material-symbols-outlined text-sm">tune</span> <span className="hidden md:inline">FILTERS</span>
                        </button>
                        {showFilter && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
                                <div className="absolute left-0 top-full mt-2 bg-surface-container border border-outline-variant/30 shadow-lg z-[45] min-w-[160px]">
                                    <div className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant/50 uppercase tracking-widest px-3 py-2 border-b border-outline-variant/20">
                                        FILTER BY
                                    </div>
                                    <button
                                        onClick={() => { setFilter('all'); setShowFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'all' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        ALL JOBS
                                    </button>
                                    <button
                                        onClick={() => { setFilter('full-time'); setShowFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'full-time' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        FULL-TIME
                                    </button>
                                    <button
                                        onClick={() => { setFilter('contract'); setShowFilter(false); }}
                                        className={`w-full text-left px-3 py-3 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider transition-colors hover:bg-surface-container-high ${filter === 'contract' ? 'text-primary bg-primary/5' : 'text-on-surface'}`}
                                    >
                                        CONTRACT
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <button className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 bg-primary text-black font-['JetBrains_Mono'] font-black text-[10px] tracking-widest uppercase hover:bg-primary-dim transition-colors glow-primary flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap">
                        <span className="material-symbols-outlined text-sm">smart_toy</span> AUTO-APPLY ENGAGED
                    </button>
                </div>
            </div>

            {/* Job Grid / List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-4">
                {/* Left Side: Job listings */}
                <div className="lg:col-span-2 space-y-2 md:space-y-3">
                    {filteredJobs.map((job, idx) => (
                        <div key={idx} className="bg-surface-container-lowest border border-outline-variant/20 p-2.5 md:p-5 hover:border-primary/50 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <h3 className="font-headline font-black text-sm md:text-base text-on-surface uppercase tracking-tight">{job.title}</h3>
                                    <span className="px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[8px] md:text-[9px] font-['JetBrains_Mono'] tracking-widest uppercase rounded-sm flex items-center gap-1 shrink-0">
                                        <span className="material-symbols-outlined text-[10px]">offline_bolt</span>
                                        {job.match}% MATCH
                                    </span>
                                </div>
                                <div className="font-['Inter'] text-xs md:text-sm text-on-surface-variant mb-1.5 md:mb-2">
                                    {job.company}
                                </div>
                                <div className="flex flex-wrap gap-1.5 md:gap-3 font-['JetBrains_Mono'] text-[9px] md:text-[10px] text-on-surface-variant/60 uppercase">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">location_on</span>{job.location}</span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">work</span>{job.type}</span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">payments</span>{job.salary}</span>
                                </div>
                            </div>
                            <div className="md:shrink-0 flex gap-1.5 md:gap-2 w-full md:w-auto mt-0.5 md:mt-0">
                                <button className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2.5 border border-outline-variant/30 text-center text-on-surface font-['Inter'] font-black uppercase text-[10px] tracking-widest hover:border-primary hover:text-primary transition-all">
                                    DETAILS
                                </button>
                                <button className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-center text-primary font-['Inter'] font-black uppercase text-[10px] tracking-widest transition-all">
                                    AI APPLY
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Smart Analytics/Suggestions (Hidden on Mobile) */}
                <div className="hidden md:block space-y-4 lg:col-span-1">
                    <SmartAnalyticsPanel />
                </div>
            </div>

            {/* Mobile Actions Bottom Modal */}
            {showMobileSettings && (
                <div className="fixed inset-0 z-[100] flex md:hidden items-end bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-[#030504] border-t border-outline-variant/20 w-full p-[15px] pb-8 relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
                            <h2 className="font-['JetBrains_Mono'] font-bold text-[10px] uppercase tracking-widest text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">settings</span>
                                INTELLIGENCE_SETTINGS
                            </h2>
                            <button
                                onClick={() => setShowMobileSettings(false)}
                                className="text-on-surface-variant/50 hover:text-on-surface transition-colors p-1 flex items-center"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div className="space-y-[10px]">
                            <SmartAnalyticsPanel />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ApplicationsTab = () => {
    const [mobileActiveCol, setMobileActiveCol] = useState('applied');

    // Kanban board structure mockup
    const columns = [
        { id: 'applied', label: 'APPLIED', count: 12 },
        { id: 'interview', label: 'INTERVIEWING', count: 3 },
        { id: 'offer', label: 'OFFER', count: 1 },
        { id: 'rejected', label: 'REJECTED', count: 5 },
    ];

    const mockApplications = {
        applied: [
            { company: 'Google', role: 'Staff SWE', date: '2 DAYS AGO' },
            { company: 'Meta', role: 'Frontend Engineer', date: '5 DAYS AGO' },
        ],
        interview: [
            { company: 'Spectaglint AI', role: 'Frontend Developer', date: 'TOMORROW, 14:00' },
        ],
        offer: [
            { company: 'Neuralink Corp', role: 'Senior AI Engineer', date: 'RECEIVED TODAY' }
        ],
        rejected: [
            { company: 'OpenAI', role: 'Prompt Engineer', date: 'LAST WEEK' }
        ]
    };

    return (
        <div className="space-y-1.5 md:space-y-6">
            <div className="flex flex-col md:block">
                <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2 md:pb-3">
                    <div>
                        <h2 className="font-headline font-black text-lg text-on-surface uppercase tracking-widest">APPLICATION_TRACKER</h2>
                        <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/50 uppercase tracking-widest mt-1">KANBAN VISUALIZATION ENGINE</div>
                    </div>
                    <button className="p-2 md:px-4 md:py-2 border border-outline-variant/30 text-on-surface font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase hover:border-primary hover:text-primary transition-colors flex items-center justify-center md:gap-2">
                        <span className="material-symbols-outlined text-base md:text-sm">add</span>
                        <span className="hidden md:inline">NEW APPLICATION</span>
                    </button>
                </div>

                {/* Mobile Kanban Tabs */}
                <div className="flex md:hidden overflow-x-auto hide-scrollbar mt-2 mb-1 gap-1.5 pb-1">
                    {columns.map(col => (
                        <button
                            key={col.id}
                            onClick={() => setMobileActiveCol(col.id)}
                            className={`px-2 py-1.5 text-[10px] font-['JetBrains_Mono'] font-bold uppercase tracking-widest whitespace-nowrap transition-colors rounded-sm flex items-center gap-1.5
                                ${mobileActiveCol === col.id
                                    ? 'bg-primary/10 text-primary border border-primary/30'
                                    : 'text-on-surface-variant/60 border border-transparent hover:text-on-surface hover:bg-surface-container'
                                }`}
                        >
                            {col.label}
                            <span className={`px-1 py-[1px] rounded text-[8px] ${mobileActiveCol === col.id ? 'bg-primary/30 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                {col.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 mt-2 md:mt-0">
                {columns.map(col => (
                    <div
                        key={col.id}
                        className={`bg-surface-container border border-outline-variant/20 p-2 md:p-3 flex-col h-[65vh] min-h-[400px] max-h-[600px] md:h-[500px] md:min-h-0 md:max-h-none md:min-w-[260px] 
                            ${mobileActiveCol === col.id ? 'flex' : 'hidden md:flex'}`}
                    >
                        <div className="flex justify-between items-center mb-1.5 md:mb-4 border-b border-outline-variant/20 pb-1.5 md:pb-2">
                            <h3 className="font-['JetBrains_Mono'] text-xs font-bold text-on-surface uppercase tracking-widest">{col.label}</h3>
                            <span className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant">{col.count}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1.5 md:space-y-3 pr-1 py-0 custom-scrollbar">
                            {mockApplications[col.id]?.map((app, i) => (
                                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 p-2 md:p-3 hover:border-primary/50 transition-colors cursor-pointer group">
                                    <div className="font-['Inter'] text-sm font-black text-on-surface mb-0.5 md:mb-1 uppercase tracking-tight">{app.role}</div>
                                    <div className="font-['Inter'] text-xs text-on-surface-variant mb-1.5 md:mb-3">{app.company}</div>
                                    <div className="flex justify-between items-center">
                                        <div className="font-['JetBrains_Mono'] text-[9px] text-on-surface-variant/50 uppercase tracking-widest">{app.date}</div>
                                        <span className="material-symbols-outlined text-sm text-on-surface-variant/30 group-hover:text-primary/70 transition-colors">more_horiz</span>
                                    </div>
                                </div>
                            ))}
                            {(!mockApplications[col.id] || mockApplications[col.id].length === 0) && (
                                <div className="text-center py-4 md:py-6 text-on-surface-variant/30 text-[10px] font-['JetBrains_Mono'] uppercase border border-dashed border-outline-variant/10">
                                    NO DATA
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MessagesTab = () => {
    return (
        <div className="flex items-center justify-center h-[50vh] bg-surface-container border border-outline-variant/20">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-primary/40 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                <h2 className="font-headline font-black text-lg text-on-surface uppercase tracking-widest mb-2">COMMUNICATION_HUB</h2>
                <p className="font-['JetBrains_Mono'] text-xs text-on-surface-variant/60 uppercase max-w-md mx-auto leading-relaxed">
                    Automated follow-ups and inbound recruiter messages are synchronized here. Connect your email provider to establish bidirectional intelligence parsing.
                </p>
                <button className="mt-6 px-6 py-2.5 bg-primary text-black font-['JetBrains_Mono'] font-bold text-[11px] tracking-widest uppercase hover:bg-primary-dim transition-colors glow-primary border-none">
                    CONNECT MAILBOX
                </button>
            </div>
        </div>
    );
};

const InterviewsTab = () => {
    return (
        <div className="flex items-center justify-center h-[50vh] bg-surface-container border border-outline-variant/20">
            <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-primary/40 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                <h2 className="font-headline font-black text-lg text-on-surface uppercase tracking-widest mb-2">CALENDAR_SYNC</h2>
                <p className="font-['JetBrains_Mono'] text-xs text-on-surface-variant/60 uppercase max-w-md mx-auto leading-relaxed">
                    AI automatically detects calendar invites in email routing. The scheduling subsystem tracks impending technical and behavioral assessments.
                </p>
                <button className="mt-6 px-6 py-2.5 bg-primary text-black font-['JetBrains_Mono'] font-bold text-[11px] tracking-widest uppercase hover:bg-primary-dim transition-colors glow-primary border-none">
                    SYNCHRONIZE CALENDAR
                </button>
            </div>
        </div>
    );
};


const JobBoard = () => {
    const [activeTab, setActiveTab] = useState('JOB_BOARD');

    const tabs = [
        { id: 'JOB_BOARD', label: 'JOB BOARD', icon: 'manage_search' },
        { id: 'APPLICATIONS', label: 'MY APPLICATIONS', icon: 'view_kanban' },
        { id: 'MESSAGES', label: 'MESSAGES', icon: 'forum' },
        { id: 'INTERVIEWS', label: 'INTERVIEWS', icon: 'event' },
    ];

    return (
        <div className="w-full pb-0 space-y-[10px] md:space-y-6">
            <PageHeader
                title="CAREER_OPERATIONS"
                label="SYSTEM // RECRUITMENT"
                description="AI Job Hunting Operating System. Aggregate job feeds, track applications, manage interviews and communications through automated pipelines."
                mobileDescription="AI Job Hunting Operating System."
            />

            {/* Switchable Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar border-b border-outline-variant/20 mb-2 md:mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`group px-3 md:px-8 py-2 md:py-4 flex items-center justify-center gap-1.5 md:gap-3 border-b-2 font-['JetBrains_Mono'] text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high'
                            }`}
                    >
                        <span className="material-symbols-outlined text-base md:text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>
                            {tab.icon}
                        </span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Based on Tab Selection */}
            <div>
                {activeTab === 'JOB_BOARD' && <JobExplorerTab />}
                {activeTab === 'APPLICATIONS' && <ApplicationsTab />}
                {activeTab === 'MESSAGES' && <MessagesTab />}
                {activeTab === 'INTERVIEWS' && <InterviewsTab />}
            </div>
        </div>
    );
};

export default JobBoard;
