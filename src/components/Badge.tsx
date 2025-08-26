import React from 'react';
import Icon from './Icon';

interface BadgeProps {
    text: string;
    type?: 'success' | 'warning' | 'danger' | 'info' | 'default';
    color?: string; // Hex color for specific styling
    iconPath?: string;
}

const getContrastYIQ = (hexcolor?: string): string => {
    if (!hexcolor || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexcolor)) {
        return 'var(--text-color)';
    }
    let color = hexcolor.substring(1); // strip #
    if (color.length === 3) {
        color = color.split('').map(char => char + char).join('');
    }
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1F2937' : '#FFFFFF'; // Dark gray or white
}


const Badge = ({ text, type = 'default', color, iconPath }: BadgeProps) => {
    const style: React.CSSProperties = {};
    
    // If a specific hex color is provided, it takes precedence for the background.
    if (color) {
        style.color = getContrastYIQ(color);
        style.backgroundColor = color;
    }

    return (
        <span className={`badge badge-${type}`} style={style}>
            {iconPath && <Icon path={iconPath} className="icon" style={{ width: '1em', height: '1em', marginRight: '0.4em', verticalAlign: 'text-bottom' }} />}
            {text}
        </span>
    );
};

export default Badge;
