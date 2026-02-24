import React, { useEffect, useRef } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import './StatCard.css';

interface StatCardProps {
    value: number | string;
    suffix?: string;
    prefix?: string;
    label: string;
    icon?: React.ReactNode;
    decimals?: number;
    duration?: number;
    color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    value,
    suffix = '',
    prefix = '',
    label,
    icon,
    decimals = 0,
    duration = 2,
    color = 'var(--solar-corona)',
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<HTMLSpanElement>(null);
    const isInView = useInView(cardRef, { once: true, margin: "-20%" });

    useEffect(() => {
        const valueEl = valueRef.current;
        if (!valueEl) return;

        if (typeof value === 'string') {
            valueEl.textContent = value;
            return;
        }

        if (isInView) {
            const controls = animate(0, value, {
                duration,
                ease: "easeOut",
                onUpdate: (latest) => {
                    if (valueEl) {
                        valueEl.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
                    }
                }
            });
            return () => controls.stop();
        }
    }, [isInView, value, suffix, prefix, decimals, duration]);

    return (
        <motion.div
            className="stat-card glass"
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
        >
            {icon && (
                <div className="stat-card__icon" style={{ color }}>
                    {icon}
                </div>
            )}
            <div className="stat-card__content">
                <span
                    className="stat-card__value"
                    ref={valueRef}
                    style={{ color }}
                >
                    {typeof value === 'string' ? value : '0'}
                </span>
                <span className="stat-card__label">{label}</span>
            </div>
        </motion.div>
    );
};
