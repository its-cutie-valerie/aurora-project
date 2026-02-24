import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { SolarWind } from './SolarWind';
import * as THREE from 'three';

const StarFieldContent = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ref = useRef<any>(null);
    const accentRef = useRef<any>(null);

    // Primary Star Layer (Small, dense)
    const primaryStars = useMemo(() => {
        const count = 2500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            const colorChoice = Math.random();
            if (colorChoice > 0.95) color.set('#FF6A88'); // Pinkish
            else if (colorChoice > 0.90) color.set('#F97316'); // Orange
            else if (colorChoice > 0.85) color.set('#0EA5E9'); // Blue
            else color.set('#FFFFFF');

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        return { positions, colors };
    }, []);

    // Accent Layer (Larger, more colorful "nice accents")
    const accentStars = useMemo(() => {
        const count = 200;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();

        const palette = ['#0EA5E9', '#06B6D4', '#8B5CF6', '#F97316', '#FFCF7D', '#10B981'];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

            const hex = palette[Math.floor(Math.random() * palette.length)];
            color.set(hex);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        return { positions, colors };
    }, []);

    useFrame((_state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 50;
            ref.current.rotation.y -= delta / 60;
        }
        if (accentRef.current) {
            accentRef.current.rotation.x -= delta / 35;
            accentRef.current.rotation.y -= delta / 45;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            {/* Base Stars */}
            <Points ref={ref} positions={primaryStars.positions} colors={primaryStars.colors} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    vertexColors
                    size={0.1}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.8}
                />
            </Points>

            {/* Glowing Accent Stars (The "Blue Circles" and friends) */}
            <Points ref={accentRef} positions={accentStars.positions} colors={accentStars.colors} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    vertexColors
                    size={0.25}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
        </group>
    );
};

export const Starfield: React.FC = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            pointerEvents: 'none',
            background: '#000000'
        }}>
            <Canvas
                camera={{ position: [0, 0, 1] }}
                dpr={[1, 1.5]}
                gl={{ powerPreference: "high-performance", antialias: false }}
            >
                <StarFieldContent />
                <SolarWind />
            </Canvas>
        </div>
    );
};
