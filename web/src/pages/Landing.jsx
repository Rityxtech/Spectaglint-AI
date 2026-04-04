import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoggedHeader from '../components/LoggedHeader';

const Landing = () => {
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="bg-background text-on-background font-body selection:bg-primary selection:text-on-primary min-h-screen">
            {/* Conditional TopAppBar Navigation */}
            {session ? (
                <LoggedHeader />
            ) : (
                <header className="bg-[#0a0f0d] dark:bg-[#0a0f0d] docked full-width top-0 z-50 border-b border-primary flat no-shadows sticky top-0">
                    <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                        <div className="flex items-center gap-8">
                            <span className="font-['Inter'] font-black tracking-tighter uppercase text-xl text-[#8eff71] tracking-[0.2em]">SPECTAGLINT</span>
                            <div className="hidden md:flex gap-6 items-center">
                                <Link to="/dashboard" className="font-['Inter'] font-black tracking-tighter uppercase text-xs text-[#8eff71] border-b-2 border-[#8eff71] hover:text-[#8eff71] transition-colors duration-200">Terminal</Link>
                                <Link to="/history" className="font-['Inter'] font-black tracking-tighter uppercase text-xs text-[#88f6ff] opacity-70 hover:text-[#8eff71] transition-colors duration-200">Nodes</Link>
                                <Link to="/settings" className="font-['Inter'] font-black tracking-tighter uppercase text-xs text-[#88f6ff] opacity-70 hover:text-[#8eff71] transition-colors duration-200">Archive</Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="flex items-center gap-1.5 md:gap-2">
                                <Link to="/login" className="font-['Inter'] font-black tracking-tight uppercase text-[13px] md:text-sm text-[#88f6ff] opacity-90 hover:opacity-100 transition-opacity py-1">Login</Link>
                                <span className="text-[#88f6ff] opacity-40 text-[13px] md:text-sm font-black py-1">/</span>
                                <Link to="/register" className="font-['Inter'] font-black tracking-tight uppercase text-[13px] md:text-sm text-[#88f6ff] opacity-90 hover:opacity-100 transition-opacity py-1">Register</Link>
                            </div>
                            <button className="hidden md:flex bg-primary text-on-primary px-4 py-1.5 items-center gap-2 font-['Inter'] font-black tracking-tighter uppercase text-xs transition-transform active:scale-95 glow-primary ml-1 md:ml-2">
                                <span className="material-symbols-outlined text-sm">extension</span> Add to Chrome
                            </button>
                        </div>
                    </nav>
                </header>
            )}

            <main className="relative overflow-hidden pt-10">
                {/* Noise Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-noise"></div>

                {/* Hero Section */}
                <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
                    <div className="inline-block px-3 py-1 mb-6 border border-primary/20 bg-primary/5">
                        <span className="text-[10px] font-label uppercase tracking-[0.3em] text-primary">System Status: Active // Protocol 09</span>
                    </div>
                    <h1 className="font-headline font-black text-6xl md:text-8xl lg:text-9xl text-primary tracking-tighter leading-none mb-8 drop-shadow-[0_0_15px_rgba(142,255,113,0.4)]">
                        THE INTELLIGENT EAR FOR YOUR MEETINGS
                    </h1>
                    <p className="max-w-2xl mx-auto text-on-surface-variant font-body text-lg md:text-xl mb-12 tracking-tight">
                        An uncompromising AI interface that listens, deciphers, and acts. Transform raw audio into high-fidelity data in real-time.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                        <button className="bg-primary text-on-primary px-10 py-5 font-headline font-black uppercase text-lg glow-primary flex items-center gap-3 group">
                            Add to Chrome - Free
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                        <div className="font-['JetBrains_Mono'] text-xs text-primary/60 border-l border-outline-variant pl-4 py-2 text-left">
                            STABLE_BUILD_V2.0.4<br />
                            6.4MB // OPEN_SOURCE_CORE
                        </div>
                    </div>
                </section>

                {/* Mock Graphic Section (Split Screen) */}
                <section className="px-6 py-20 max-w-7xl mx-auto">
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest border border-outline-variant/20 shadow-2xl">
                        {/* Left: Transcript */}
                        <div className="p-8 border-r border-outline-variant/20 relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-error animate-pulse"></span>
                                    <span className="font-['JetBrains_Mono'] text-xs text-on-surface-variant uppercase tracking-widest">Live_Transcript</span>
                                </div>
                                <span className="font-['JetBrains_Mono'] text-[10px] text-primary/40">00:42:15</span>
                            </div>
                            <div className="space-y-6 font-['JetBrains_Mono'] text-sm leading-relaxed">
                                <div className="flex gap-4">
                                    <span className="text-primary/40 whitespace-nowrap">[14:02]</span>
                                    <p className="text-on-surface">"Regarding the Q4 roadmap, we need to finalize the encryption protocols by Friday. Has the team reviewed the SPECTAGLINT patch?"</p>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-primary/40 whitespace-nowrap">[14:03]</span>
                                    <p className="text-on-surface/60">"The patch is pending review. We noticed a latency spike in the terminal interface when processing large datasets."</p>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-primary/40 whitespace-nowrap">[14:04]</span>
                                    <p className="text-on-surface">"Let's focus on the SPECTAGLINT patch first. Can the AI generate a summary of the security implications?"</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary/40">[14:05]</span>
                                    <span className="terminal-cursor"></span>
                                </div>
                            </div>
                        </div>

                        {/* Right: AI Answers */}
                        <div className="p-8 bg-surface-container-low relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                                    <span className="font-['JetBrains_Mono'] text-xs text-primary uppercase tracking-widest">AI_Inference_Node</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-['JetBrains_Mono'] text-tertiary">CONFIDENCE: 98.4%</span>
                                    <div className="w-16 h-1 bg-surface-container-highest">
                                        <div className="h-full bg-tertiary w-[98%]"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-surface-container-highest p-6 border-l-4 border-primary">
                                    <h4 className="font-headline font-black text-xs text-primary uppercase mb-3 tracking-widest">Summary: Security Patch</h4>
                                    <p className="font-body text-sm text-on-surface leading-relaxed">
                                        The SPECTAGLINT Patch v2.0.4 addresses the core encryption vulnerability. Deployment is recommended within 48 hours to mitigate risk of lateral data exposure.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border border-outline-variant/20 p-4">
                                        <span className="block font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase mb-2">Action_Item</span>
                                        <p className="text-xs font-body text-on-surface">Finalize encryption protocols by EOD Friday.</p>
                                    </div>
                                    <div className="border border-outline-variant/20 p-4">
                                        <span className="block font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase mb-2">Technical_Debt</span>
                                        <p className="text-xs font-body text-on-surface">Investigate terminal interface latency spike.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it Works Section */}
                <section className="px-6 py-20 max-w-7xl mx-auto">
                    <div className="mb-16">
                        <h2 className="font-headline font-black text-4xl text-on-surface tracking-tighter uppercase">OPERATIONAL_FLOW</h2>
                        <div className="w-24 h-1 bg-primary mt-4"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-outline-variant/20 relative z-10">
                        {/* Step 1 */}
                        <div className="p-10 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-surface hover:bg-surface-container transition-colors group">
                            <span className="font-['JetBrains_Mono'] text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">01</span>
                            <h3 className="font-headline font-black text-xl text-primary mt-4 mb-4 uppercase">Install Extension</h3>
                            <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
                                Securely integrate the EXT_INTERFACE into your chrome-based browser with a single click. No complex root permissions required.
                            </p>
                            <div className="flex items-center gap-2 text-primary font-['JetBrains_Mono'] text-[10px] tracking-widest">
                                <span className="material-symbols-outlined text-sm">download</span> AUTO_DEPLOY_ENABLED
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-10 border-b md:border-b-0 md:border-r border-outline-variant/20 bg-surface-container-low hover:bg-surface-container transition-colors group">
                            <span className="font-['JetBrains_Mono'] text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">02</span>
                            <h3 className="font-headline font-black text-xl text-primary mt-4 mb-4 uppercase">Join a Meeting</h3>
                            <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
                                Launch Google Meet or Zoom. The SPECTAGLINT Terminal will automatically detect the audio stream and initialize decryption.
                            </p>
                            <div className="flex items-center gap-2 text-primary font-['JetBrains_Mono'] text-[10px] tracking-widest">
                                <span className="material-symbols-outlined text-sm">wifi</span> REAL_TIME_HANDSHAKE
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-10 bg-surface hover:bg-surface-container transition-colors group">
                            <span className="font-['JetBrains_Mono'] text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">03</span>
                            <h3 className="font-headline font-black text-xl text-primary mt-4 mb-4 uppercase">Get Answers</h3>
                            <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
                                Receive instant insights, action items, and live translations directly in your terminal overlay while you collaborate.
                            </p>
                            <div className="flex items-center gap-2 text-primary font-['JetBrains_Mono'] text-[10px] tracking-widest">
                                <span className="material-symbols-outlined text-sm">check_circle</span> OUTPUT_VERIFIED
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section className="px-6 py-20 bg-surface-container-low">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="font-headline font-black text-5xl text-on-surface tracking-tighter uppercase mb-6 leading-none">
                                    ACQUIRE <span className="text-primary">CREDITS</span><br />
                                    SECURE THE NODE
                                </h2>
                                <p className="font-body text-on-surface-variant mb-8 max-w-md">
                                    Computational power isn't free. Our coin-based system ensures you only pay for the exact transcription seconds you consume.
                                </p>
                                <div className="flex gap-4">
                                    <div className="bg-primary/10 border border-primary/30 p-4 inline-flex items-center gap-4">
                                        <span className="material-symbols-outlined text-primary text-3xl">toll</span>
                                        <div>
                                            <span className="block font-headline font-black text-lg text-primary uppercase">Claim 50 Coins</span>
                                            <span className="block font-['JetBrains_Mono'] text-[10px] text-primary/60 uppercase">NEW_USER_PROTOCOL</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Card 1 */}
                                <div className="bg-surface p-8 border border-outline-variant/20 relative group hover:border-primary/50 transition-colors">
                                    <span className="absolute top-4 right-4 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant">LITE_PACK</span>
                                    <h4 className="font-headline font-black text-2xl text-on-surface uppercase mb-2">200c</h4>
                                    <p className="text-primary font-headline font-bold mb-6">$19.00</p>
                                    <ul className="space-y-3 mb-8">
                                        <li className="flex items-center gap-2 text-xs text-on-surface-variant font-['JetBrains_Mono'] uppercase">
                                            <span className="material-symbols-outlined text-primary text-sm">done</span> ~10 Hours Audio
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-on-surface-variant font-['JetBrains_Mono'] uppercase">
                                            <span className="material-symbols-outlined text-primary text-sm">done</span> Basic Support
                                        </li>
                                    </ul>
                                    <button className="w-full py-3 border border-primary text-primary font-headline font-black uppercase text-xs hover:bg-primary hover:text-on-primary transition-all">Select</button>
                                </div>
                                {/* Card 2 */}
                                <div className="bg-surface-container-high p-8 border-2 border-primary relative group shadow-[0_0_30px_rgba(142,255,113,0.1)]">
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-3 py-1 font-headline font-black text-[10px] uppercase">Most Popular</span>
                                    <span className="absolute top-4 right-4 font-['JetBrains_Mono'] text-[10px] text-primary">HEAVY_LOAD</span>
                                    <h4 className="font-headline font-black text-2xl text-on-surface uppercase mb-2">500c</h4>
                                    <p className="text-primary font-headline font-bold mb-6">$39.00</p>
                                    <ul className="space-y-3 mb-8">
                                        <li className="flex items-center gap-2 text-xs text-on-surface font-['JetBrains_Mono'] uppercase">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>done</span> ~30 Hours Audio
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-on-surface font-['JetBrains_Mono'] uppercase">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>done</span> Priority Buffer
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-on-surface font-['JetBrains_Mono'] uppercase">
                                            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>done</span> Unlimited Nodes
                                        </li>
                                    </ul>
                                    <button className="w-full py-3 bg-primary text-on-primary font-headline font-black uppercase text-xs transition-transform active:scale-95">Select</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 text-center px-6 relative">
                    <div className="absolute inset-0 bg-primary/5 -skew-y-3 pointer-events-none"></div>
                    <h2 className="font-headline font-black text-4xl md:text-6xl text-on-surface uppercase mb-8 tracking-tighter">
                        READY TO <span className="text-primary">DECRYPT?</span>
                    </h2>
                    <p className="text-on-surface-variant font-body mb-12 max-w-xl mx-auto">
                        Join 12,000+ power users who have upgraded their meeting intelligence with SPECTAGLINT.
                    </p>
                    <button className="relative z-10 bg-primary text-on-primary px-12 py-6 font-headline font-black uppercase text-xl glow-primary group">
                        Add to Chrome - Free
                    </button>
                    <div className="mt-12 flex justify-center gap-8 opacity-40 grayscale contrast-125">
                        <img className="h-6" alt="Google Meet logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdiy6IiigxbMAqi3cz2oM9ksE8VouUnD4Xjtn7aVxzXVgf-StLeQ05uSJkuTy6NE---i24ZsniWN2YvKhLXOqLjyGvhSbbdzQcGQTXhUTMdFTaaUpSvkcdjtscCcWnXj18KQm5BiysfADqDvyaBaflhMi9FWdMDEQxUjHP6hl_EsKbhQB--IFhNkyrgjT-kDOFXEblnCVI0OmKKqSCwYwmZu70K8mVM1D84zU7kGCOzkkGi-xBe0NjnKVxOf75bCutdD4flWm09Uc" />
                        <img className="h-6" alt="Zoom logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmdKhX4O4GLj2POQqpp_ZomFO8a0_R_tNiv1gBZIYUoyk0yazf7LbN0seIDIIexwSbWeKBeU4FqdwEtJQ1NiZBgMYTNPUVM_UwG7MY-CINYNqz0Jgz6kdKUyb84MHJn2XY3IxGr4J6VAlyclBEU8C6XOJkFHNdWkZ3pf6ZT7x48nZjjNgugX_4rxl60r4f7-5BVaZRT2moz36270ME7FtnvUa9Lm8FGuneQSPgB5V_isVJb_5ApkoPcQict26l7RIImjhsIDrKMeE" />
                        <img className="h-6" alt="Microsoft Teams logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAvZZDr3V5IuPp693ngIFK7kzfpkG8mltyqOtl7Qh6WfmTvk7bF9gV0dU4Kv9zzQFFAaR5jsyzqtk11sZHr8K279lSTzoyMoQjnq2TVagOj7JfZPZSXPWIPRJ1mZuh1EcWwvmfQxfUlrxUkIZ4n3zGliBM8ZxkeZC0TirDlV7evYsXGweR2aIEGrsAaPIZ0n_hSUwEg3fox1HdxBgNBCI9TX-DVuOSBvL7JC0k3RIyPJiZhywPZNKjyqZZQPuaH5p6tgvcxlEri80" />
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-surface-container-lowest border-t border-outline-variant/10 py-12 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <span className="font-['Inter'] font-black tracking-[0.2em] text-primary uppercase text-lg mb-6 block">SPECTAGLINT</span>
                        <p className="text-xs font-body text-on-surface-variant max-w-sm uppercase tracking-widest leading-loose">
                            THE WORLD'S MOST ADVANCED AUDIO INFERENCE TERMINAL. PRIVACY-FIRST, PERFORMANCE-DRIVEN, ALWAYS LISTENING.
                        </p>
                    </div>
                    <div>
                        <h5 className="font-headline font-black text-[10px] text-on-surface uppercase tracking-[0.3em] mb-6">RESOURCES</h5>
                        <ul className="space-y-4 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase">
                            <li><a className="hover:text-primary transition-colors" href="#">Documentation</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">API_Status</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Security_Protocol</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-headline font-black text-[10px] text-on-surface uppercase tracking-[0.3em] mb-6">CONNECT</h5>
                        <ul className="space-y-4 font-['JetBrains_Mono'] text-[10px] text-on-surface-variant uppercase">
                            <li><a className="hover:text-primary transition-colors" href="#">Terminal_Hub</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Twitter_X</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Support_Node</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-outline-variant/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="font-['JetBrains_Mono'] text-[8px] text-on-surface-variant tracking-[0.4em] uppercase">© 2026 SPECTAGLINT_CORP // ALL RIGHTS RESERVED</span>
                    <div className="flex gap-6">
                        <span className="font-['JetBrains_Mono'] text-[8px] text-primary tracking-[0.4em] uppercase">SERVER_STATUS: OPTIMAL</span>
                        <span className="font-['JetBrains_Mono'] text-[8px] text-on-surface-variant tracking-[0.4em] uppercase">LATENCY: 14MS</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
