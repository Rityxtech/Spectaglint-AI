import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    User,
    Code,
    Briefcase,
    FolderGit2,
    Info,
    FileText,
    Globe,
    Plus,
    Trash2,
    Save,
    UploadCloud,
    CheckCircle,
    Terminal as Github,
    Users as LinkedinIcon
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");

    const [profile, setProfile] = useState({
        username: '',
        full_name: '',
        bio: '',
        resume_url: '',
        avatar_url: '',
        skills: [],
        experience: [],
        projects: [],
        social_links: { github: '', linkedin: '', website: '' }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getProfile();
            setProfile({
                username: data.username || '',
                full_name: data.full_name || '',
                bio: data.bio || '',
                resume_url: data.resume_url || '',
                avatar_url: data.avatar_url || '',
                skills: data.skills ? JSON.parse(data.skills) : [],
                experience: data.experience ? JSON.parse(data.experience) : [],
                projects: data.projects ? JSON.parse(data.projects) : [],
                social_links: data.social_links ? JSON.parse(data.social_links) : { github: '', linkedin: '', website: '' }
            });
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus("SAVING_PROTOCOL...");
        try {
            await api.updateProfile(profile);
            setStatus("PROFILE_SYNCED");
            setTimeout(() => setStatus(""), 3000);
        } catch (err) {
            setStatus("UPLINK_ERROR");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('resume', file);

        setStatus("UPLOADING_CV...");
        try {
            const { resume_url } = await api.uploadResume(formData);
            setProfile(p => ({ ...p, resume_url }));
            setStatus("CV_STORED_S3_LOCAL");
            setTimeout(() => setStatus(""), 3000);
        } catch (err) {
            setStatus("UPLOAD_FAILED");
        }
    };

    const addItem = (key, template) => {
        setProfile(p => ({ ...p, [key]: [...p[key], template] }));
    };

    const removeItem = (key, index) => {
        setProfile(p => ({
            ...p,
            [key]: p[key].filter((_, i) => i !== index)
        }));
    };

    const updateItem = (key, index, field, value) => {
        setProfile(p => ({
            ...p,
            [key]: p[key].map((item, i) => i === index ? { ...item, [field]: value } : item)
        }));
    };

    if (loading) {
        return (
            <TechLoader
                title="RECONSTRUCTING_PERSONA"
                subtitle="LOADING_PROFILE_DATA..."
                size="small"
                progress={50}
            />
        );
    }

    return (
        <div className="w-full pb-0 space-y-[10px] md:space-y-0 animate-in fade-in duration-700">
            <PageHeader
                title="PROFESSIONAL_PERSONA"
                label="USER // DOSSIER"
                description="Synchronize your clinical expertise, career history, and technical stacks with the neural engine to receive context-aware intelligence."
                mobileDescription="Sync your expertise, career history, and tech stacks with the neural engine for context-aware intelligence."
            />
            {/* Header Content with Avatar & Save */}
            <div className="flex flex-row md:items-center justify-between gap-[10px] md:gap-6 my-[10px]">
                <div className="flex items-center gap-[10px] md:gap-5">
                    <div className="w-12 h-12 bg-surface-container border border-outline-variant/20 flex items-center justify-center group relative overflow-hidden">
                        <img
                            src={profile.avatar_url || "https://api.dicebear.com/9.x/bottts/svg?seed=SpectaGlint&backgroundColor=0a0f0d&baseColor=39ff14"}
                            alt="Persona Image"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                            <span className="text-[8px] text-white font-bold">CHANGE</span>
                        </div>
                    </div>
                    <div className="md:hidden text-[10px] text-primary/80 font-['JetBrains_Mono']">{status}</div>
                </div>

                <div className="flex flex-row items-center gap-3">
                    <div className="hidden md:block text-[10px] text-primary/80 font-['JetBrains_Mono'] h-4">{status}</div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary text-black px-4 md:px-8 py-3 font-['Inter'] font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-primary-dim transition-all glow-primary active:scale-95 disabled:opacity-50"
                    >
                        <Save size={16} /> COMMIT_PROFILE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-10">

                {/* ── LEFT COLUMN (Personal & Bio) ── */}
                <div className="xl:col-span-4 space-y-[10px] md:space-y-8 mb-[-14px] md:mb-0">

                    {/* Basic Info */}
                    <section className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6">
                        <h2 className="text-[11px] font-['JetBrains_Mono'] font-bold text-on-surface-variant uppercase tracking-widest mb-2 md:mb-6 flex items-center gap-2">
                            <Info size={14} className="text-primary" /> GENERAL_DATA
                        </h2>
                        <div className="space-y-[10px] md:space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase text-on-surface-variant/40 font-bold mb-1 md:mb-1.5 tracking-wider">FULL_LEGAL_NAME</label>
                                <input
                                    type="text"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
                                    placeholder="Enter your name"
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-2 text-xs focus:outline-none focus:border-primary transition-colors font-['JetBrains_Mono']"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-on-surface-variant/40 font-bold mb-1 md:mb-1.5 tracking-wider">SYSTEM_BIO</label>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                    placeholder="Briefly describe yourself..."
                                    rows={4}
                                    className="w-full bg-[#030504] border border-outline-variant/30 text-on-surface p-2 text-xs focus:outline-none focus:border-primary transition-colors font-['JetBrains_Mono'] resize-none"
                                />
                                <p className="text-[8px] text-on-surface-variant/30 mt-1 uppercase italic">This context is used for AI personality alignment.</p>
                            </div>
                        </div>
                    </section>

                    {/* Socials & Resume */}
                    <section className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6 mb-[-14px] md:mb-0">
                        <h2 className="text-[11px] font-['JetBrains_Mono'] font-bold text-on-surface-variant uppercase tracking-widest mb-2 md:mb-6 flex items-center gap-2">
                            <UploadCloud size={14} className="text-primary" /> EXTERNAL_LINKS
                        </h2>
                        <div className="space-y-[10px] md:space-y-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Github size={18} className="text-on-surface-variant/30 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="GitHub URL"
                                    value={profile.social_links.github}
                                    onChange={(e) => setProfile(p => ({ ...p, social_links: { ...p.social_links, github: e.target.value } }))}
                                    className="flex-1 bg-transparent border-b border-outline-variant/20 text-xs py-1 md:py-1.5 focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
                                <LinkedinIcon size={18} className="text-on-surface-variant/30 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="LinkedIn URL"
                                    value={profile.social_links.linkedin}
                                    onChange={(e) => setProfile(p => ({ ...p, social_links: { ...p.social_links, linkedin: e.target.value } }))}
                                    className="flex-1 bg-transparent border-b border-outline-variant/20 text-xs py-1 md:py-1.5 focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
                                <Globe size={18} className="text-on-surface-variant/30 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Personal Website"
                                    value={profile.social_links.website}
                                    onChange={(e) => setProfile(p => ({ ...p, social_links: { ...p.social_links, website: e.target.value } }))}
                                    className="flex-1 bg-transparent border-b border-outline-variant/20 text-xs py-1 md:py-1.5 focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="pt-4 md:pt-6">
                                <label className="block text-[10px] uppercase text-on-surface-variant/40 font-bold mb-2 md:mb-3 tracking-wider">RESUME // CV (PDF)</label>
                                <div className={`relative border-2 border-dashed ${profile.resume_url ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/20'} p-3 md:p-4 flex flex-col items-center justify-center group overflow-hidden`}>
                                    <FileText className={`mb-1 md:mb-2 ${profile.resume_url ? 'text-primary' : 'text-on-surface-variant/30'}`} size={24} />
                                    <div className="text-[10px] font-['JetBrains_Mono'] text-on-surface text-center mb-1 md:mb-2">
                                        {profile.resume_url ? 'CV_UPLOADED_SECURELY' : 'DROP_FILE_HERE'}
                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleResumeUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {profile.resume_url && (
                                        <a href={profile.resume_url} target="_blank" rel="noreferrer" className="text-[9px] text-primary uppercase underline hover:no-underline z-10">VIEW_CURRENT_DOCUMENT</a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                {/* ── RIGHT COLUMN (Skills, XP, Projects) ── */}
                <div className="xl:col-span-8 space-y-[10px] md:space-y-8">

                    {/* Skills Matrix */}
                    <section className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6">
                        <div className="flex items-center justify-between mb-[10px] md:mb-8">
                            <h2 className="text-[11px] font-['JetBrains_Mono'] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                                <Code size={14} className="text-primary" /> TECH_STACK_MATRIX
                            </h2>
                            <button
                                onClick={() => addItem('skills', { name: '', level: 80, category: 'ENGINEERING' })}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary border border-primary/20 px-2 py-1 hover:bg-primary/5 transition-colors"
                            >
                                <Plus size={12} /> ADD_SKILL
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-[10px] md:gap-y-6">
                            {profile.skills.map((skill, idx) => (
                                <div key={idx} className="space-y-2 group">
                                    <div className="flex items-center justify-between">
                                        <input
                                            type="text"
                                            value={skill.name}
                                            onChange={(e) => updateItem('skills', idx, 'name', e.target.value)}
                                            placeholder="SKILL_NAME"
                                            className="bg-transparent border-none text-[11px] font-black uppercase text-on-surface focus:outline-none placeholder:text-on-surface-variant/20"
                                        />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-['JetBrains_Mono'] text-primary/50">{skill.level}%</span>
                                            <button onClick={() => removeItem('skills', idx)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-500">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={skill.level}
                                        onChange={(e) => updateItem('skills', idx, 'level', parseInt(e.target.value))}
                                        className="w-full accent-primary h-1 bg-[#0a0f0d] appearance-none rounded-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Work Experience */}
                    <section className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6">
                        <div className="flex items-center justify-between mb-[10px] md:mb-8">
                            <h2 className="text-[11px] font-['JetBrains_Mono'] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={14} className="text-primary" /> EXPERIENCE_LOGS
                            </h2>
                            <button
                                onClick={() => addItem('experience', { company: '', role: '', period: '', details: '' })}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary border border-primary/20 px-2 py-1 hover:bg-primary/5 transition-colors"
                            >
                                <Plus size={12} /> ADD_XP
                            </button>
                        </div>

                        <div className="space-y-[10px] md:space-y-6">
                            {profile.experience.map((xp, idx) => (
                                <div key={idx} className="relative pl-6 border-l-2 border-outline-variant/20 pb-2 group">
                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-outline-variant/30 group-hover:bg-primary transition-colors" />
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-1 flex-1">
                                            <input
                                                className="bg-transparent border-none text-sm font-black uppercase inline-block w-full focus:outline-none"
                                                value={xp.role}
                                                onChange={(e) => updateItem('experience', idx, 'role', e.target.value)}
                                                placeholder="ROLE_OR_TITLE"
                                            />
                                            <div className="flex items-center gap-3">
                                                <input
                                                    className="bg-transparent border-none text-[10px] text-primary focus:outline-none"
                                                    value={xp.company}
                                                    onChange={(e) => updateItem('experience', idx, 'company', e.target.value)}
                                                    placeholder="ENTITY_OR_COMPANY"
                                                />
                                                <input
                                                    className="bg-transparent border-none text-[10px] text-on-surface-variant/40 focus:outline-none"
                                                    value={xp.period}
                                                    onChange={(e) => updateItem('experience', idx, 'period', e.target.value)}
                                                    placeholder="PERIOD (e.g. 2021-2024)"
                                                />
                                            </div>
                                        </div>
                                        <button onClick={() => removeItem('experience', idx)} className="text-red-500/30 hover:text-red-500 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full bg-[#030504]/30 border border-transparent hover:border-outline-variant/10 p-2 text-xs text-on-surface-variant resize-none focus:outline-none focus:border-primary/20 transition-all font-body"
                                        rows={2}
                                        value={xp.details}
                                        onChange={(e) => updateItem('experience', idx, 'details', e.target.value)}
                                        placeholder="Brief summary of achievements..."
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Projects Portfolio */}
                    <section className="bg-surface-container border border-outline-variant/20 p-[10px] md:p-6">
                        <div className="flex items-center justify-between mb-[10px] md:mb-8">
                            <h2 className="text-[11px] font-['JetBrains_Mono'] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                                <FolderGit2 size={14} className="text-primary" /> PROJECT_UPLINKS
                            </h2>
                            <button
                                onClick={() => addItem('projects', { title: '', stack: '', description: '', link: '' })}
                                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary border border-primary/20 px-2 py-1 hover:bg-primary/5 transition-colors"
                            >
                                <Plus size={12} /> NEW_PROJECT
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px] md:gap-4">
                            {profile.projects.map((proj, idx) => (
                                <div key={idx} className="bg-surface-container-high border border-outline-variant/10 p-3 md:p-4 relative group">
                                    <button onClick={() => removeItem('projects', idx)} className="absolute top-4 right-4 text-red-500/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={14} />
                                    </button>
                                    <input
                                        className="bg-transparent border-none text-xs font-black uppercase mb-1 focus:outline-none w-[85%]"
                                        value={proj.title}
                                        onChange={(e) => updateItem('projects', idx, 'title', e.target.value)}
                                        placeholder="PROJECT_TITLE"
                                    />
                                    <input
                                        className="bg-transparent border-none text-[9px] text-primary/70 mb-3 focus:outline-none w-full font-['JetBrains_Mono']"
                                        value={proj.stack}
                                        onChange={(e) => updateItem('projects', idx, 'stack', e.target.value)}
                                        placeholder="TECH_STACK (e.g. React, Node, AWS)"
                                    />
                                    <textarea
                                        className="w-full bg-[#030504]/30 border-none p-2 text-[11px] text-on-surface-variant resize-none focus:outline-none mb-3"
                                        rows={3}
                                        value={proj.description}
                                        onChange={(e) => updateItem('projects', idx, 'description', e.target.value)}
                                        placeholder="Brief project description..."
                                    />
                                    <input
                                        className="bg-transparent border-none text-[9px] text-on-surface-variant/40 hover:text-primary transition-colors focus:outline-none w-full"
                                        value={proj.link}
                                        onChange={(e) => updateItem('projects', idx, 'link', e.target.value)}
                                        placeholder="LIVE_URL_OR_GIT_LINK"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                </div>

            </div>

        </div>
    );
};

export default Profile;
