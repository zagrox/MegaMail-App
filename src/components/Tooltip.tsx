import React, { useState, useRef } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
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
            style={{ position: 'relative', display: 'inline-block' }}
        >
            {children}
            {isVisible && (
                <div className="tooltip-content" role="tooltip">
                    {text}
                </div>
            )}
            {/* FIX: Removed non-standard "jsx" prop to fix TypeScript error. This now injects a global style. */}
            <style>{`
                .tooltip-content {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-bottom: 8px;
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
                .tooltip-content::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 5px;
                    border-style: solid;
                    border-color: var(--tooltip-background) transparent transparent transparent;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Tooltip;
