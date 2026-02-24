import React from 'react';
import { Lightbulb, type LucideIcon } from 'lucide-react';
import './KeyTakeaway.css';

interface KeyTakeawayProps {
    /** Main summary text — plain English, 1-2 sentences */
    children: React.ReactNode;
    /** Optional custom icon instead of the default Lightbulb */
    icon?: LucideIcon;
    /** Optional accent color variant */
    variant?: 'default' | 'warning' | 'danger';
    /** Optional className for additional styling */
    className?: string;
}

export const KeyTakeaway: React.FC<KeyTakeawayProps> = ({
    children,
    icon: Icon = Lightbulb,
    variant = 'default',
    className = '',
}) => {
    return (
        <div className={`takeaway takeaway--${variant} ${className}`}>
            <div className="takeaway__icon">
                <Icon size={20} />
            </div>
            <div className="takeaway__content">
                <span className="takeaway__label mono">Key Takeaway</span>
                <p className="takeaway__text">{children}</p>
            </div>
        </div>
    );
};
