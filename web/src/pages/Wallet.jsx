import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import TechLoader from '../components/TechLoader';

const Wallet = () => {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getWallet();
            setWallet(data.wallet);
            setTransactions(data.transactions || []);
        } catch (err) {
            console.error('Failed to load wallet data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (packageId) => {
        try {
            const { url } = await api.purchaseCoins(packageId);
            if (url) window.location.href = url;
            else alert("Stripe integration pending. API returned no URL.");
        } catch (err) {
            alert("Checkout failed: " + err.message);
        }
    };

    if (loading) {
        return (
            <TechLoader
                title="READING_LEDGER_DATA"
                subtitle="LOADING_WALLET_BALANCE..."
                size="small"
                progress={60}
            />
        );
    }

    return (
        <div className="w-full pb-0 space-y-[10px]">
            <PageHeader
                title="COMMAND_WALLET"
                label="SYSTEM // FINANCE"
                description="Manage your neural telemetry coins, billing history, and session limits in one central ledger."
                mobileDescription="Manage your coins, billing history, and session limits in one central ledger."
            />
            <section className="bg-surface-container border border-outline-variant/20 p-3 md:p-8 relative overflow-hidden mb-[10px] md:mb-8">
                {/* Visual Ambient Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none"></div>

                <div className="relative flex items-center justify-between gap-1.5 md:gap-6 text-left">
                    <div className="flex items-center gap-2 md:gap-6 flex-1 min-w-0">
                        <div className="w-9 h-9 md:w-16 md:h-16 flex items-center justify-center border border-dashed border-primary/30 bg-[#030504]/50 flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-base md:text-3xl">database</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <h2 className="text-[7px] md:text-[10px] font-black tracking-widest md:tracking-[0.2em] text-on-surface-variant/50 uppercase mb-0.5 md:mb-2 truncate">ACTIVE_DATA_CREDITS</h2>
                            <div className="flex items-baseline justify-start gap-1 md:gap-2">
                                <span className="text-2xl md:text-5xl font-black text-on-surface drop-shadow-[0_0_15px_rgba(57,255,20,0.15)] tracking-tight leading-none">
                                    {wallet?.balance?.toLocaleString() || 0}
                                </span>
                                <span className="text-[7px] md:text-[10px] font-mono text-primary/70 uppercase tracking-widest shadow-sm">
                                    COINS
                                </span>
                            </div>
                        </div>
                    </div>

                    <button title="Deposit Coins" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="flex items-center justify-center w-7 h-7 md:w-10 md:h-10 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-[#0A0F0D] transition-colors flex-shrink-0 shadow-[0_0_10px_rgba(57,255,20,0.1)] ml-1 md:ml-0">
                        <span className="material-symbols-outlined text-[16px] md:text-[22px]">add</span>
                    </button>

                    <div className="flex flex-col items-end border-l border-outline-variant/20 pl-2 md:pl-6 space-y-1 md:space-y-2 flex-shrink-0">
                        <div className="hidden sm:block text-[9px] uppercase tracking-widest text-on-surface-variant/40">LEDGER_STATE</div>
                        <div className="block sm:hidden text-[7px] uppercase tracking-[0.1em] text-on-surface-variant/40">STATUS</div>
                        <div className="flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-0.5 md:py-1 bg-primary/5 border border-primary/20">
                            <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary animate-pulse"></div>
                            <span className="text-[7px] md:text-[10px] font-bold text-primary tracking-widest uppercase">IN_SYNC</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Account Analytics Sub-Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-[10px] md:mb-6">
                <div className="bg-surface-container border border-outline-variant/20 p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative">
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px] md:text-[12px] text-primary">data_usage</span> Burn Rate</div>
                        <div className="text-base md:text-xl font-black text-on-surface">Optimal <span className="text-[8px] md:text-[9px] text-primary/70 font-mono tracking-widest">STABLE</span></div>
                    </div>
                </div>
                <div className="bg-surface-container border border-outline-variant/20 p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative">
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px] md:text-[12px] text-primary">history</span> Last Uplink</div>
                        <div className="text-base md:text-xl font-black text-on-surface">&lt; 1m <span className="text-[8px] md:text-[9px] text-primary/70 font-mono tracking-widest">AGO</span></div>
                    </div>
                </div>
                <div className="bg-surface-container border border-outline-variant/20 p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative">
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px] md:text-[12px] text-primary">receipt_long</span> Next Billing</div>
                        <div className="text-base md:text-xl font-black text-on-surface">Manual <span className="text-[8px] md:text-[9px] text-primary/70 font-mono tracking-widest">PAYG</span></div>
                    </div>
                </div>
                <div className="bg-surface-container border border-outline-variant/20 p-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="relative">
                        <div className="text-[8px] md:text-[9px] text-on-surface-variant/50 uppercase tracking-widest mb-1.5 md:mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-[10px] md:text-[12px] text-primary">verified_user</span> Security</div>
                        <div className="text-base md:text-xl font-black text-on-surface">AES-256 <span className="text-[8px] md:text-[9px] text-primary/70 font-mono tracking-widest">SECURE</span></div>
                    </div>
                </div>
            </div>

            {/* Network Telemetry / Burn Rate Chart */}
            <div className="card p-3 md:p-6 mb-[10px] md:mb-12 relative overflow-hidden">
                {/* Ambient Grid Background */}
                <div className="absolute inset-0 bg-noise pointer-events-none"></div>
                <div className="flex justify-between items-start mb-3 md:mb-8 relative z-10">
                    <div>
                        <h3 className="font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-widest text-on-surface/80">
                            <Zap size={16} className="text-primary flex-shrink-0" /> Token Consumption Matrix
                        </h3>
                        <p className="text-[10px] md:text-xs text-muted mt-1 font-mono uppercase">Analyzing burn rate over last 7 cycles</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs md:text-sm text-primary font-mono glow-text font-bold">-342.50</div>
                        <div className="text-[8px] md:text-[10px] text-primary/50 uppercase tracking-widest mt-0.5">NET_BURN_7D</div>
                    </div>
                </div>

                <div className="h-20 md:h-48 flex items-end justify-between gap-1.5 md:gap-4 border-b border-primary/20 pb-1 md:pb-2 relative z-10 pt-2 md:pt-4">
                    {/* Horizontal Y-Axis grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                        <div className="border-t border-dashed border-primary/50 w-full"></div>
                        <div className="border-t border-dashed border-primary/50 w-full"></div>
                        <div className="border-t border-dashed border-primary/50 w-full"></div>
                        <div className="border-t border-dashed border-primary/50 w-full"></div>
                    </div>

                    {/* Simulated Data Points */}
                    {[45, 75, 40, 90, 55, 65, 85].map((height, index) => (
                        <div key={index} className="w-full relative group h-full flex items-end">
                            {/* Hover Data Tooltip */}
                            <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 bg-[#0A0F0D] border border-primary/30 text-primary text-[10px] font-mono px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-[0_0_10px_rgba(57,255,20,0.2)]">
                                {height * 10}
                            </div>
                            {/* Bar Graphic */}
                            <div
                                className="bg-primary/20 group-hover:bg-primary/40 border border-primary/30 w-full transition-all duration-300 relative overflow-hidden"
                                style={{ height: `${height}%` }}
                            >
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary glow-text"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-primary/10"></div>
                            </div>
                            {/* X-Axis Label */}
                            <div className="absolute -bottom-5 md:-bottom-6 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] text-on-surface-variant/50 font-mono tracking-widest">
                                T-{7 - index}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="h-5 md:h-6"></div> {/* Padding for bottom labels */}
            </div>

            {/* Top Up Tiers */}
            <h2 className="font-bold text-[12px] md:text-sm mb-1 md:mb-6 uppercase tracking-[0.1em] text-on-surface/80 border-b border-outline-variant/20 pb-1.5 md:pb-2">Select Infrastructure Tier</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] md:gap-6 mb-[10px] md:mb-12">
                {/* Tier 1 */}
                <div className="card py-3 px-4 md:p-6 flex flex-col items-center text-center hover:border-[var(--accent-secondary)] cursor-pointer">
                    <div className="text-xl font-bold mb-0.5 md:mb-2">$1.99</div>
                    <div className="text-2xl text-[var(--accent-primary)] font-mono font-bold mb-2 md:mb-4">100 Coins</div>
                    <p className="text-sm text-muted mb-3 md:mb-6 leading-tight">Perfect for occasional syncs.</p>
                    <button onClick={() => handlePurchase('starter')} className="btn btn-outline w-full mt-auto py-2 md:py-2.5 min-h-[36px]">Initialize Payment</button>
                </div>

                {/* Tier 2 */}
                <div className="card py-3 px-4 md:p-6 flex flex-col items-center text-center border-[var(--accent-primary)] shadow-[0_0_20px_rgba(57,255,20,0.1)] relative cursor-pointer transform hover:-translate-y-1">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-primary)] text-black text-xs font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1">
                        <Zap size={10} /> OPTIMAL
                    </div>
                    <div className="text-xl font-bold mb-0.5 md:mb-2 mt-1 md:mt-0">$7.99</div>
                    <div className="text-3xl text-[var(--accent-primary)] glow-text font-mono font-bold mb-2 md:mb-4">500 Coins</div>
                    <p className="text-sm text-muted mb-3 md:mb-6 leading-tight">Best value for weekly telemetry.</p>
                    <button onClick={() => handlePurchase('pro')} className="btn btn-primary w-full mt-auto py-2 md:py-2.5 min-h-[36px]">Initialize Payment</button>
                </div>

                {/* Tier 3 */}
                <div className="card py-3 px-4 md:p-6 flex flex-col items-center text-center hover:border-[var(--accent-secondary)] cursor-pointer">
                    <div className="text-xl font-bold mb-0.5 md:mb-2">$19.99</div>
                    <div className="text-2xl text-[var(--accent-primary)] font-mono font-bold mb-2 md:mb-4">1500 Coins</div>
                    <p className="text-sm text-muted mb-3 md:mb-6 leading-tight">Heavy protocol usage. Bulk discount applied.</p>
                    <button onClick={() => handlePurchase('elite')} className="btn btn-outline w-full mt-auto py-2 md:py-2.5 min-h-[36px]">Initialize Payment</button>
                </div>
            </div>

            {/* Transaction History */}
            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[#0A0F0D]">
                    <h3 className="font-bold flex items-center gap-2"><Clock size={16} /> Transaction Ledgers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm font-mono">
                        <thead className="bg-[#151c19] text-[10px] md:text-xs uppercase text-secondary">
                            <tr>
                                <th className="px-2 md:px-6 py-2 md:py-3 border-b border-[var(--border-color)]">Date</th>
                                <th className="px-2 md:px-6 py-2 md:py-3 border-b border-[var(--border-color)]">Transaction ID</th>
                                <th className="px-2 md:px-6 py-2 md:py-3 border-b border-[var(--border-color)]">Amount</th>
                                <th className="px-2 md:px-6 py-2 md:py-3 border-b border-[var(--border-color)]">Yield</th>
                                <th className="px-2 md:px-6 py-2 md:py-3 border-b border-[var(--border-color)]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-2 md:px-6 py-6 text-center text-muted font-['JetBrains_Mono'] text-xs">NO_TRANSACTION_HISTORY_FOUND</td>
                                </tr>
                            ) : transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-[#0A0F0D]">
                                    <td className="px-2 md:px-6 py-3 md:py-4 border-b border-[var(--border-color)] text-muted whitespace-nowrap">{new Date(tx.created_at).toISOString().split('T')[0]}</td>
                                    <td className="px-2 md:px-6 py-3 md:py-4 border-b border-[var(--border-color)] truncate max-w-[80px] md:max-w-[120px]" title={tx.id}>{tx.id.split('-')[0].toUpperCase()}...</td>
                                    <td className="px-2 md:px-6 py-3 md:py-4 border-b border-[var(--border-color)] text-secondary">{tx.description}</td>
                                    <td className={`px-2 md:px-6 py-3 md:py-4 border-b border-[var(--border-color)] font-bold ${tx.amount > 0 ? 'text-[var(--accent-primary)]' : 'text-red-400'} whitespace-nowrap`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount} Coins
                                    </td>
                                    <td className="px-2 md:px-6 py-3 md:py-4 border-b border-[var(--border-color)]"><span className="badge text-[10px] md:text-xs">{tx.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Wallet;
