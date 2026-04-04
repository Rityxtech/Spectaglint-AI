import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function LoggedHeader({ onHamburgerClick }) {
    const [balance, setBalance] = useState(0);
    const [avatar, setAvatar] = useState(null);
    const TECH_AVATAR_FALLBACK = "https://api.dicebear.com/9.x/bottts/svg?seed=SpectaGlint&backgroundColor=0a0f0d&baseColor=39ff14";

    useEffect(() => {
        api.getWallet()
            .then(data => setBalance(data.wallet?.balance || 0))
            .catch(console.error);

        api.getProfile()
            .then(data => setAvatar(data?.avatar_url || null))
            .catch(console.error);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-surface-container-lowest border-b border-primary px-3 md:px-6 py-2 md:py-3 flex items-center justify-between h-14 md:h-[60px]">
            <Link to="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                <span className="font-['Inter'] font-black tracking-[0.2em] text-lg text-primary uppercase">SPECTAGLINT</span>
            </Link>

            <div className="flex items-center gap-2 md:gap-4">
                <Link to="/wallet" title="Access Wallet" className="flex items-center gap-2 px-2.5 py-1 md:px-3 md:py-1.5 bg-[#030504]/50 border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group">
                    <span className="material-symbols-outlined text-[14px] md:text-[16px] text-primary/60 group-hover:text-primary">memory</span>
                    <div className="flex items-baseline gap-1 md:gap-1.5 font-['JetBrains_Mono']">
                        <span className="text-[14px] md:text-[15px] text-primary font-black tracking-tight drop-shadow-[0_0_5px_rgba(57,255,20,0.3)]">{balance.toLocaleString()}</span>
                        <span className="text-[10px] md:text-[9px] text-primary/60 font-bold leading-none">
                            <span className="sm:hidden">c</span>
                            <span className="hidden sm:inline tracking-[0.15em]">COINS</span>
                        </span>
                    </div>
                </Link>
                <Link to="/settings" className="hidden md:flex w-9 h-9 bg-surface-container-high border border-outline-variant/30 items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors group">
                    <img src={avatar || TECH_AVATAR_FALLBACK} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-90 group-hover:opacity-100" />
                </Link>
                {onHamburgerClick ? (
                    <button onClick={onHamburgerClick} className="md:hidden w-9 h-9 bg-surface-container-high border border-outline-variant/30 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors group">
                        <img src={avatar || TECH_AVATAR_FALLBACK} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-90 group-hover:opacity-100" />
                    </button>
                ) : (
                    <Link to="/dashboard" title="Go to Dashboard" className="md:hidden w-9 h-9 bg-surface-container-high border border-outline-variant/30 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary transition-colors group">
                        <img src={avatar || TECH_AVATAR_FALLBACK} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-90 group-hover:opacity-100" />
                    </Link>
                )}
            </div>
        </header>
    );
}
