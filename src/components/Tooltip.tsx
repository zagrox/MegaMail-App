import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string;
    children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

    // Function to calculate and update the tooltip's position
    const updatePosition = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const isRtl = document.documentElement.dir === 'rtl';
            setPosition({
                top: rect.top + rect.height / 2,
                left: isRtl ? rect.left : rect.right,
            });
        }
    };

    const handleMouseEnter = () => {
        if (!text) return;
        updatePosition(); // Calculate position immediately
        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
        }, 300); // 300ms delay
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    // Add listeners to update position when scrolling or resizing
    useEffect(() => {
        if (!isVisible) return;
        window.addEventListener('scroll', updatePosition, true); // Use capture phase
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const isRtl = document.documentElement.dir === 'rtl';

    // Styles for the portaled tooltip
    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: isRtl ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
        padding: '8px 12px',
        backgroundColor: 'var(--tooltip-background)',
        color: 'white',
        borderRadius: '6px',
        fontSize: '0.85rem',
        whiteSpace: 'nowrap',
        zIndex: 1010, // Must be very high to be on top of everything
        pointerEvents: 'none',
    };

    const TooltipContent = (
        <>
            <div style={tooltipStyle} role="tooltip" className="tooltip-content-portaled">
                {text}
            </div>
            {/* These styles are injected with the portal into the body */}
            <style>{`
                .tooltip-content-portaled {
                    animation: fadeInPortaled 0.15s ease-in;
                }
                .tooltip-content-portaled::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    border-width: 5px;
                    border-style: solid;
                }
                html[dir="ltr"] .tooltip-content-portaled::after {
                    right: 100%;
                    border-color: transparent var(--tooltip-background) transparent transparent;
                }
                html[dir="rtl"] .tooltip-content-portaled::after {
                    left: 100%;
                    border-color: transparent transparent transparent var(--tooltip-background);
                }
                @keyframes fadeInPortaled {
                    from { opacity: 0; transform: ${isRtl ? 'translate(calc(-100% - 8px), -50%)' : 'translate(8px, -50%)'}; }
                    to { opacity: 1; transform: ${isRtl ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)'}; }
                }
            `}</style>
        </>
    );

    return (
        <div 
            ref={wrapperRef}
            className="tooltip-wrapper" 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ display: 'inline-flex' }}
        >
            {children}
            {isVisible && createPortal(TooltipContent, document.body)}
        </div>
    );
};

export default Tooltip;