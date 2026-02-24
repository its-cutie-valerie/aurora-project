export const magneticTransition = {
    initial: { opacity: 0, scale: 0.95, y: 30 },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1] as any, // expoOut
            staggerChildren: 0.1
        }
    }
};

export const magneticPull = {
    initial: { opacity: 0, x: -20 },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.8,
            ease: "easeOut"
        }
    }
};

export const hoverMagnetic = {
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 10 }
};

export const glitchVariants: any = {
    idle: { x: 0, skew: 0 },
    glitch: {
        x: [0, -2, 2, -1, 1, 0],
        skew: [0, -1, 2, -2, 1, 0],
        transition: {
            duration: 0.2,
            repeat: Infinity,
            repeatType: "mirror" as const
        }
    }
};
