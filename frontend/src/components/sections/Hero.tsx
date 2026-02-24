import React from 'react';
import { motion } from 'framer-motion';

import { magneticTransition } from '../../styles/animations';
import './Hero.css';

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const Hero: React.FC = () => {
    return (
        <section id="hero" className="hero">
            <div className="hero__vignette" />
            <div className="hero__sun-glow" />

            <div className="hero__container">
                <motion.div
                    className="hero__content"
                    initial="initial"
                    animate="animate"
                    variants={magneticTransition}
                >

                    <motion.span className="hero__eyebrow" variants={fadeUp}>
                        A MISSION TO THE SOURCE
                    </motion.span>

                    <div className="hero__title">
                        <motion.h1 variants={fadeUp}>
                            THE SUN
                            <span>The Heartbeat of Everything.</span>
                        </motion.h1>
                    </div>

                    <motion.p className="hero__description" variants={fadeUp}>
                        Our civilization is built on the predictable mood of a massive,
                        chaotic fusion engine. We study it not just for science, but
                        for survival.
                    </motion.p>

                    <motion.a
                        href="#introduction"
                        className="hero__explore-link"
                        variants={fadeUp}
                    >
                        <div className="hero__explore-line" />
                        <span>Explore our star</span>
                    </motion.a>
                </motion.div>

                <motion.div
                    className="hero__sun-wrap"
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    <div className="hero__sun-media">
                        <div className="hero__sun-convection" />
                        <div className="hero__sun-flare-flicker" />
                        <div className="hero__sun-ring" />
                        <div className="hero__sun-ring hero__sun-ring--outer" />
                        <img
                            src="/assets/latest_sun_clean.png"
                            alt="The Sun"
                            className="hero__sun-img"
                        />
                    </div>
                </motion.div>
            </div>
        </section >
    );
};
