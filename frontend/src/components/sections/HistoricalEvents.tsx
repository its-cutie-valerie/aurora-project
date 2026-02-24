import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Radio,
    Satellite,
    Navigation,
    AlertTriangle,
    ChevronDown,
} from 'lucide-react';
import { solarEvents } from '../../data/solarEvents';
import { magneticTransition } from '../../styles/animations';
import { DataBadge } from '../ui/DataBadge';
import './HistoricalEvents.css';

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    Zap,
    Radio,
    Satellite,
    Navigation,
    AlertTriangle,
};

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const HistoricalEvents: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggle = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
        <section id="history" className="history" ref={sectionRef}>
            <div className="history__bg" />

            {/* Section header */}
            <motion.div
                className="history__header"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: '-100px' }}
                variants={magneticTransition}
            >
                <div className="container">
                    <motion.div className="section-label" variants={fadeUp}>
                        <Zap size={16} />
                        <span>A History of Being Hit</span>
                    </motion.div>
                    <motion.h2 variants={fadeUp}>When The Sun Struck</motion.h2>
                    <motion.p className="history__intro" variants={fadeUp}>
                        From telegraph fires in 1859 to satellite losses in 2022, the Sun
                        has repeatedly reminded us who&apos;s in charge. These are the
                        events that shaped our understanding of space weather.
                    </motion.p>
                </div>
            </motion.div>

            {/* Immersive Panels */}
            <div className="history-panels">
                {solarEvents.map((event, i) => {
                    const Icon = iconMap[event.icon] || Zap;
                    const side = i % 2 === 0 ? 'left' : 'right';
                    const isExpanded = expandedId === event.id;
                    const severityVariant =
                        event.severity === 'G5+' || event.severity === 'G5'
                            ? 'red'
                            : event.severity === 'G4'
                                ? 'orange'
                                : 'yellow';

                    return (
                        <motion.div
                            key={event.id}
                            className={`history-item history-item--${side} ${isExpanded ? 'history-item--expanded' : ''}`}
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true, margin: '-50px' }}
                            variants={magneticTransition}
                        >
                            {/* Year Label Above the Panel */}
                            <div className="history-item__year-container container">
                                <div className="history-item__year mono">
                                    {event.year}
                                </div>
                            </div>

                            <div className={`history-panel history-panel--${side}`}>
                                <div className="history-panel__content container">
                                    <motion.div
                                        className={`history-panel__text ${isExpanded ? 'history-panel__text--expanded' : ''}`}
                                        variants={{
                                            initial: { x: side === 'left' ? -30 : 30, opacity: 0 },
                                            animate: { x: 0, opacity: 1, transition: { duration: 0.8, delay: 0.2, ease: 'easeOut' } }
                                        }}
                                    >
                                        {/* Background Image Container - Moved Inside to constrain within glass card */}
                                        <div className={`history-panel__bg ${isExpanded ? 'history-panel__bg--expanded' : ''}`}>
                                            <img
                                                src={`/assets/history/${event.id}.png`}
                                                alt={event.name}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>

                                        {/* Trigger Header */}
                                        <button
                                            className="history-panel__header"
                                            onClick={() => toggle(event.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="history-panel__title-area">
                                                <div className="history-panel__title">
                                                    <Icon size={20} />
                                                    <h3>{event.name}</h3>
                                                </div>
                                            </div>
                                            <div className="history-panel__meta">
                                                <DataBadge
                                                    value={event.flareClass || event.severity}
                                                    variant={severityVariant}
                                                    size="sm"
                                                />
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <ChevronDown size={18} className="history-panel__chevron" />
                                                </motion.div>
                                            </div>
                                        </button>

                                        {/* Collapsible Body */}
                                        <div className={`history-panel__body ${isExpanded ? 'history-panel__body--open' : ''}`}>
                                            <p className="history-panel__desc">{event.description}</p>
                                            {/* ... rest of the content ... */}
                                            <div className="history-panel__consequences">
                                                <span className="history-panel__consequences-label">
                                                    Consequences
                                                </span>
                                                <p>{event.consequence}</p>
                                            </div>

                                            <div className="history-panel__stat-grid">
                                                <div className="history-panel__stat">
                                                    <span className="history-panel__stat-value">{event.stat}</span>
                                                </div>
                                                {event.kpMax && (
                                                    <div className="history-panel__stat">
                                                        <span className="history-panel__stat-label">Kp Max</span>
                                                        <span className="history-panel__stat-value">{event.kpMax}</span>
                                                    </div>
                                                )}
                                                {event.estimatedCost && (
                                                    <div className="history-panel__stat">
                                                        <span className="history-panel__stat-label">Est. Cost</span>
                                                        <span className="history-panel__stat-value">
                                                            ${event.estimatedCost >= 1000
                                                                ? `${(event.estimatedCost / 1000).toFixed(1)}T`
                                                                : `${event.estimatedCost}M`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};
