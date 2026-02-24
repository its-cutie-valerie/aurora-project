import React, { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import {
    Sun,
    BookOpen,
    Activity,
    Zap,
    Shield,
    Clock,
    AlertTriangle,
    Radio,
} from 'lucide-react';
import './Navigation.css';

const navItems = [
    { id: 'hero', label: 'The Sun', icon: Sun },
    { id: 'introduction', label: 'Impact', icon: BookOpen },
    { id: 'solar-heartbeat', label: 'Pulse', icon: Activity },
    { id: 'when-it-erupts', label: 'Eruptions', icon: Zap },
    { id: 'earth-shield', label: 'Shield', icon: Shield },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'near-miss', label: 'Near Miss', icon: AlertTriangle },
    { id: 'simulator', label: 'Sim', icon: Zap },
    { id: 'solar-max-now', label: 'Now', icon: Radio },
];

export const Navigation: React.FC = () => {
    const [activeSection, setActiveSection] = useState('hero');
    const [isVisible, setIsVisible] = useState(false);
    const { scrollY } = useScroll();

    // Initial load animation
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1800);
        return () => clearTimeout(timer);
    }, []);

    // Track scroll direction for hiding/showing nav (DISABLED: Sticky Nav requested)
    useMotionValueEvent(scrollY, "change", () => {

        // Update active section on scroll
        const center = window.innerHeight / 2;
        let currentSection = activeSection;

        for (const item of navItems) {
            const element = document.getElementById(item.id);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= center && rect.bottom >= center) {
                    currentSection = item.id;
                    break;
                }
            }
        }

        if (currentSection !== activeSection) {
            setActiveSection(currentSection);
        }
    });

    const handleClick = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.nav
                className="nav-pill"
                initial={{ y: -100, opacity: 0, x: "-50%" }}
                animate={{ y: 0, opacity: 1, x: "-50%" }}
                exit={{ y: -100, opacity: 0, x: "-50%" }}
                transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1]
                }}
                aria-label="Section navigation"
            >
                <div className="nav-pill__inner">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                className={`nav-pill__item ${isActive ? 'nav-pill__item--active' : ''}`}
                                onClick={() => handleClick(item.id)}
                                aria-label={item.label}
                                aria-current={isActive ? 'true' : undefined}
                            >
                                <span className="nav-pill__icon">
                                    <Icon size={16} />
                                </span>
                                <span className="nav-pill__label">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill-bg"
                                        className="nav-pill__active-bg"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </motion.nav>
        </AnimatePresence>
    );
};
