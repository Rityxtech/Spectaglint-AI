import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Auth = () => {
    const location = useLocation();
    const [mode, setMode] = useState(location.pathname === '/register' ? 'signup' : 'login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errorVisible, setErrorVisible] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    // Tracks WHY we entered verify mode — critical for correct verifyOtp type
    const [verifyType, setVerifyType] = useState('signup'); // 'signup' | 'recovery'

    // Auto-dismiss error after 4 seconds
    useEffect(() => {
        if (!error) return;
        setErrorVisible(true);
        const fade = setTimeout(() => setErrorVisible(false), 3500);
        const clear = setTimeout(() => setError(null), 4000);
        return () => { clearTimeout(fade); clearTimeout(clear); };
    }, [error]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(60);
    const navigate = useNavigate();

    // Start countdown whenever verify mode is entered
    useEffect(() => {
        if (mode !== 'verify') return;
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [mode]);

    const handleAction = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });

                // Supabase returns this specific error for unverified accounts
                if (error?.message?.toLowerCase().includes('email not confirmed')) {
                    setRedirecting(true);
                    setError('EMAIL NOT VERIFIED — REDIRECTING TO VERIFICATION IN 3S...');
                    setTimeout(async () => {
                        await supabase.auth.resend({ type: 'signup', email });
                        setRedirecting(false);
                        setError(null);
                        setVerifyType('signup'); // email confirmation token
                        setMode('verify');
                    }, 3000);
                    return;
                }

                if (error) throw error;
                navigate('/dashboard');
            }
            else if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username }
                    }
                });
                if (error) throw error;
                setVerifyType('signup'); // email confirmation token
                setMode('verify');
            }
            else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) throw error;
                setVerifyType('recovery'); // password reset token
                setMode('verify');
            }
            else if (mode === 'verify') {
                const token = otp.join('');
                const { error } = await supabase.auth.verifyOtp({
                    email,
                    token,
                    type: verifyType  // 'signup' or 'recovery' — set when entering verify mode
                });
                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message.toUpperCase());
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleOAuth = async (provider) => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message.toUpperCase());
            setLoading(false);
        }
    };

    const renderContent = () => {
        switch (mode) {
            case 'login':
                return (
                    <>
                        <div className="mb-8">
                            <h1 className="font-headline font-black text-[22px] sm:text-3xl text-primary uppercase tracking-tight mb-2">ACCESS_PROTOCOL</h1>
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-[0.2em]">INITIALIZE SECURE UPLINK</p>
                        </div>
                        <form onSubmit={handleAction} className="space-y-5">
                            <div>
                                <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5">IDENTIFIER (EMAIL)</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="USER@SPECTAGLINT.IO"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-1.5">
                                    <label className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">ACCESS_CODE (PASSWORD)</label>
                                    <button type="button" onClick={() => setMode('forgot')} className="text-[9px] text-primary/60 hover:text-primary uppercase tracking-widest transition-colors">FORGOT_CODE?</button>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            {error && (
                                <p
                                    className={`text-[9px] font-bold tracking-widest p-2 border-l-2 transition-opacity duration-500 ${redirecting
                                        ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400'
                                        : 'text-red-500 bg-red-500/10 border-red-500'
                                        }`}
                                    style={{ opacity: redirecting ? 1 : errorVisible ? 1 : 0 }}>
                                    {error}
                                </p>
                            )}
                            <button disabled={loading} className="w-full bg-primary text-black font-headline font-black uppercase text-sm py-4 tracking-widest glow-primary transition-all active:scale-95 mt-4 disabled:opacity-50">
                                {loading ? 'PROCESSING...' : 'EXECUTE_LOGIN'}
                            </button>
                        </form>
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-outline-variant/20"></div>
                                </div>
                                <div className="relative flex justify-center text-[9px] font-['JetBrains_Mono'] uppercase tracking-widest">
                                    <span className="bg-surface-container px-3 text-on-surface-variant/40">EXTERNAL_UPLINK</span>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 border border-outline-variant/30 bg-[#030504] hover:bg-white/5 transition-colors py-2.5 group">
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-3.5 h-3.5 grayscale group-hover:grayscale-0 transition-opacity opacity-70 group-hover:opacity-100" />
                                    <span className="text-[10px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">GOOGLE</span>
                                </button>
                                <button type="button" onClick={() => handleOAuth('facebook')} className="flex items-center justify-center gap-2 border border-outline-variant/30 bg-[#030504] hover:bg-white/5 transition-colors py-2.5 group">
                                    <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-3 h-3 grayscale group-hover:grayscale-0 transition-opacity opacity-70 group-hover:opacity-100" />
                                    <span className="text-[10px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">FACEBOOK</span>
                                </button>
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">
                                NEW NODE? <button onClick={() => setMode('signup')} className="text-primary hover:border-b border-primary/30 transition-all ml-2 font-bold uppercase">REGISTER_ENTITY</button>
                            </p>
                        </div>
                    </>
                );

            case 'signup':
                return (
                    <>
                        <div className="mb-8">
                            <h1 className="font-headline font-black text-[22px] sm:text-3xl text-primary uppercase tracking-tight mb-2">ENTITY_REGISTRY</h1>
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-[0.2em]">ESTABLISH NEW PERIMETER</p>
                        </div>
                        <form onSubmit={handleAction} className="space-y-4">
                            <div>
                                <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5">NODE_NAME (USERNAME)</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="ALPHA_OPERATOR"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5">PRIMARY_UPLINK (EMAIL)</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="OPERATOR@SPECTAGLINT.IO"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5">SECURE_CODE (PASSWORD)</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            {error && (
                                <p className="text-[9px] text-red-500 font-bold tracking-widest bg-red-500/10 p-2 border-l-2 border-red-500 transition-opacity duration-500"
                                    style={{ opacity: errorVisible ? 1 : 0 }}>
                                    {error}
                                </p>
                            )}
                            <button disabled={loading} className="w-full bg-primary text-black font-headline font-black uppercase text-sm py-4 tracking-widest glow-primary transition-all active:scale-95 mt-4 disabled:opacity-50">
                                {loading ? 'PROCESSING...' : 'CREATE_ACCOUNT'}
                            </button>
                        </form>
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-outline-variant/20"></div>
                                </div>
                                <div className="relative flex justify-center text-[9px] font-['JetBrains_Mono'] uppercase tracking-widest">
                                    <span className="bg-surface-container px-3 text-on-surface-variant/40">EXTERNAL_UPLINK</span>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 border border-outline-variant/30 bg-[#030504] hover:bg-white/5 transition-colors py-2.5 group">
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-3.5 h-3.5 grayscale group-hover:grayscale-0 transition-opacity opacity-70 group-hover:opacity-100" />
                                    <span className="text-[10px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">GOOGLE</span>
                                </button>
                                <button type="button" onClick={() => handleOAuth('facebook')} className="flex items-center justify-center gap-2 border border-outline-variant/30 bg-[#030504] hover:bg-white/5 transition-colors py-2.5 group">
                                    <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-3 h-3 grayscale group-hover:grayscale-0 transition-opacity opacity-70 group-hover:opacity-100" />
                                    <span className="text-[10px] text-on-surface-variant group-hover:text-white uppercase tracking-widest font-black transition-colors">FACEBOOK</span>
                                </button>
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">
                                EXISTING NODE? <button onClick={() => setMode('login')} className="text-primary hover:border-b border-primary/30 transition-all ml-2 font-bold uppercase">LOGIN_NOW</button>
                            </p>
                        </div>
                    </>
                );

            case 'forgot':
                return (
                    <>
                        <div className="mb-8">
                            <h1 className="font-headline font-black text-[22px] sm:text-3xl text-primary uppercase tracking-tight mb-2">CODE_RECOVERY</h1>
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-[0.2em]">INITIATING CIPHER RESET</p>
                        </div>
                        <p className="text-[11px] text-on-surface-variant/70 mb-8 leading-relaxed uppercase tracking-wide">
                            ENTER YOUR PRIMARY UPLINK IDENTIFIER TO RECEIVE A TEMPORARY ACCESS HASH.
                        </p>
                        <form onSubmit={handleAction} className="space-y-6">
                            <div>
                                <label className="block text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5">REGISTERED_UPLINK (EMAIL)</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="USER@SPECTAGLINT.IO"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-3 text-xs focus:outline-none focus:border-primary transition-colors placeholder:text-primary/40 font-['JetBrains_Mono']"
                                />
                            </div>
                            {error && (
                                <p className="text-[9px] text-red-500 font-bold tracking-widest bg-red-500/10 p-2 border-l-2 border-red-500 transition-opacity duration-500"
                                    style={{ opacity: errorVisible ? 1 : 0 }}>
                                    {error}
                                </p>
                            )}
                            <button disabled={loading} className="w-full bg-primary text-black font-headline font-black uppercase text-sm py-4 tracking-widest glow-primary transition-all active:scale-95">
                                {loading ? 'PROCESSING...' : 'SEND_HASH'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-[10px] text-on-surface-variant/50 uppercase tracking-[0.3em] hover:text-on-surface transition-colors">
                                ABORT_MISSION
                            </button>
                        </form>
                    </>
                );

            case 'verify':
                return (
                    <>
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_rgba(142,255,113,0.8)] shrink-0" />
                                <h1 className="font-headline font-black text-[22px] sm:text-3xl text-primary uppercase tracking-tight">OTP_VALIDATION</h1>
                            </div>
                            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-[0.2em]">WAITING FOR HANDSHAKE...</p>
                        </div>
                        <p className="text-[11px] text-on-surface-variant/70 mb-8 leading-relaxed uppercase tracking-wide">
                            A 6-DIGIT VERIFICATION HASH HAS BEEN SENT TO {email || 'YOUR PRIMARY UPLINK'}. ENTER THE CODE TO AUTHORIZE ACCESS.
                        </p>
                        <form onSubmit={handleAction} className="space-y-8">
                            <div className="flex justify-between gap-2">
                                {[...Array(6)].map((_, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        maxLength={1}
                                        value={otp[i]}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        className="w-12 h-14 bg-[#030504] border border-outline-variant/30 text-primary text-center font-headline font-black text-xl focus:outline-none focus:border-primary transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]"
                                    />
                                ))}
                            </div>
                            <div className="space-y-4">
                                {error && (
                                    <p className="text-[9px] text-red-500 font-bold tracking-widest bg-red-500/10 p-2 border-l-2 border-red-500 transition-opacity duration-500"
                                        style={{ opacity: errorVisible ? 1 : 0 }}>
                                        {error}
                                    </p>
                                )}
                                <button disabled={loading} className="w-full bg-primary text-black font-headline font-black uppercase text-sm py-4 tracking-widest glow-primary transition-all active:scale-95">
                                    {loading ? 'AUTHORIZING...' : 'AUTHORIZE_NODE'}
                                </button>
                                <div className="text-center">
                                    {countdown > 0 ? (
                                        <div className="flex items-center justify-center gap-2 text-[9px] text-on-surface-variant/40 uppercase tracking-[0.2em] font-['JetBrains_Mono']">
                                            <span>RESEND_AVAILABLE IN</span>
                                            <span className="text-primary font-bold tabular-nums w-8 text-left">
                                                {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                await supabase.auth.resend({ type: 'signup', email });
                                                setCountdown(60);
                                            }}
                                            className="text-[9px] text-primary uppercase tracking-[0.2em] hover:underline transition-all font-bold">
                                            REQUEST_RESEND_HASH
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background font-body relative overflow-hidden flex items-center justify-center py-20 px-6">
            <div className="absolute inset-0 pointer-events-none bg-noise"></div>
            <div className="absolute inset-0 z-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(#8eff71 0.5px, transparent 0.5px)',
                backgroundSize: '30px 30px'
            }}></div>
            <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:block space-y-10">
                <div className="rotate-90 origin-left text-[9px] text-primary/20 uppercase tracking-[1em] whitespace-nowrap">SPECTAGLINT_SYSTEM_INIT</div>
                <div className="h-40 w-px bg-primary/10 ml-2"></div>
            </div>
            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-12">
                    <Link to="/" className="inline-block font-['Inter'] font-black tracking-[0.3em] text-2xl text-primary md:text-3xl uppercase drop-shadow-[0_0_15px_rgba(142,255,113,0.2)]">
                        SPECTAGLINT
                    </Link>
                </div>
                <div className="bg-surface-container border border-outline-variant/20 p-6 sm:p-10 relative shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 flex">
                        <div className="flex-1 bg-primary/30" />
                        <div className="w-20 bg-primary shadow-[0_0_15px_rgba(142,255,113,0.5)]" />
                        <div className="flex-1 bg-primary/30" />
                    </div>
                    <div className="absolute inset-0 bg-[#000]/10 mix-blend-overlay pointer-events-none" />
                    {renderContent()}
                    <div className="absolute bottom-0 right-0 p-1">
                        <div className="w-4 h-4 border-r-2 border-b-2 border-primary/20" />
                    </div>
                </div>
                <div className="mt-8 flex justify-between items-center text-[8px] text-on-surface-variant/30 uppercase tracking-[0.3em] font-['JetBrains_Mono']">
                    <span>SECURE_SHELL v2.04</span>
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        SERVER_ACTIVE
                    </span>
                    <span>AES_256_E2EE</span>
                </div>
            </div>
        </div>
    );
};

export default Auth;
