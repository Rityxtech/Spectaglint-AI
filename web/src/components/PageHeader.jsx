import React from 'react';

const PageHeader = ({ title, label, description, mobileDescription }) => {
    return (
        <div className="mt-[-5px] md:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-[10px] md:mb-5 border-b border-primary pb-0">
            <div className="flex items-start gap-3 md:gap-5">
                <div className="w-1 h-12 md:w-1.5 md:h-16 bg-primary shrink-0" />
                <div>
                    <div className="text-xs md:text-[10px] text-primary/80 uppercase tracking-[0.3em] font-['JetBrains_Mono'] mb-2 md:mb-2.5">
                        {label || 'SPECTAGLINT // MODULE'}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-on-surface uppercase tracking-tight leading-none mb-2 md:mb-3 font-['Inter']">
                        {title}
                    </h1>
                    {description && (
                        <>
                            <p className="hidden md:block text-sm font-['Inter'] text-on-surface-variant max-w-2xl leading-relaxed opacity-70 mb-2 md:mb-2.5">
                                {description}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageHeader;
