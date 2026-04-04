import React from 'react';
import { BrainCircuit } from 'lucide-react';

const TechLoader = ({
    title = "INITIALIZING_NEURAL_UPLINK",
    subtitle = "LOADING AI SYSTEMS...",
    progress = 70,
    showIndicators = true,
    size = "large"
}) => {
    const containerHeight = "min-h-screen";
    const spinnerSize = size === "large" ? "w-20 h-20" : "w-16 h-16";
    const iconSize = size === "large" ? 28 : 24;
    const progressClass = size === "large" ? "w-64" : "w-48";
    const textSize = size === "large" ? "text-sm" : "text-xs";
    const indicatorSize = size === "large" ? "text-xs" : "text-[10px]";

    return (
        <div className={`flex flex-col ${containerHeight} items-center justify-center space-y-8`}>
            <div className="relative">
                {/* Outer ring */}
                <div className={`${spinnerSize} border-4 border-primary/10 rounded-full`}></div>
                {/* Inner spinning ring */}
                <div className={`absolute inset-0 ${spinnerSize} border-4 border-transparent border-t-primary rounded-full animate-spin`}></div>
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="text-primary animate-pulse" size={iconSize} />
                </div>
            </div>

            {/* Progress bar */}
            <div className={`${progressClass} space-y-2`}>
                <div className="w-full h-1 bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-primary animate-pulse-slow" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-center">
                    <div className={`${textSize} text-primary font-['JetBrains_Mono'] uppercase tracking-wider animate-pulse`}>
                        {title}
                    </div>
                    <div className="text-xs text-on-surface-variant/60 font-['JetBrains_Mono'] uppercase tracking-wide mt-1">
                        {subtitle}
                    </div>
                </div>
            </div>

            {/* Tech indicators */}
            {showIndicators && (
                <div className={`flex space-x-4 ${indicatorSize} font-['JetBrains_Mono'] uppercase tracking-wide text-on-surface-variant/40`}>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <span>CONNECTING</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <span>PROCESSING</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <span>READY</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechLoader;