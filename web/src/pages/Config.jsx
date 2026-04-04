import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';

const Config = () => {
    const [prompt, setPrompt] = useState("");
    const [modifiers, setModifiers] = useState({
        directQuestions: true,
        translateSpanish: false,
        detectJargon: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusText, setStatusText] = useState("COMPILER ACTIVE");

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await api.getConfig();
            setPrompt(data.system_prompt || "");
            setModifiers({
                directQuestions: Boolean(data.modifier_direct_only),
                translateSpanish: Boolean(data.modifier_translate_spanish),
                detectJargon: Boolean(data.modifier_detect_jargon),
            });
        } catch (err) {
            console.error('Failed to load config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeploy = async () => {
        setSaving(true);
        setStatusText("DEPLOYING...");
        try {
            await api.updateConfig({
                system_prompt: prompt,
                modifier_direct_only: modifiers.directQuestions,
                modifier_translate_spanish: modifiers.translateSpanish,
                modifier_detect_jargon: modifiers.detectJargon
            });
            setStatusText("DEPLOYMENT SUCCESS");
            setTimeout(() => setStatusText("COMPILER ACTIVE"), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
            setStatusText("DEPLOY_ERROR");
        } finally {
            setSaving(false);
        }
    };

    const toggleModifier = (key) => {
        setModifiers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) {
        return (
            <TechLoader
                title="FETCHING_CONFIG_RECORDS"
                subtitle="LOADING_CONFIGURATION..."
                size="small"
                progress={65}
            />
        );
    }

    return (
        <div className="w-full h-full pb-0 space-y-[10px]">

            <PageHeader
                title="TRAIN YOUR AI"
                label="MODULE // CONFIGURATION"
                description="Optimize global system prompts and inference models to refine how SPECTAGLINT translates and responds to your unique environment."
                mobileDescription="Refine how SPECTAGLINT translates and responds to your unique environment."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[10px] lg:gap-12">

                {/* ── LEFT COLUMN (Terminal & Deploy) ── */}
                <div className="lg:col-span-7 flex flex-col gap-[10px] lg:gap-6">

                    {/* Terminal Editor */}
                    <div className="bg-[#030504] border border-outline-variant/20 rounded-t-sm shadow-2xl flex flex-col overflow-hidden min-h-[380px]">

                        {/* Terminal Header */}
                        <div className="bg-surface-container-highest px-4 py-3 flex items-center justify-between border-b border-outline-variant/30">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_5px_rgba(142,255,113,0.5)]" />
                                </div>
                                <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/70 uppercase tracking-widest ml-4">
                                    SYSTEM_PROMPT.SH - ROOT@SPECTAGLINT
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-sm text-on-surface-variant/50">terminal</span>
                        </div>

                        {/* Text Area */}
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="You are SPECTAGLINT, an advanced AI assistant specialized in real-time language translation and contextual analysis. Your primary function is to provide accurate, culturally sensitive translations while maintaining the original intent and nuance of the conversation. Always prioritize clarity, precision, and user understanding in your responses."
                            spellCheck="false"
                            className="flex-1 w-full bg-transparent text-primary font-['JetBrains_Mono'] text-sm p-5 resize-none focus:outline-none focus:ring-0 placeholder:text-primary/30 leading-relaxed shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
                            style={{ textShadow: '0 0 10px rgba(142,255,113,0.2)' }}
                        />
                    </div>

                    {/* Action Bar */}
                    <div className="bg-surface-container border border-outline-variant/20 p-4 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_rgba(142,255,113,0.8)]" />
                                <span className={`font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest ${statusText.includes('SUCCESS') ? 'text-primary' : statusText.includes('ERROR') ? 'text-red-500' : 'text-on-surface-variant'}`}>
                                    {statusText}
                                </span>
                            </div>
                            <span className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
                                UTF-8 ENCODED
                            </span>
                        </div>
                        <button
                            onClick={handleDeploy}
                            disabled={saving}
                            className="bg-primary text-black font-headline font-black uppercase text-xs px-6 py-2.5 tracking-wider hover:bg-primary-dim transition-colors glow-primary flex items-center gap-2 active:scale-95 disabled:opacity-50">
                            {saving ? 'UPLOADING...' : 'DEPLOY PERSONA'}
                        </button>
                    </div>
                </div>

                {/* ── RIGHT COLUMN (Modifiers) ── */}
                <div className="lg:col-span-5 flex flex-col gap-[10px] md:gap-8">

                    <div>
                        <div className="font-['JetBrains_Mono'] text-[11px] text-on-surface-variant uppercase tracking-[0.2em] mb-4 pb-1 md:pb-3 border-b border-outline-variant/20">
                            BEHAVIORAL MODIFIERS
                        </div>

                        <div className="space-y-3 md:space-y-6 mt-4 md:mt-6">
                            {[
                                {
                                    id: 'directQuestions',
                                    title: 'ONLY ANSWER DIRECT QUESTIONS',
                                    desc: 'Suppresses conversational filler and proactive advice.',
                                },
                                {
                                    id: 'translateSpanish',
                                    title: 'TRANSLATE EVERYTHING TO SPANISH',
                                    desc: 'Auto-routes all output through localized syntax engines.',
                                },
                                {
                                    id: 'detectJargon',
                                    title: 'DETECT TECHNICAL JARGON',
                                    desc: 'Flags specialized terminology for real-time clarification.',
                                },
                            ].map((mod) => (
                                <div
                                    key={mod.id}
                                    className="flex items-start gap-3 md:gap-4 cursor-pointer group"
                                    onClick={() => toggleModifier(mod.id)}
                                >
                                    {/* Custom Checkbox */}
                                    <div className={`mt-0 w-5 h-5 shrink-0 border flex items-center justify-center transition-colors ${modifiers[mod.id]
                                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(142,255,113,0.2)]'
                                        : 'border-outline-variant/40 text-transparent group-hover:border-outline-variant'
                                        }`}>
                                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                                    </div>

                                    {/* Text */}
                                    <div>
                                        <h3 className={`font-headline font-black uppercase text-xs mb-0 md:mb-0.5 tracking-wide transition-colors ${modifiers[mod.id] ? 'text-on-surface' : 'text-on-surface/60'
                                            }`}>
                                            {mod.title}
                                        </h3>
                                        <p className="font-body text-[10px] text-on-surface-variant/50 leading-normal md:leading-relaxed">
                                            {mod.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inference Fidelity Card */}
                    <div className="relative mt-[3px] md:mt-4">
                        {/* The small floating green marker on the left outside */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-primary shadow-[0_0_8px_rgba(142,255,113,0.8)]" />

                        <div className="bg-surface-container-high/40 border-l-2 border-tertiary p-4 md:p-6 shadow-lg">
                            <div className="flex justify-between items-center mb-2 md:mb-3">
                                <span className="font-['JetBrains_Mono'] text-[10px] text-tertiary uppercase tracking-widest">
                                    INFERENCE FIDELITY
                                </span>
                                <span className="font-headline font-bold text-lg text-tertiary tracking-tight drop-shadow-[0_0_8px_rgba(136,246,255,0.4)]">
                                    98.4%
                                </span>
                            </div>

                            <div className="h-1 bg-surface-container-lowest overflow-hidden mb-4 md:mb-6">
                                <div className="h-full bg-tertiary shadow-[0_0_10px_rgba(136,246,255,0.6)]" style={{ width: '98.4%' }} />
                            </div>

                            <div className="font-['JetBrains_Mono'] text-[10px] text-on-surface-variant/60 italic leading-normal md:leading-relaxed">
                                [INFO] Current persona configuration matches high-precision thresholds. No anomalies detected in logic branch.
                            </div>
                        </div>
                    </div>



                </div>
            </div>
        </div>
    );
};

export default Config;
