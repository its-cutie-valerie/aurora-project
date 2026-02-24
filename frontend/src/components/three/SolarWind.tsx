import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SolarWind = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ref = useRef<any>(null);

    const particles = useMemo(() => {
        const count = 500; // Reduced from 2000
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            speeds[i] = Math.random() * 0.2 + 0.05;
        }

        return { positions, speeds };
    }, []);

    useFrame((_state, delta) => {
        if (!ref.current) return;

        const positions = ref.current.geometry.attributes.position.array;
        const speedMultiplier = delta * 60; // Normalize to 60fps

        for (let i = 0; i < 500; i++) {
            positions[i * 3 + 2] += particles.speeds[i] * speedMultiplier;

            if (positions[i * 3 + 2] > 20) {
                positions[i * 3 + 2] = -50;
                // Avoid Math.random() in the frame loop if possible, 
                // but for resets it's usually fine. 
                // Still, let's keep it simple.
                positions[i * 3] = (Math.random() - 0.5) * 50;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            }
        }

        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={500}
                    array={particles.positions}
                    itemSize={3}
                    args={[particles.positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.05}
                color="#fcd34d"
                transparent
                opacity={0.6}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};
