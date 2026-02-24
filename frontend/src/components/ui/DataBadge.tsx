import React from 'react';
import './DataBadge.css';

interface DataBadgeProps {
    value: string;
    label?: string;
    variant?: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'purple';
    size?: 'sm' | 'md' | 'lg';
    glow?: boolean;
}

const variantColors: Record<string, string> = {
    red: 'var(--solar-flare)',
    orange: 'var(--solar-corona)',
    yellow: 'var(--solar-core)',
    green: 'var(--aurora-green)',
    cyan: 'var(--aurora-cyan)',
    purple: 'var(--aurora-purple)',
};

export const DataBadge: React.FC<DataBadgeProps> = ({
    value,
    label,
    variant = 'orange',
    size = 'md',
    glow = false,
}) => {
    const color = variantColors[variant];

    return (
        <div
            className={`data-badge data-badge--${size} ${glow ? 'data-badge--glow' : ''}`}
            style={{
                '--badge-color': color,
                borderColor: color,
            } as React.CSSProperties}
        >
            <span className="data-badge__value">{value}</span>
            {label && <span className="data-badge__label">{label}</span>}
        </div>
    );
};
