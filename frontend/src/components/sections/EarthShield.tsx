import React, { useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion, useInView } from 'framer-motion';
import { Shield, Globe, DollarSign, Clock } from 'lucide-react';
import { useD3 } from '../../hooks/useD3';
import { KeyTakeaway } from '../ui/KeyTakeaway';
// @ts-expect-error generated JS data
import { stormData as rawStorm } from '../../data/stormData.js';
import { solarEvents } from '../../data/solarEvents';

import { magneticTransition } from '../../styles/animations';
import './EarthShield.css';

interface StormRecord {
    date: string;
    kp_max: number | null;
    dst_min: number | null;
    storm_days: number | null;
}

function kpToGScale(kp: number): number {
    if (kp >= 9) return 5;
    if (kp >= 8) return 4;
    if (kp >= 7) return 3;
    if (kp >= 6) return 2;
    if (kp >= 5) return 1;
    return 0;
}

const gScaleColors = [
    'rgba(255,255,255,0.03)',  // G0
    'rgba(16,185,129,0.4)',    // G1
    'rgba(6,182,212,0.6)',     // G2
    'rgba(249,115,22,0.8)',    // G3
    'rgba(234,88,12,0.9)',     // G4
    '#EF4444',                 // G5
];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const EarthShield: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const isChartInView = useInView(chartRef, { once: true, margin: '-100px' });

    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
    } | null>(null);

    const storms: StormRecord[] = rawStorm;

    const stormTimeline = useMemo(() => {
        return storms
            .filter((d: StormRecord) => d.kp_max !== null)
            .map((d: StormRecord) => ({
                date: new Date(d.date),
                kp: d.kp_max!,
                gScale: kpToGScale(d.kp_max!),
                dst: d.dst_min,
            }));
    }, [storms]);

    const scatterData = useMemo(() => {
        return solarEvents
            .filter((e) => e.kpMax !== null)
            .map((e) => ({
                name: e.shortName,
                year: e.year,
                date: new Date(e.date),
                kp: e.kpMax!,
                cost: e.estimatedCost ?? 5,
                damageType: e.damageType,
                consequence: e.consequence, // Added consequence text
                icon: e.icon,
            }));
    }, []);

    const typeColors: Record<string, string> = {
        power: 'var(--solar-corona)',
        satellite: 'var(--aurora-purple)',
        communication: 'var(--aurora-cyan)',
        all: 'var(--solar-flare)',
    };

    // Kp Index Timeline & Consequences Combined Chart
    const { svgRef: kpSvgRef } = useD3(
        (svg, { width, height }) => {
            if (!isChartInView) return;

            const margin = { top: 60, right: 60, bottom: 95, left: 60 };
            const w = width - margin.left - margin.right;
            const h = height - margin.top - margin.bottom;

            d3.select(svg).selectAll("*").remove();

            const g = d3
                .select(svg)
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Scales
            const xScale = d3.scaleTime()
                .domain(d3.extent(stormTimeline, (d) => d.date) as [Date, Date])
                .range([0, w]);

            const yScale = d3.scaleLinear()
                .domain([0, 9.5])
                .range([h, 0]);

            // Grid
            g.selectAll('.grid-line')
                .data([3, 5, 7, 9])
                .join('line')
                .attr('x1', 0)
                .attr('x2', w)
                .attr('y1', (d: number) => yScale(d))
                .attr('y2', (d: number) => yScale(d))
                .attr('stroke', 'rgba(255,255,255,0.04)')
                .attr('stroke-dasharray', '2,4');

            // G-scale zone labels
            const zones = [
                { label: 'G1 Minor', y: 5, color: gScaleColors[1] },
                { label: 'G3 Strong', y: 7, color: gScaleColors[3] },
                { label: 'G5 Extreme', y: 9, color: gScaleColors[5] },
            ];

            zones.forEach((zone) => {
                g.append('text')
                    .attr('x', w - 4)
                    .attr('y', yScale(zone.y) + 3)
                    .attr('text-anchor', 'end')
                    .attr('fill', zone.color)
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', '8px')
                    .attr('opacity', 0.6)
                    .text(zone.label);
            });

            // Bars
            const barWidth = Math.max(1, w / stormTimeline.length - 0.5);
            const bars = g
                .selectAll('.kp-bar')
                .data(stormTimeline)
                .join('rect')
                .attr('class', 'kp-bar')
                .attr('x', (d: { date: Date }) => xScale(d.date))
                .attr('width', barWidth)
                .attr('y', h)
                .attr('height', 0)
                .attr('fill', (d: { gScale: number }) => gScaleColors[d.gScale])
                .attr('rx', 0.5);

            // Animate bars on scroll
            bars
                .transition()
                .duration(800)
                .delay((_: unknown, i: number) => i * 0.5)
                .attr('y', (d: { kp: number }) => yScale(d.kp))
                .attr('height', (d: { kp: number }) => h - yScale(d.kp));

            // Overlay Scatter Dots
            const dots = g.selectAll('.scatter-dot')
                .data(scatterData)
                .join('circle')
                .attr('class', 'scatter-dot')
                .attr('cx', (d) => xScale(d.date))
                .attr('cy', (d) => yScale(d.kp))
                .attr('r', 0)
                .attr('fill', (d) => typeColors[d.damageType] || '#fff')
                .attr('opacity', 1) // Increased opacity
                .attr('stroke', 'rgba(255,255,255,0.3)')
                .attr('stroke-width', 1.5)
                .style('cursor', 'pointer');

            dots.transition()
                .duration(800)
                .delay((_, i) => i * 100 + 400)
                .attr('r', (d) => Math.min(16, Math.max(9, Math.sqrt(d.cost || 5) * 0.5))); // Slightly larger dots

            dots.on('mouseenter', function (event, d) {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 1);
                if (chartRef.current) {
                    const rect = chartRef.current.getBoundingClientRect();
                    setTooltip({
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                        data: d
                    });
                }
            })
                .on('mousemove', function (event, d) {
                    if (chartRef.current) {
                        const rect = chartRef.current.getBoundingClientRect();
                        setTooltip({
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                            data: d
                        });
                    }
                })
                .on('mouseleave', function () {
                    d3.select(this).attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 1.5).attr('opacity', 0.9);
                    setTooltip(null);
                });

            // Labels for dots with staggered vertical offset to prevent overlap
            g.selectAll('.scatter-label')
                .data(scatterData)
                .join('text')
                .attr('class', 'scatter-label')
                .attr('x', (d) => xScale(d.date) + Math.min(14, Math.max(7, Math.sqrt(d.cost) * 0.4)) + 6)
                .attr('y', (d, i) => {
                    const base = yScale(d.kp);
                    const markerRadius = Math.min(16, Math.max(9, Math.sqrt(d.cost || 5) * 0.5));
                    // More drastic staggering for readability
                    return i % 2 === 0 ? base - (markerRadius + 15) : base + (markerRadius + 22);
                })
                .attr('fill', '#fff')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px') // Even larger for punchy readability
                .attr('font-weight', '700')
                .attr('text-shadow', '0 1px 4px rgba(0,0,0,0.8)') // Drop shadow for depth
                .attr('opacity', 0)
                .text((d) => d.name)
                .transition()
                .duration(800)
                .delay((_, i) => i * 100 + 400)
                .attr('opacity', 1); // Full opacity

            // Chart title
            g.append('text')
                .attr('x', 0)
                .attr('y', -28)
                .attr('fill', '#fff')
                .attr('font-family', 'var(--font-heading)')
                .attr('font-size', '16px')
                .attr('font-weight', '600')
                .text('Geomagnetic Storm Intensity and Consequences');

            g.append('text')
                .attr('x', 0)
                .attr('y', -14)
                .attr('fill', 'var(--text-muted)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .text('Higher Kp = stronger disturbance. Marker size estimates economic cost.');

            // Axes
            const xAxis = d3.axisBottom(xScale)
                .ticks(10)
                .tickFormat((d) => d3.timeFormat('%Y')(d as Date))
                .tickSize(0);

            g.append('g')
                .attr('transform', `translate(0,${h})`)
                .call(xAxis)
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .attr('dy', '15px');

            // Legend
            const legendData = [
                { type: 'power', label: 'Power Grid' },
                { type: 'satellite', label: 'Satellite' },
                { type: 'communication', label: 'Communications' },
                { type: 'all', label: 'Multiple' },
            ];

            const legend = g.append('g').attr('transform', `translate(${w - 360}, ${h + 38})`);

            legendData.forEach((item, i) => {
                const row = legend.append('g').attr('transform', `translate(${i * 90}, 0)`);
                row.append('circle').attr('r', 4).attr('fill', typeColors[item.type]).attr('opacity', 0.8);
                row.append('text')
                    .attr('x', 8)
                    .attr('y', 3)
                    .attr('fill', 'var(--text-muted)')
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', '9px')
                    .text(item.label);
            });

            // Source
            g.append('text')
                .attr('x', w)
                .attr('y', h + 64)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .text('Data: GFZ Potsdam, OMNI2');
        },
        [stormTimeline, scatterData, isChartInView]
    );



    return (
        <section id="earth-shield" className="shield" ref={sectionRef}>

            <div className="container">
                <motion.div
                    className="shield__header"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={magneticTransition}
                >
                    <motion.div className="section-label" variants={fadeUp}>
                        <Shield size={16} />
                        <span>Earth&apos;s Shield</span>
                    </motion.div>
                    <motion.h2 variants={fadeUp}>When the shield buckles.</motion.h2>
                    <motion.p variants={fadeUp}>
                        Earth&apos;s magnetic field deflects most solar wind. But during powerful
                        coronal mass ejections, the magnetosphere compresses, and charged
                        particles pour through — triggering geomagnetic storms that can
                        cripple technology.
                    </motion.p>
                </motion.div>

                <div className="shield__charts">
                    <div className="shield__chart-combined" ref={chartRef}>
                        <svg ref={kpSvgRef} style={{ overflow: 'visible' }} />
                        {tooltip && (
                            <div
                                className="shield__tooltip"
                                style={{ left: tooltip.x, top: tooltip.y - 12 }}
                            >
                                <div
                                    className="shield__tooltip-accent"
                                    style={{ background: typeColors[tooltip.data.damageType] }}
                                />
                                <div className="shield__tooltip-header">
                                    <span className="shield__tooltip-title">{tooltip.data.name}</span>
                                    <span className="shield__tooltip-year">{tooltip.data.year}</span>
                                </div>
                                <div className="shield__tooltip-row">
                                    <span className="shield__tooltip-label">Intensity</span>
                                    <span className="shield__tooltip-value" style={{ color: typeColors[tooltip.data.damageType] }}>Kp {tooltip.data.kp}</span>
                                </div>
                                <div className="shield__tooltip-row">
                                    <span className="shield__tooltip-label">Financial Impact</span>
                                    <span className="shield__tooltip-value">${tooltip.data.cost}M</span>
                                </div>
                                {tooltip.data.consequence && (
                                    <div className="shield__tooltip-footer">
                                        {tooltip.data.consequence}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Phase 2: Magnetosphere Explainer ─── */}
            <div className="shield__magneto">
                <div className="container">
                    <motion.h3
                        className="shield__magneto-heading"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <Globe size={20} />
                        <span>The Magnetosphere Is Our Shield</span>
                    </motion.h3>

                    <motion.div
                        className="shield__magneto-text-box"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={fadeUp}
                    >
                        <p style={{ marginBottom: 'var(--space-4)' }}>
                            Earth's magnetic field extends tens of thousands of miles into
                            space, forming an invisible bubble called the magnetosphere. It
                            deflects the majority of the solar wind — a constant stream of
                            charged particles traveling at 400+ km/s.
                            But during intense geomagnetic storms, the magnetosphere gets
                            compressed and distorted. Charged particles funnel along field
                            lines toward the poles, where they collide with atmospheric gases
                            and create the aurora.
                        </p>
                    </motion.div>

                    <motion.div
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        style={{ marginBottom: 'var(--space-8)' }}
                    >
                        <KeyTakeaway variant="danger">
                            The magnetosphere protects us from most solar weather, but it has
                            limits. A Carrington-class storm today could cause trillions in
                            damage and take years to recover from. The Kp index is our early
                            warning system.
                        </KeyTakeaway>
                    </motion.div>

                    <motion.div
                        className="shield__magneto-stats"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={{
                            initial: { opacity: 0 },
                            animate: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
                        }}
                    >
                        <motion.div className="shield__magneto-stat" variants={fadeUp}>
                            <div className="shield__magneto-stat-icon">
                                <Globe size={18} />
                            </div>
                            <div className="shield__magneto-stat-value mono">~19,000 mi</div>
                            <div className="shield__magneto-stat-label">
                                Magnetosphere standoff distance (sunward side)
                            </div>
                        </motion.div>
                        <motion.div className="shield__magneto-stat" variants={fadeUp}>
                            <div className="shield__magneto-stat-icon">
                                <Clock size={18} />
                            </div>
                            <div className="shield__magneto-stat-value mono">~72 hrs</div>
                            <div className="shield__magneto-stat-label">
                                Time for a severe CME to reach Earth
                            </div>
                        </motion.div>
                        <motion.div className="shield__magneto-stat" variants={fadeUp}>
                            <div className="shield__magneto-stat-icon">
                                <DollarSign size={18} />
                            </div>
                            <div className="shield__magneto-stat-value mono">$2.6T</div>
                            <div className="shield__magneto-stat-label">
                                Estimated first-year cost of a Carrington-class event
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
