import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeSceneConfig {
    cameraPosition?: [number, number, number];
    cameraFov?: number;
    backgroundColor?: string | number;
    alpha?: boolean;
    antialias?: boolean;
    pixelRatio?: number;
    onInit?: (context: ThreeContext) => void;
    onAnimate?: (context: ThreeContext, time: number) => void;
    onResize?: (context: ThreeContext) => void;
    onDispose?: (context: ThreeContext) => void;
}

export interface ThreeContext {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    container: HTMLDivElement;
    clock: THREE.Clock;
    animationId: number | null;
}

export function useThreeScene(config: ThreeSceneConfig) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contextRef = useRef<ThreeContext | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const isMobile = window.innerWidth < 768;
        const pixelRatio = config.pixelRatio ?? (isMobile ? 1 : Math.min(window.devicePixelRatio, 2));

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            config.cameraFov ?? 50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );

        const pos = config.cameraPosition ?? [0, 0, 5];
        camera.position.set(pos[0], pos[1], pos[2]);

        const renderer = new THREE.WebGLRenderer({
            antialias: config.antialias ?? true,
            alpha: config.alpha ?? true,
        });

        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);

        if (config.backgroundColor !== undefined) {
            renderer.setClearColor(
                new THREE.Color(config.backgroundColor),
                config.alpha ? 0 : 1
            );
        }

        container.appendChild(renderer.domElement);

        const clock = new THREE.Clock();

        const ctx: ThreeContext = {
            scene,
            camera,
            renderer,
            container,
            clock,
            animationId: null,
        };

        contextRef.current = ctx;

        // Initialize
        config.onInit?.(ctx);

        // Animation loop
        const animate = () => {
            ctx.animationId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();
            config.onAnimate?.(ctx, time);
            renderer.render(scene, camera);
        };

        // Check reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
            animate();
        } else {
            // Render one frame
            config.onAnimate?.(ctx, 0);
            renderer.render(scene, camera);
        }

        // Resize handler
        const handleResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;

            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            config.onResize?.(ctx);
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(container);

        // Cleanup
        return () => {
            observer.disconnect();
            if (ctx.animationId !== null) {
                cancelAnimationFrame(ctx.animationId);
            }

            config.onDispose?.(ctx);

            // Dispose all scene objects
            scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry?.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach((m) => m.dispose());
                    } else {
                        object.material?.dispose();
                    }
                }
            });

            renderer.dispose();
            renderer.forceContextLoss();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            contextRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { containerRef, contextRef };
}
