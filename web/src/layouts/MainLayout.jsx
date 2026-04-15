import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

import LoggedHeader from '../components/LoggedHeader';

const NAV_ITEMS = [
    { to: '/dashboard', label: 'TERMINAL', icon: 'terminal' },
    { to: '/wallet', label: 'WALLET', icon: 'toll' },
    { to: '/feed', label: 'LIVE INTELLIGENCE', icon: 'electric_bolt' },
    { to: '/job-hunt', label: 'JOB BOARD', icon: 'work' },
    { to: '/profile', label: 'PERSONA', icon: 'person' },
    { to: '/history', label: 'HISTORY', icon: 'history' },
    { to: '/config', label: 'NODES', icon: 'settings_input_component' },
    { to: '/settings', label: 'SYSTEM', icon: 'settings' },
];

const MainLayout = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // Auto-sync token to Chrome extension globally anytime user is logged into dashboard
    useEffect(() => {
        const syncGlobalKeys = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                window.postMessage({
                    type: 'SYNC_KEYS',
                    payload: {
                        supabaseToken: session.access_token,
                        backendUrl: import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app'
                    }
                }, '*');
            }
        };
        syncGlobalKeys();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-background text-on-background font-body">

            {/* ── TOP NAV (Full Width) ── */}
            <LoggedHeader onHamburgerClick={() => setSidebarOpen(!sidebarOpen)} />

            {/* ── LOWER SECTION (Sidebar + Content) ── */}
            <div className="flex flex-1">

                {/* ── LEFT SIDEBAR ── */}
                <aside className={`flex-col w-56 md:w-52 shrink-0 bg-surface-container-lowest border-r border-primary border-b border-primary md:border-b-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out fixed md:sticky top-14 md:top-[60px] h-auto md:h-[calc(100vh-60px)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

                    {/* Nav */}
                    < nav className="flex-1 py-4 px-2 space-y-0.5" >
                        {
                            NAV_ITEMS.map(({ to, label, icon }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-3 font-['Inter'] font-black tracking-[0.1em] text-[15px] md:text-[13px] uppercase transition-colors duration-150 cursor-pointer
                    ${isActive
                                            ? 'text-primary border-l-2 border-primary bg-primary/5 pl-[10px]'
                                            : 'text-on-surface-variant/60 hover:text-on-surface border-l-2 border-transparent hover:bg-surface-container/50'
                                        }`
                                    }
                                >
                                    <span className="material-symbols-outlined text-2xl md:text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20" }}>{icon}</span>
                                    {label}
                                </NavLink>
                            ))
                        }
                    </nav >

                    {/* Bottom actions */}
                    < div className="px-3 pb-6 space-y-3 border-t border-outline-variant/10 pt-4" >

                        <button onClick={() => { handleSignOut(); setSidebarOpen(false); }} className="w-full px-2 py-2.5 border border-red-800/60 text-red-500 font-['Inter'] font-black tracking-[0.1em] text-[11px] uppercase hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-xl md:text-base shrink-0">power_settings_new</span>
                            <span className="truncate">SYSTEM_SHUTDOWN</span>
                        </button>
                    </div >
                </aside >

                {/* ── MOBILE SIDEBAR BACKDROP ── */}
                < div
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* ── MAIN CONTENT ── */}
                <main className={`flex-1 p-[10px] md:px-6 md:py-6 md:pb-5 overflow-x-hidden ${sidebarOpen ? 'pointer-events-none' : ''}`}>
                    <div className="max-w-full">
                        <Outlet />
                    </div>
                </main>
            </div >

        </div >
    );
};

export default MainLayout;
