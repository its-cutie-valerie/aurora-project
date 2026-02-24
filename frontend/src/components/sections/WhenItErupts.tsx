import React, { useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion, useInView } from 'framer-motion';
import { magneticTransition } from '../../styles/animations';
import {
    Zap,
    Rocket,
    Satellite,
    Plane
} from 'lucide-react';
import { useD3 } from '../../hooks/useD3';
import { DataBadge } from '../ui/DataBadge';
import { KeyTakeaway } from '../ui/KeyTakeaway';
// @ts-expect-error generated JS data
import { flareData as rawFlare } from '../../data/flareData.js';
import './WhenItErupts.css';

interface FlareRecord {
    date: string;
    X: number;
    M: number;
    C: number;
    B: number;
    A: number;
}

function getMaxClass(d: FlareRecord): string {
    if (d.X > 0) return 'X';
    if (d.M > 0) return 'M';
    if (d.C > 0) return 'C';
    if (d.B > 0) return 'B';
    if (d.A > 0) return 'A';
    return 'none';
}

const classColors: Record<string, string> = {
    none: 'rgba(255,255,255,0.02)',
    A: 'rgba(255,255,255,0.05)',
    B: 'rgba(16,185,129,0.3)',
    C: 'rgba(6,182,212,0.5)',
    M: 'rgba(249,115,22,0.7)',
    X: '#EF4444',
};

const scaleData = [
    { cls: 'A / B', title: 'Background', desc: 'Everyday solar activity. Weak and common, with no measurable effects on Earth.', color: 'rgba(16,185,129,0.5)', glow: 'rgba(16,185,129,0.15)' },
    { cls: 'C', title: 'Minor', desc: 'Small eruptions. Can cause weak, localized degradation of low-frequency radio signals.', color: 'rgba(6,182,212,0.8)', glow: 'rgba(6,182,212,0.15)' },
    { cls: 'M', title: 'Moderate', desc: 'Medium-large flares. Capable of causing brief radio blackouts in the polar regions.', color: 'rgba(249,115,22,0.9)', glow: 'rgba(249,115,22,0.15)' },
    { cls: 'X', title: 'Extreme', desc: 'Major events. Triggers planet-wide radio blackouts and strong radiation storms.', color: '#EF4444', glow: 'rgba(239,68,68,0.2)' },
    { cls: 'X10+', title: 'Catastrophic', desc: 'Rare super-flares. Potential to cripple global power grids and destroy satellites.', color: '#DC2626', glow: 'rgba(220,38,38,0.3)', isExtreme: true },
];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const WhenItErupts: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const heatmapRef = useRef<HTMLDivElement>(null);
    const isHeatmapInView = useInView(heatmapRef, { once: true, margin: '-100px' });

    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        data: FlareRecord;
        maxClass: string;
    } | null>(null);

    const flareRecords: FlareRecord[] = rawFlare;

    // Build heatmap data grouped by year/month
    const heatmapData = useMemo(() => {
        return flareRecords.map((d: FlareRecord) => {
            const date = new Date(d.date);
            return {
                ...d,
                year: date.getFullYear(),
                month: date.getMonth(),
                maxClass: getMaxClass(d),
            };
        });
    }, [flareRecords]);

    const years = useMemo(() => {
        const ys = [...new Set(heatmapData.map((d) => d.year))].sort();
        return ys;
    }, [heatmapData]);

    const { svgRef } = useD3(
        (svg, { width, height }) => {
            if (!isHeatmapInView) return;

            const margin = { top: 80, right: 30, bottom: 50, left: 70 };
            const w = width - margin.left - margin.right;
            const h = height - margin.top - margin.bottom;

            const cellW = w / 12;
            const cellH = Math.min(h / years.length, 18);

            d3.select(svg).selectAll("*").remove();

            const g = d3
                .select(svg)
                .attr('width', width)
                .attr('height', margin.top + years.length * cellH + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Month labels
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            g.selectAll('.month-label')
                .data(months)
                .join('text')
                .attr('class', 'month-label')
                .attr('x', (_: string, i: number) => i * cellW + cellW / 2)
                .attr('y', -8)
                .attr('text-anchor', 'middle')
                .attr('fill', '#fff')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .text((d: string) => d);

            // Year labels
            g.selectAll('.year-label')
                .data(years)
                .join('text')
                .attr('class', 'year-label')
                .attr('x', -8)
                .attr('y', (_: number, i: number) => i * cellH + cellH / 2 + 3)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .text((d: number) => (d % 5 === 0 ? String(d) : ''));

            // Cells
            const cells = g
                .selectAll('.cell')
                .data(heatmapData)
                .join('rect')
                .attr('class', 'cell')
                .attr('x', (d: { month: number }) => d.month * cellW + 1)
                .attr('y', (d: { year: number }) => years.indexOf(d.year) * cellH + 1)
                .attr('width', cellW - 2)
                .attr('height', cellH - 2)
                .attr('rx', 3) // Slightly rounder cells
                .attr('fill', (d: { maxClass: string }) => classColors[d.maxClass])
                .attr('opacity', 0)
                .style('cursor', 'pointer')
                .on('mouseenter', function (event: MouseEvent, d: FlareRecord & { year: number; month: number; maxClass: string }) {
                    d3.select(this as SVGRectElement)
                        .attr('stroke', '#fff')
                        .attr('stroke-width', 1.5)
                        .attr('opacity', 1); // Full opacity on hover
                    const rect = (heatmapRef.current as HTMLElement)?.getBoundingClientRect();
                    if (rect) {
                        setTooltip({
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top - 10,
                            data: d,
                            maxClass: d.maxClass,
                        });
                    }
                })
                .on('mousemove', function (event: MouseEvent, d: FlareRecord & { year: number; month: number; maxClass: string }) {
                    const rect = (heatmapRef.current as HTMLElement)?.getBoundingClientRect();
                    if (rect) {
                        setTooltip({
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top - 10,
                            data: d,
                            maxClass: d.maxClass,
                        });
                    }
                })
                .on('mouseleave', function () {
                    d3.select(this as SVGRectElement).attr('stroke', 'none');
                    setTooltip(null);
                });

            // Fade in cells row by row
            cells
                .transition()
                .duration(30)
                .delay((_: unknown, i: number) => {
                    const yearIndex = years.indexOf(heatmapData[i].year);
                    return yearIndex * 40 + heatmapData[i].month * 10;
                })
                .attr('opacity', 1);

            // Halloween 2003 annotation box
            const oct2003Idx = years.indexOf(2003);
            if (oct2003Idx >= 0) {
                // Background glow for the box
                g.append('rect')
                    .attr('x', 9 * cellW - 4)
                    .attr('y', oct2003Idx * cellH - 4)
                    .attr('width', cellW * 2 + 8)
                    .attr('height', cellH + 8)
                    .attr('rx', 6)
                    .attr('fill', 'rgba(239, 68, 68, 0.15)')
                    .attr('opacity', 0)
                    .transition()
                    .delay(2000)
                    .duration(1000)
                    .attr('opacity', 1);

                // Dashed border
                g.append('rect')
                    .attr('x', 9 * cellW - 2)
                    .attr('y', oct2003Idx * cellH - 2)
                    .attr('width', cellW * 2 + 4)
                    .attr('height', cellH + 4)
                    .attr('rx', 4)
                    .attr('fill', 'none')
                    .attr('stroke', 'var(--solar-flare)')
                    .attr('stroke-width', 1.5)
                    .attr('stroke-dasharray', '4,2')
                    .attr('opacity', 0)
                    .transition()
                    .delay(2000)
                    .duration(1000)
                    .attr('opacity', 0.8);

                g.append('text')
                    .attr('x', 11 * cellW + 12)
                    .attr('y', oct2003Idx * cellH + cellH / 2 + 3)
                    .attr('fill', 'var(--solar-flare)')
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', '10px')
                    .attr('font-weight', '700')
                    .attr('opacity', 0)
                    .text('Halloween 2003')
                    .transition()
                    .delay(2000)
                    .duration(1000)
                    .attr('opacity', 1);
            }

            // Source
            g.append('text')
                .attr('x', w)
                .attr('y', years.length * cellH + 34)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .text('Data: NOAA SWPC GOES X-Ray Flux');
        },
        [heatmapData, years, isHeatmapInView]
    );

    return (
        <section id="when-it-erupts" className="erupts" ref={sectionRef}>
            {/* Part A: Heatmap */}
            <div className="erupts__part-a">
                <div className="container">
                    <motion.div
                        className="erupt__grid"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-100px' }}
                        variants={magneticTransition}
                    >
                        <motion.div className="section-label" variants={fadeUp}>
                            <Zap size={16} />
                            <span>When It Erupts</span>
                        </motion.div>
                        <motion.h2 variants={fadeUp}>Solar flares cluster. And they cluster right now.</motion.h2>
                        <motion.p variants={fadeUp}>
                            Flares are classified by their X-ray brightness, growing 10x more powerful with each letter class.
                            The heatmap below shows the maximum flare class recorded each month. Notice how X-class events
                            tightly cluster around solar maxima.
                        </motion.p>
                    </motion.div>
                </div>

                <div className="erupts__heatmap-container" ref={heatmapRef}>
                    <svg ref={svgRef} />
                    {tooltip && (
                        <div
                            className="erupts__tooltip"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y - 12,
                                transform: 'translate(-50%, -100%)',
                            }}
                        >
                            <div className="erupts__tooltip-header">
                                <span className="erupts__tooltip-class" style={{ color: classColors[tooltip.maxClass] }}>
                                    {tooltip.maxClass}-Class
                                </span>
                            </div>
                            <div className="erupts__tooltip-body">
                                {['X', 'M', 'C', 'B', 'A'].map((cls) => {
                                    const count = tooltip.data[cls as keyof FlareRecord] as number;
                                    if (count > 0) {
                                        return (
                                            <div key={cls} className="erupts__tooltip-row">
                                                <span className="erupts__tooltip-label">Class {cls}:</span>
                                                <span className="erupts__tooltip-value" style={{ color: classColors[cls] }}>{count}</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    )}
                    <div className="erupts__scale-grid container">
                        {scaleData.map((item, i) => (
                            <motion.div
                                key={item.cls}
                                className={`erupts__scale-card ${item.isExtreme ? 'erupts__scale-card--extreme' : ''}`}
                                initial="initial"
                                whileInView="animate"
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ delay: i * 0.1 }}
                                variants={fadeUp}
                                style={{
                                    '--card-accent': item.color,
                                    '--card-glow': item.glow,
                                } as React.CSSProperties}
                            >
                                <div className="erupts__scale-card-header">
                                    <span className="erupts__scale-card-class" style={{ color: item.color }}>{item.cls}</span>
                                    <span className="erupts__scale-card-title">{item.title}</span>
                                </div>
                                <p className="erupts__scale-card-desc">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Phase 2: Real-World Impact ─── */}
            <div className="erupts__part-c">
                <div className="container">
                    <motion.h3
                        className="erupts__impact-heading"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <Zap size={20} />
                        <span>When Flares Hit Home</span>
                    </motion.h3>

                    <div className="erupts__impact-grid">
                        <motion.div
                            className="erupts__impact-card glass"
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ delay: 0.1 }}
                            variants={fadeUp}
                        >
                            <div className="erupts__impact-icon">
                                <Rocket size={20} />
                            </div>
                            <div className="erupts__impact-meta">
                                <span className="erupts__impact-year mono">Feb 2022</span>
                                <DataBadge value="G1" variant="yellow" size="sm" />
                            </div>
                            <h4>SpaceX Starlink</h4>
                            <p>
                                A moderate geomagnetic storm caused increased atmospheric
                                drag, destroying 40 newly launched Starlink satellites before
                                they could reach orbital altitude. Cost: ~$50M.
                            </p>
                        </motion.div>

                        <motion.div
                            className="erupts__impact-card glass"
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ delay: 0.2 }}
                            variants={fadeUp}
                        >
                            <div className="erupts__impact-icon">
                                <Satellite size={20} />
                            </div>
                            <div className="erupts__impact-meta">
                                <span className="erupts__impact-year mono">Oct 2003</span>
                                <DataBadge value="X28+" variant="red" size="sm" />
                            </div>
                            <h4>ADEOS-II Satellite</h4>
                            <p>
                                Japan's $640M Earth observation satellite was permanently
                                disabled during the Halloween storms. Its solar panels were
                                destroyed by the intense radiation environment.
                            </p>
                        </motion.div>

                        <motion.div
                            className="erupts__impact-card glass"
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ delay: 0.3 }}
                            variants={fadeUp}
                        >
                            <div className="erupts__impact-icon">
                                <Plane size={20} />
                            </div>
                            <div className="erupts__impact-meta">
                                <span className="erupts__impact-year mono">Jan 2012</span>
                                <DataBadge value="M8.7" variant="orange" size="sm" />
                            </div>
                            <h4>Airline Reroutes</h4>
                            <p>
                                Delta, United, and American Airlines rerouted flights away from
                                polar routes during an M-class flare. HF radio blackouts made
                                pilot communication impossible over the Arctic.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeUp}
                    >
                        <KeyTakeaway variant="warning">
                            Solar flares aren't abstract science — they destroy satellites,
                            reroute planes, and can knock out power grids. The stronger the
                            flare class, the more dangerous the consequences. And we're
                            currently at solar maximum.
                        </KeyTakeaway>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
