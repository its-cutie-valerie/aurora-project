import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion, useInView, animate } from 'framer-motion';
import { AlertOctagon, Calendar, Gauge, ShieldAlert, Banknote } from 'lucide-react';
import { magneticTransition } from '../../styles/animations';
import { useD3 } from '../../hooks/useD3';
import { KeyTakeaway } from '../ui/KeyTakeaway';
import { recoveryTimeline } from '../../data/solarEvents';
import './NearMiss2012.css';

export const NearMiss2012: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const costRef = useRef<HTMLSpanElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const isChartInView = useInView(chartRef, { once: true, margin: '-100px' });
    const isCostInView = useInView(costRef, { once: true });

    // Recovery timeline chart
    const { svgRef } = useD3(
        (svg, { width, height }) => {
            if (!isChartInView) return;

            const margin = { top: 40, right: 40, bottom: 60, left: 120 };
            const w = width - margin.left - margin.right;
            const h = height - margin.top - margin.bottom;

            d3.select(svg).selectAll("*").remove();

            const g = d3
                .select(svg)
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const xScale = d3.scaleLinear().domain([0, 12]).range([0, w]);
            const yScale = d3
                .scaleBand<string>()
                .domain(recoveryTimeline.map((d) => d.sector))
                .range([0, h])
                .padding(0.35);

            // Grid
            g.selectAll('.grid-x')
                .data([2, 4, 6, 8, 10])
                .join('line')
                .attr('x1', (d: number) => xScale(d))
                .attr('x2', (d: number) => xScale(d))
                .attr('y1', 0)
                .attr('y2', h)
                .attr('stroke', 'rgba(255,154,139,0.08)'); // Softer solar-themed grid

            // Bars (range bars showing min-max)
            const bars = g
                .selectAll('.recovery-bar')
                .data(recoveryTimeline)
                .join('g')
                .attr('class', 'recovery-bar');

            bars
                .append('rect')
                .attr('x', (d) => xScale(d.min))
                .attr('y', (d) => yScale(d.sector)!)
                .attr('width', 0)
                .attr('height', yScale.bandwidth())
                .attr('fill', (d) => d.color)
                .attr('opacity', 0.8)
                .attr('rx', 4)
                .attr('stroke', (d) => d.color)
                .attr('stroke-width', 2)
                .transition()
                .duration(1200)
                .ease(d3.easeExpOut)
                .delay((_, i) => i * 80)
                .attr('width', (d) => xScale(d.max) - xScale(d.min));

            // Min-max labels
            bars
                .append('text')
                .attr('x', (d) => xScale(d.max) + 8)
                .attr('y', (d) => yScale(d.sector)! + yScale.bandwidth() / 2 + 4)
                .attr('fill', 'var(--text-secondary)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '10px')
                .attr('letter-spacing', '0.05em')
                .text((d) => `${d.min}–${d.max} ${d.unit}`)
                .attr('opacity', 0)
                .transition()
                .delay((_, i) => i * 80 + 800)
                .duration(600)
                .attr('opacity', 1);

            // Sector labels
            g.selectAll('.sector-label')
                .data(recoveryTimeline)
                .join('text')
                .attr('class', 'sector-label')
                .attr('x', -16)
                .attr('y', (d) => yScale(d.sector)! + yScale.bandwidth() / 2 + 4)
                .attr('text-anchor', 'end')
                .attr('fill', 'var(--text-primary)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .attr('font-weight', '500')
                .text((d) => d.sector.toUpperCase())
                .attr('opacity', 0)
                .transition()
                .delay((_, i) => i * 80)
                .duration(600)
                .attr('opacity', 1);

            // Title
            g.append('text')
                .attr('x', -margin.left + 20)
                .attr('y', -20)
                .attr('fill', 'var(--solar-corona)')
                .attr('font-family', 'var(--font-display)')
                .attr('font-size', '14px')
                .attr('font-weight', '700')
                .attr('letter-spacing', '0.1em')
                .text('ESTIMATED RECOVERY TIMELINE');

            // X axis
            g.append('g')
                .attr('transform', `translate(0,${h})`)
                .call(
                    d3.axisBottom(xScale)
                        .ticks(6)
                        .tickFormat((d) => `${d}yr${Number(d) !== 1 ? 's' : ''}`)
                        .tickSize(0)
                )
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'var(--text-muted)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '10px')
                .attr('dy', '15px');

            // Source
            g.append('text')
                .attr('x', w)
                .attr('y', h + 44)
                .attr('text-anchor', 'end')
                .attr('fill', 'var(--text-muted)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .attr('opacity', 0.5)
                .text('Source: Baker et al., 2013');
        },
        [recoveryTimeline, isChartInView]
    );

    // Cost counter animation
    useEffect(() => {
        if (isCostInView && costRef.current) {
            const node = costRef.current;
            const controls = animate(0, 2.6, {
                duration: 2.5,
                ease: 'easeOut',
                onUpdate: (value) => {
                    node.textContent = `$${value.toFixed(1)}T`;
                },
            });
            return () => controls.stop();
        }
    }, [isCostInView]);

    const fadeUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
    } as const;

    return (
        <section id="near-miss" className="nearmiss" ref={sectionRef}>
            <div className="nearmiss__bg" />
            <div className="container nearmiss__layout">
                <motion.div
                    className="nearmiss__text"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={magneticTransition}
                >
                    <motion.div
                        className="section-label"
                        variants={fadeUp}
                    >
                        <AlertOctagon size={16} />
                        <span>The Near Miss</span>
                    </motion.div>

                    <h2 className="nearmiss__headline">
                        <motion.span
                            className="nearmiss__headline-word"
                            initial={{ opacity: 0, y: 60 }}
                            variants={{ animate: { opacity: 1, y: 0 } }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        >9</motion.span>
                        <motion.span
                            className="nearmiss__headline-word"
                            initial={{ opacity: 0, y: 60 }}
                            variants={{ animate: { opacity: 1, y: 0 } }}
                            transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
                        >Days.</motion.span>
                    </h2>

                    <motion.p
                        className="nearmiss__sub"
                        variants={fadeUp}
                    >
                        On July 23, 2012, the Sun fired a Carrington-level coronal mass
                        ejection directly along Earth&apos;s orbital path.
                    </motion.p>

                    <div className="nearmiss__beat" />

                    <motion.p
                        className="nearmiss__followup"
                        variants={fadeUp}
                    >
                        Earth had been there 9 days earlier.
                    </motion.p>

                    <div className="nearmiss__cost">
                        <span className="nearmiss__cost-label mono">
                            Estimated total damage if it had hit:
                        </span>
                        <span className="nearmiss__cost-value" ref={costRef}>
                            $0.0T
                        </span>
                        <span className="nearmiss__cost-range mono">
                            Range: $0.6T &mdash; $2.6T
                        </span>
                    </div>
                </motion.div>

                <div className="nearmiss__visual">
                    {/* Solar system diagram - CSS-based for reliability */}
                    <div className="nearmiss__orbit-diagram">
                        <div className="nearmiss__sun-dot" />
                        <div className="nearmiss__orbit-ring" />
                        <div className="nearmiss__earth-actual">
                            <motion.div
                                className="nearmiss__earth-dot"
                                animate={{ boxShadow: ["0 0 10px rgba(6, 182, 212, 0.4)", "0 0 25px rgba(6, 182, 212, 0.8)", "0 0 10px rgba(6, 182, 212, 0.4)"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <span className="nearmiss__earth-label mono">
                                Earth: July 23, 2012
                            </span>
                        </div>
                        <div className="nearmiss__earth-ghost">
                            <motion.div
                                className="nearmiss__ghost-dot"
                                animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            />
                            <span className="nearmiss__ghost-label mono">
                                Earth: July 14, 2012
                            </span>
                        </div>
                        <div className="nearmiss__cme-path" />
                    </div>

                    <motion.div
                        className="nearmiss__chart-wrapper"
                        ref={chartRef}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        <svg ref={svgRef} />
                    </motion.div>
                </div>
            </div>

            {/* ─── Phase 3: Why It Matters Today ─── */}
            <div className="nearmiss__matters container">
                <motion.h3
                    className="nearmiss__matters-heading"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                >
                    <ShieldAlert size={20} />
                    <span>Why It Matters Today</span>
                </motion.h3>

                <motion.div
                    className="nearmiss__matters-grid"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={{
                        initial: { opacity: 0 },
                        animate: {
                            opacity: 1,
                            transition: { staggerChildren: 0.15 }
                        }
                    }}
                >
                    <motion.div className="nearmiss__matters-card glass" variants={fadeUp}>
                        <div className="nearmiss__matters-icon">
                            <Calendar size={18} />
                        </div>
                        <h4>The Date</h4>
                        <p>
                            July 23, 2012. A Carrington-class coronal mass ejection
                            erupted from sunspot 1520 at over 3,000 km/s — one of the
                            fastest CMEs ever recorded by STEREO-A.
                        </p>
                    </motion.div>

                    <motion.div className="nearmiss__matters-card glass" variants={fadeUp}>
                        <div className="nearmiss__matters-icon">
                            <Gauge size={18} />
                        </div>
                        <h4>The Speed</h4>
                        <p>
                            The CME traveled from Sun to Earth's orbit in just
                            18.6 hours — normally a 2-3 day journey. It was the
                            most energetic event in the satellite era.
                        </p>
                    </motion.div>

                    <motion.div className="nearmiss__matters-card glass" variants={fadeUp}>
                        <div className="nearmiss__matters-icon">
                            <AlertOctagon size={18} />
                        </div>
                        <h4>The Miss</h4>
                        <p>
                            Earth had moved past the CME's path just 9 days
                            earlier. If the eruption had occurred one solar
                            rotation sooner, it would have been a direct hit.
                        </p>
                    </motion.div>

                    <motion.div className="nearmiss__matters-card glass" variants={fadeUp}>
                        <div className="nearmiss__matters-icon">
                            <ShieldAlert size={18} />
                        </div>
                        <h4>The Aftermath</h4>
                        <p>
                            A direct hit would have knocked out power grids across
                            multiple continents. Transformers — which take 12-18
                            months to manufacture — would have been destroyed.
                        </p>
                    </motion.div>

                    <motion.div className="nearmiss__matters-card glass" variants={fadeUp}>
                        <div className="nearmiss__matters-icon">
                            <Banknote size={18} />
                        </div>
                        <h4>The Warning</h4>
                        <p>
                            Daniel Baker's estimate: $0.6–2.6 trillion in damages.
                            The U.S. alone would take 4–10 years to fully recover.
                            We got lucky. We might not next time.
                        </p>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                >
                    <KeyTakeaway variant="danger">
                        The 2012 near miss was the most powerful solar event in the
                        satellite era. We only know about it because STEREO-A happened
                        to be in the path. Nothing about our infrastructure has
                        fundamentally changed since then.
                    </KeyTakeaway>
                </motion.div>
            </div>
        </section >
    );
};
