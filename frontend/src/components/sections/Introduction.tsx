import React from 'react';
import { motion } from 'framer-motion';
import {
    Sun,
    Zap,
    Activity,
    TrendingUp,
    Database,
    Satellite,
    Radio,
    BarChart3,
    Globe,
    User,
    ChevronDown
} from 'lucide-react';
import { magneticTransition } from '../../styles/animations';
import './Introduction.css';

const dataSources = [
    { icon: Database, name: 'SILSO Royal Observatory', desc: 'Sunspot data since 1749' },
    { icon: Satellite, name: 'NASA DONKI', desc: 'Solar events 2010–present' },
    { icon: Radio, name: 'NOAA SWPC', desc: 'Geomagnetic storm records' },
    { icon: BarChart3, name: 'GFZ Potsdam', desc: 'Kp index measurements' },
    { icon: Globe, name: 'WDC Kyoto', desc: 'Dst index data' },
    { icon: Satellite, name: 'ESA / JAXA', desc: 'Satellite anomaly records' },
];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

const staggerContainer = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
} as const;

export const Introduction: React.FC = () => {
    return (
        <section id="introduction" className="intro">
            <div className="intro__bg" />

            {/* ─── Part A: Two-column About ─── */}
            <div className="container intro__columns">
                <motion.div
                    className="intro__col"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={fadeUp}
                >
                    <h2 className="intro__col-heading">
                        <Sun size={24} />
                        <span>Our Star</span>
                    </h2>
                    <p>
                        The Sun is a G-type main-sequence star, 4.6 billion years old,
                        composed of roughly 73% hydrogen and 25% helium. It's an
                        unremarkable star in many ways — one of hundreds of billions in
                        our galaxy alone.
                    </p>
                    <p>
                        It sits 150 million kilometers away, yet every photon that
                        reaches Earth traveled 8 minutes and 20 seconds to get here.
                        The light you feel on your skin right now left the Sun before
                        you started reading this paragraph.
                    </p>
                    <p>
                        But the Sun is not a static, glowing ball. It breathes, erupts,
                        and has moods — driven by complex magnetic field dynamics that
                        scientists are still working to fully understand.
                    </p>
                    <div className="intro__stat-callout">
                        <span className="intro__stat-number mono">99.86%</span>
                        <span className="intro__stat-label">
                            of the solar system's total mass is the Sun
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    className="intro__col"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={fadeUp}
                >
                    <h2 className="intro__col-heading">
                        <Zap size={24} />
                        <span>Why It Matters</span>
                    </h2>
                    <p>
                        Solar activity directly affects satellites, GPS navigation,
                        power grids, radio communications, and even airline routes.
                        When the Sun is angry, modern technology is in the crosshairs.
                    </p>
                    <p>
                        We don't just orbit the Sun — we live inside its extended
                        atmosphere, the heliosphere. Every charged particle, every
                        magnetic field fluctuation, every eruption from its surface
                        can reach us.
                    </p>
                    <p>
                        Modern civilization is more vulnerable to solar storms than
                        any previous human society. Not because the storms are worse — but
                        because we've built our entire world on technologies that solar
                        storms can destroy.
                    </p>
                    <div className="intro__stat-callout intro__stat-callout--danger">
                        <span className="intro__stat-number mono">$2.6 Trillion</span>
                        <span className="intro__stat-label">
                            estimated damage from a Carrington-level event today
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* ─── Part B: The Solar Cycle ─── */}
            <motion.div
                className="container intro__cycle"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: '-100px' }}
                variants={magneticTransition}
            >
                <h2 className="intro__col-heading">
                    <Activity size={24} />
                    <span>The 11-Year Heartbeat</span>
                </h2>

                <div className="intro__cycle-layout">
                    <div className="intro__cycle-info">
                        <p>
                            The Sun follows an approximately 11-year cycle of magnetic activity,
                            swinging from solar minimum (quiet, few sunspots) to solar maximum
                            (active, dangerous, covered in sunspots). This cycle has been
                            observed continuously since 1749.
                        </p>
                        <p>
                            We track solar activity primarily through sunspot count — dark
                            patches on the Sun's surface where intense magnetic fields break
                            through. More sunspots means more flares, more coronal mass
                            ejections, and more risk to Earth's technology.
                        </p>
                    </div>

                    <div className="intro__cycle-visual">
                        <div className="intro__cycle-viz">
                            <svg
                                className="intro__cycle-svg"
                                viewBox="0 0 600 120"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                <defs>
                                    <linearGradient id="sine-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="var(--solar-corona)" stopOpacity="0.2" />
                                        <stop offset="50%" stopColor="var(--solar-flare)" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="var(--solar-corona)" stopOpacity="0.2" />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Background secondary wave for depth */}
                                <path
                                    d="M 0,80 C 50,80 75,20 150,20 C 225,20 250,80 300,80 C 350,80 375,20 450,20 C 525,20 550,80 600,80"
                                    fill="none"
                                    stroke="var(--solar-corona)"
                                    strokeWidth="4"
                                    opacity="0.1"
                                />

                                {/* Main Sine wave representing the solar cycle */}
                                <path
                                    d="M 0,80 C 50,80 75,20 150,20 C 225,20 250,80 300,80 C 350,80 375,20 450,20 C 525,20 550,80 600,80"
                                    fill="none"
                                    stroke="url(#sine-glow)"
                                    strokeWidth="2.5"
                                    filter="url(#glow)"
                                />

                                {/* Data point markers on peaks/troughs */}
                                <circle cx="150" cy="20" r="2.5" fill="#fff" opacity="0.4" />
                                <circle cx="300" cy="80" r="2.5" fill="#fff" opacity="0.4" />
                                <circle cx="450" cy="20" r="2.5" fill="#fff" opacity="0.4" />

                                {/* labels */}
                                <g className="intro__svg-labels">
                                    <text x="150" y="10" textAnchor="middle" className="intro__svg-label">SOLAR MAXIMUM</text>
                                    <text x="300" y="105" textAnchor="middle" className="intro__svg-label">SOLAR MINIMUM</text>
                                    <text x="450" y="10" textAnchor="middle" className="intro__svg-label">SOLAR MAXIMUM</text>
                                </g>

                                {/* Enhanced "YOU ARE HERE" Callout */}
                                <g transform="translate(458, 22)">
                                    {/* Pulsing halo */}
                                    <circle cx="0" cy="0" r="10" fill="none" stroke="var(--solar-flare)" strokeWidth="1.5" opacity="0.4">
                                        <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                                    </circle>
                                    {/* Core dot */}
                                    <circle cx="0" cy="0" r="4.5" fill="#fff" stroke="var(--solar-flare)" strokeWidth="2" />

                                    {/* Technical Callout Line */}
                                    <path d="M 5, 5 L 15, 15 H 45" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    <text x="18" y="12" className="intro__svg-label intro__svg-label--accent">
                                        YOU ARE HERE
                                    </text>
                                    <text x="18" y="24" className="intro__svg-label" style={{ fontSize: '7px', opacity: 0.6 }}>
                                        PEAK INTENSITY PHASE
                                    </text>
                                </g>

                                {/* Baseline */}
                                <line x1="0" y1="118" x2="600" y2="118" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                <text x="595" y="114" textAnchor="end" className="intro__svg-label" style={{ fontSize: '8px', opacity: 0.3 }}>TIME (APPROX. 11 YEARS PER CYCLE)</text>
                            </svg>
                        </div>

                        <div className="intro__status-badge glass">
                            <TrendingUp size={16} />
                            <span className="mono">Solar Cycle 25 &bull; Peak Activity &bull; 2025–2026</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Part C: Data Sources ─── */}
            <div className="container intro__sources">
                <motion.h3
                    className="intro__sources-heading mono"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                >
                    Data Sources
                </motion.h3>
                <motion.div
                    className="intro__sources-grid"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={staggerContainer}
                >
                    {dataSources.map((source) => {
                        const Icon = source.icon;
                        return (
                            <motion.div
                                key={source.name}
                                className="intro__source-card glass"
                                variants={fadeUp}
                            >
                                <Icon size={18} />
                                <div>
                                    <span className="intro__source-name">{source.name}</span>
                                    <span className="intro__source-desc">{source.desc}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* ─── Part D: Personal Note ─── */}
            <motion.div
                className="container intro__personal"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeUp}
            >
                <User size={16} />
                <p>
                    This project was born from a childhood fascination with space and a
                    love for finding stories hidden in numbers. Every chart you'll see
                    represents real events that affected real people — and could happen
                    again tomorrow.
                </p>
            </motion.div>

            {/* ─── Part E: Transition ─── */}
            <motion.div
                className="container intro__transition"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.p className="intro__transition-line" variants={fadeUp}>
                    With that out of the way...
                </motion.p>
                <motion.p className="intro__transition-line intro__transition-line--accent" variants={fadeUp}>
                    Let's see what the Sun has been up to.
                </motion.p>
                <motion.p className="intro__transition-line intro__transition-line--small" variants={fadeUp}>
                    Except for rollin' us right round.
                </motion.p>
            </motion.div>
        </section>
    );
};
