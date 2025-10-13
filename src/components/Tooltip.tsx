import React, { useState, useRef } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (!text) return;
        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
        }, 300); // 300ms delay before showing
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    return (
        <div 
            className="tooltip-wrapper" 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {isVisible && (
                <div className="tooltip-content" role="tooltip">
                    {text}
                </div>
            )}
            <style>{`
                .tooltip-wrapper {
                    position: relative;
                    display: block; /* Changed to block for full-width nav buttons */
                }
                .tooltip-content {
                    position: absolute;
                    bottom: 50%;
                    left: 100%;
                    transform: translateY(50%);
                    margin-left: 12px;
                    padding: 8px 12px;
                    background-color: var(--tooltip-background);
                    color: white;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    white-space: nowrap;
                    z-index: 100;
                    pointer-events: none;
                    animation: fadeIn 0.15s ease-in;
                }
                html[dir="rtl"] .tooltip-content {
                    left: auto;
                    right: 100%;
                    margin-left: 0;
                    margin-right: 12px;
                }
                .tooltip-content::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    right: 100%;
                    transform: translateY(-50%);
                    border-width: 5px;
                    border-style: solid;
                    border-color: transparent var(--tooltip-background) transparent transparent;
                }
                html[dir="rtl"] .tooltip-content::after {
                    right: auto;
                    left: 100%;
                    border-color: transparent transparent transparent var(--tooltip-background);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(50%) translateX(4px); }
                    to { opacity: 1; transform: translateY(50%) translateX(0); }
                }
                html[dir="rtl"] @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(50%) translateX(-4px); }
                    to { opacity: 1; transform: translateY(50%) translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default Tooltip;