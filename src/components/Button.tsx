

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon, { ICONS } from './Icon';
import { Module } from '../api/types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    action?: string;
    children: React.ReactNode;
    className?: string;
}

const Button = ({ action, children, className, ...props }: ButtonProps) => {
    const { canPerformAction, allModules, setModuleToUnlock } = useAuth();
    const isLocked = action ? !canPerformAction(action) : false;
    const { onClick, disabled, ...restProps } = props;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLocked) {
            e.preventDefault();
            e.stopPropagation();
            
            // Normalize action names for a case-insensitive, underscore-insensitive comparison,
            // matching the logic in AuthContext's `canPerformAction`. This makes the feature
            // locking more robust against minor inconsistencies in Directus configuration.
            const normalize = (str: string) => str.toLowerCase().replace(/_/g, '');
            const normalizedActionName = normalize(action!);

            const moduleForAction = allModules?.find(m => 
                Array.isArray(m.locked_actions) && 
                m.locked_actions.some(lockedAction => normalize(lockedAction) === normalizedActionName)
            );

            if (moduleForAction) {
                setModuleToUnlock(moduleForAction);
            } else {
                console.warn(`Action "${action}" is locked but no corresponding module was found.`);
            }
        } else if (onClick) {
            onClick(e);
        }
    };
    
    return (
        <button
            className={`btn ${className || ''} ${isLocked ? 'btn-locked' : ''}`}
            onClick={handleClick}
            disabled={isLocked ? false : disabled}
            aria-disabled={isLocked || disabled}
            {...restProps}
        >
            {isLocked && <Icon style={{ marginRight: '0.5rem' }}>{ICONS.LOCK}</Icon>}
            {children}
        </button>
    );
};

export default Button;