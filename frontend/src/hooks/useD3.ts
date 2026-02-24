import { useEffect, useRef, useState } from 'react';

/**
 * Hook for D3.js chart containers
 * Provides a ref, dimensions, and automatic resize handling
 */
export function useD3(
    renderFn: (
        svg: SVGSVGElement,
        dimensions: { width: number; height: number }
    ) => (() => void) | void,
    deps: unknown[] = []
) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const container = containerRef.current || svgRef.current?.parentElement;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width: Math.floor(width), height: Math.floor(height) });
                }
            }
        });

        observer.observe(container);

        // Initial size
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setDimensions({
                width: Math.floor(rect.width),
                height: Math.floor(rect.height),
            });
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || dimensions.width === 0 || dimensions.height === 0) return;

        // Clear previous render
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        const cleanup = renderFn(svg, dimensions);

        return () => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dimensions, ...deps]);

    return { svgRef, containerRef, dimensions };
}
