import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';

const Settings = () => {
    const [profile, setProfile] = useState({
        username: '',
        avatar_url: '',
    });

    const [apiConfig, setApiConfig] = useState({
        telegramChatId: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusText, setStatusText] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await api.getProfile();
            setProfile({
                username: data.username || '',
                avatar_url: data.avatar_url || ''
            });
            setApiConfig({
                telegramChatId: data.telegram_chat_id || ''
            });
            // Get the current Supabase session token so the extension can post results to the backend
            const { supabase } = await import('../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            // Auto-sync existing tokens to Chrome Extension on load
            window.postMessage({
                type: 'SYNC_KEYS',
                payload: {
                    groqKey: '',
                    telegramChatId: data.telegram_chat_id || '',
                    supabaseToken: session?.access_token || '',
                    backendUrl: import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app'
                }
            }, '*');
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        setSaving(true);
        setStatusText("UPLOADING...");
        try {
            await api.updateProfile({
                username: profile.username,
                telegram_chat_id: apiConfig.telegramChatId
            });
            // Broadcast to content.js so the Extension can save the updated keys
            window.postMessage({
                type: 'SYNC_KEYS',
                payload: {
                    groqKey: '', // Assuming web app uses backend later, or extension uses its own config. Or we can ask user. Let's send what we have.
                    telegramChatId: apiConfig.telegramChatId
                }
            }, '*');
            setStatusText("COMMIT SUCCESS");
            setTimeout(() => setStatusText(""), 3000);
        } catch (err) {
            console.error('Save failed:', err);
            setStatusText("ERROR: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const [notifications, setNotifications] = useState({
        browserAlerts: true,
        telegramSync: true,
        autoArchive: false
    });

    if (loading) {
        return (
            <TechLoader
                title="READING_PROFILE_RECORDS"
                subtitle="LOADING_SYSTEM_SETTINGS..."
                size="small"
                progress={55}
            />
        );
    }

    return (
        <div className="w-full pb-0 font-['JetBrains_Mono'] space-y-[10px]">
            <PageHeader
                title="GLOBAL_SETTINGS"
                label="SYSTEM // OVERRIDE"
                description="Manage your global persona, API integration keys, and localized terminal preferences in one central control hub."
                mobileDescription="Manage your persona, API keys, and terminal preferences in one central hub."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] lg:gap-8">
                {/* Left Column: Profile & Security */}
                <div className="lg:col-span-7 space-y-[10px] lg:space-y-8">

                    {/* Identification Module */}
                    <section className="bg-surface-container border border-outline-variant/20 p-4 md:p-6 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <span className="material-symbols-outlined text-primary text-sm">fingerprint</span>
                            <h2 className="font-headline font-black text-xs text-on-surface uppercase tracking-widest">IDENTIFICATION_PROTOCOL</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="space-y-3 md:space-y-4">
                                <div>
                                    <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1 md:mb-1.5">USER_HANDLE</label>
                                    <input
                                        type="text"
                                        value={profile.username}
                                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                        className="w-full bg-[#030504] border border-outline-variant/30 text-primary p-2 text-xs focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center border border-dashed border-outline-variant/20 bg-[#030504]/50 p-3 md:p-4 group">
                                <div className="w-16 h-16 bg-surface-container-high border border-primary/30 flex items-center justify-center mb-3 overflow-hidden">
                                    <img
                                        src={profile.avatar_url || "https://api.dicebear.com/9.x/bottts/svg?seed=SpectaGlint&backgroundColor=0a0f0d&baseColor=39ff14"}
                                        alt="Avatar Record"
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                                <button className="text-[9px] text-primary uppercase tracking-[0.2em] border-b border-primary/30 hover:border-primary transition-all">CHANGE_AVATAR</button>
                            </div>
                        </div>
                    </section>

                    {/* API Integration Module */}
                    <section className="bg-surface-container border border-outline-variant/20 p-4 md:p-6 relative">
                        <div className="flex items-center gap-2 mb-4 md:mb-6">
                            <span className="material-symbols-outlined text-primary text-sm">api</span>
                            <h2 className="font-headline font-black text-xs text-on-surface uppercase tracking-widest">EXTERNAL_UPLINKS</h2>
                        </div>

                        <div className="space-y-4 md:space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-1 md:pt-2">
                                <div className="flex flex-col justify-center border border-outline-variant/30 bg-[#030504] p-2 md:p-3">
                                    <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1">1. AUTHORIZE BOT</label>
                                    <p className="text-[9px] text-on-surface-variant/70 mb-1.5 md:mb-2 leading-tight">
                                        <strong className="text-primary/90">REQUIRED:</strong> Tap "Start" on our system bot to grant it permission to alert you. It'll auto-reply with your unique ID.
                                    </p>
                                    <a
                                        href="https://t.me/interviewassistbot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-[9px] font-black uppercase tracking-widest py-1.5 px-3 transition-colors text-center w-full mt-auto"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">send</span>
                                        START BOT & GET ID
                                    </a>
                                </div>
                                <div className="flex flex-col justify-center border border-outline-variant/30 bg-[#030504] p-2 md:p-3">
                                    <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1 md:mb-1.5">2. LINK CHAT ID</label>
                                    <p className="text-[9px] text-on-surface-variant/70 mb-1.5 md:mb-2 leading-tight">
                                        Paste the Chat ID provided by the bot below to establish the secure uplink.
                                    </p>
                                    <input
                                        type="text"
                                        value={apiConfig.telegramChatId}
                                        onChange={(e) => setApiConfig({ ...apiConfig, telegramChatId: e.target.value })}
                                        className="w-full bg-[#0A0F0D] border border-outline-variant/30 text-on-surface p-2 text-xs focus:outline-none focus:border-primary transition-colors mt-auto"
                                        placeholder="Paste Chat ID here..."
                                    />
                                </div>
                            </div>
                            <p className="text-[8px] text-primary/60 mt-1 md:mt-2 italic uppercase font-bold tracking-wider relative flex gap-1.5 items-start">
                                <span className="material-symbols-outlined text-[10px]">warning</span>
                                <span>CRITICAL: If you do not authorize our official bot first, alerts will fail to deliver even if you supply a valid chat ID.</span>
                            </p>
                        </div>
                    </section>
                </div>

                {/* Right Column: Preferences & System */}
                <div className="lg:col-span-5 space-y-[10px] md:space-y-8">

                    {/* Notification Logic */}
                    <section className="bg-surface-container border border-outline-variant/20 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="material-symbols-outlined text-primary text-sm">notifications</span>
                            <h2 className="font-headline font-black text-xs text-on-surface uppercase tracking-widest">NOTIF_PRIORITY</h2>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'browserAlerts', label: 'BROWSER_OVERLAYS', desc: 'Display floating AI snippets over meeting windows.' },
                                { id: 'telegramSync', label: 'TELEGRAM_PUSH', desc: 'Sync all direct questions to mobile bot.' },
                                { id: 'autoArchive', label: 'AUTO_PURGE_HISTORY', desc: 'Automatically wipe logs after 24 hours.' },
                            ].map(item => (
                                <div key={item.id} className="flex items-start gap-3 group cursor-pointer" onClick={() => setNotifications({ ...notifications, [item.id]: !notifications[item.id] })}>
                                    <div className={`mt-0.5 w-4 h-4 border flex items-center justify-center transition-all ${notifications[item.id] ? 'bg-primary/20 border-primary text-primary' : 'border-outline-variant/30'}`}>
                                        {notifications[item.id] && <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>}
                                    </div>
                                    <div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${notifications[item.id] ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>{item.label}</div>
                                        <div className="text-[8px] text-on-surface-variant/30 uppercase mt-0.5">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Data Persistence */}
                    <section className="bg-surface-container border border-outline-variant/20 p-6 relative">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-sm">shield</span>
                            <h2 className="font-headline font-black text-xs text-on-surface uppercase tracking-widest">DATA_INTEGRITY</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-[#030504] p-3 border border-outline-variant/10">
                                <div className="text-[9px] text-on-surface-variant/50 uppercase mb-2">CLOUD_SYNC_STATUS</div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        <div className="text-[10px] text-primary">ENCRYPTED_UPLINK_STABLE</div>
                                    </div>
                                    <div className="text-[9px] text-on-surface-variant/30">AES-256</div>
                                </div>
                            </div>
                            <button className="w-full py-2 border border-red-500/30 text-red-500 text-[9px] font-black uppercase hover:bg-red-500/10 transition-all">TERMINATE_ALL_SESSIONS</button>
                            <button className="w-full py-2 border border-outline-variant/20 text-on-surface-variant text-[9px] font-black uppercase hover:bg-surface-container-high transition-all">EXPORT_PERSONAL_DATA</button>
                        </div>
                    </section>

                    {/* System Footer Info */}
                    <div className="p-2 bg-primary/5 border border-primary/20 flex flex-col items-center text-center">
                        <div className="text-[8px] text-primary/60 uppercase tracking-[0.4em] mb-0.5">LOCAL_TIME_STAMP</div>
                        <div className="text-xs text-on-surface font-bold">2026.03.31 // 23:14:02</div>
                        <div className="w-full h-px bg-primary/10 my-2" />
                        <div className="text-[10px] text-primary/80 uppercase tracking-widest font-black mb-1">
                            {statusText}
                        </div>
                        <button
                            onClick={handleCommit}
                            disabled={saving}
                            className="w-full py-3 bg-primary text-black text-[11px] font-black uppercase tracking-widest glow-primary transition-all active:scale-95 disabled:opacity-50">
                            {saving ? 'PROCESSING...' : 'COMMIT_CHANGES'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;
