import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Terminal, ShieldAlert } from 'lucide-react';
import './MobileWarning.css';

export const MobileWarning: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Detect mobile (simplified)
        const isMobile = window.innerWidth < 768;
        const hasBeenDismissed = sessionStorage.getItem('stars_warning_dismissed');

        if (isMobile && !hasBeenDismissed) {
            // Slight delay for robotic "boot up" feel
            const timer = setTimeout(() => setIsVisible(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('stars_warning_dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="stars-overlay">
                    <motion.div
                        className="stars-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Scanline overlay */}
                        <div className="stars-scanlines" />

                        <div className="stars-header">
                            <div className="stars-header__main">
                                <Terminal size={18} className="stars-gold" />
                                <h3>S.T.A.R.S. SYSTEM DIAGNOSTIC</h3>
                            </div>
                            <div className="stars-header__meta mono">
                                <span>HUMOR: 100%</span>
                                <span className="stars-separator">|</span>
                                <span>HONESTY: 95%</span>
                            </div>
                        </div>

                        <div className="stars-content">
                            <div className="stars-status-row">
                                <ShieldAlert size={20} className="stars-red" />
                                <p className="stars-warning-text">
                                    <span className="mono stars-label">[CRITICAL]</span> Sub-optimal viewport detected.
                                </p>
                            </div>

                            <p className="stars-body">
                                Your primitive hand-held slab is insufficient for full scientific telemetry.
                                Some data visualizations may appear... "highly compressed."
                            </p>

                            <p className="stars-deadpan">
                                No, I won't self-destruct. Not yet.
                            </p>

                            <div className="stars-specs mono">
                                <div className="stars-spec-item">
                                    <Monitor size={12} />
                                    <span>OPTIMIZED: DESKTOP_ULTRA</span>
                                </div>
                                <div className="stars-spec-item stars-active">
                                    <Smartphone size={12} />
                                    <span>DETECTED: PORTABLE_SLAB</span>
                                </div>
                            </div>
                        </div>

                        <div className="stars-actions">
                            <button className="stars-btn stars-btn--secondary" onClick={dismiss}>
                                CONFIRM DIMENSION COMPROMISE
                            </button>
                            <button className="stars-btn stars-btn--primary" onClick={dismiss}>
                                INITIATE ALIGNMENT
                            </button>
                        </div>

                        <div className="stars-footer mono">
                            CASE: "Should I lower the humor setting, Captain?"
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
