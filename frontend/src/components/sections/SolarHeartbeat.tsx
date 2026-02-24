import React, { useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, useInView } from 'framer-motion';
import { magneticTransition } from '../../styles/animations';
import {
    Activity,
    TrendingUp,
    Calendar,
    AlertCircle,
    Eye,
    BarChart3,
    Target,
    Gauge
} from 'lucide-react';
import { useD3 } from '../../hooks/useD3';
import { KeyTakeaway } from '../ui/KeyTakeaway';
// @ts-expect-error generated JS data
import { sunspotData as rawSunspot } from '../../data/sunspotData.js';
// @ts-expect-error generated JS data
import { forecastData as rawForecast } from '../../data/forecastData.js';
import { solarEvents, solarCyclePeaks } from '../../data/solarEvents';
import './SolarHeartbeat.css';

interface SunspotRecord {
    date: string;
    sunspot_number: number;
    solar_cycle: number;
}

interface ForecastRecord {
    date: string;
    forecast: number;
    lower: number;
    upper: number;
}

// Compute 13-month smoothed average
function computeSmoothed(data: SunspotRecord[]): { date: Date; value: number }[] {
    const result: { date: Date; value: number }[] = [];
    for (let i = 6; i < data.length - 6; i++) {
        let sum = 0;
        for (let j = -6; j <= 6; j++) {
            const weight = j === -6 || j === 6 ? 0.5 : 1;
            sum += data[i + j].sunspot_number * weight;
        }
        result.push({
            date: new Date(data[i].date),
            value: sum / 12,
        });
    }
    return result;
}

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const SolarHeartbeat: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const isChartInView = useInView(chartContainerRef, {
        once: true,
        margin: window.innerWidth < 768 ? "-20px" : "-100px"
    });

    const sunspot: SunspotRecord[] = rawSunspot;
    const forecast: ForecastRecord[] = rawForecast;

    const smoothedData = useMemo(() => computeSmoothed(sunspot), [sunspot]);

    const monthlyData = useMemo(
        () =>
            sunspot.map((d: SunspotRecord) => ({
                date: new Date(d.date),
                value: d.sunspot_number,
            })),
        [sunspot]
    );

    // Get latest actual date to know where forecast kicks in
    const latestActualDate = useMemo(() => {
        const validDates = sunspot
            .filter((d: SunspotRecord) => d.sunspot_number != null)
            .map((d: SunspotRecord) => new Date(d.date));
        return validDates[validDates.length - 1];
    }, [sunspot]);

    const forecastLine = useMemo(() => {
        return forecast
            .filter((d: ForecastRecord) => new Date(d.date) >= latestActualDate)
            .map((d: ForecastRecord) => ({
                date: new Date(d.date),
                forecast: d.forecast,
                lower: Math.max(0, d.lower),
                upper: d.upper,
            }));
    }, [forecast, latestActualDate]);

    // Annotation events for chart
    const annotationEvents = useMemo(() => {
        return solarEvents.filter((e) => e.year >= 1749);
    }, []);

    const { svgRef } = useD3(
        (svg, { width, height }) => {
            if (!isChartInView) return; // Only draw when in view

            const margin = { top: 60, right: 60, bottom: 50, left: 20 };
            const w = width - margin.left - margin.right;
            const h = height - margin.top - margin.bottom;

            d3.select(svg).selectAll("*").remove(); // Clear previous renders

            const g = d3
                .select(svg)
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

            // Scales
            const xScale = d3
                .scaleTime()
                .domain([new Date('1749-01-01'), new Date('2031-01-01')])
                .range([0, w]);

            const yMax = Math.max(
                d3.max(monthlyData, (d: { date: Date; value: number }) => d.value) || 300,
                d3.max(forecastLine, (d: { date: Date; forecast: number; lower: number; upper: number }) => d.upper) || 200
            );
            const yScale = d3
                .scaleLinear()
                .domain([0, yMax * 1.05])
                .range([h, 0]);

            // Grid lines
            const gridY = g
                .append('g')
                .attr('class', 'grid-y');
            gridY
                .selectAll('line')
                .data(yScale.ticks(6))
                .join('line')
                .attr('x1', 0)
                .attr('x2', w)
                .attr('y1', (d: number) => yScale(d))
                .attr('y2', (d: number) => yScale(d))
                .attr('stroke', 'rgba(255,255,255,0.04)')
                .attr('stroke-dasharray', '2,4');

            // Monthly raw line
            const monthlyLine = d3
                .line<{ date: Date; value: number }>()
                .x((d) => xScale(d.date))
                .y((d) => yScale(d.value))
                .curve(d3.curveLinear);

            const monthlyPath = g
                .append('path')
                .datum(monthlyData)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(249,115,22,0.2)')
                .attr('stroke-width', 0.8)
                .attr('d', monthlyLine);

            // Smoothed line
            const smoothedLine = d3
                .line<{ date: Date; value: number }>()
                .x((d) => xScale(d.date))
                .y((d) => yScale(d.value))
                .curve(d3.curveMonotoneX);

            const smoothedPath = g
                .append('path')
                .datum(smoothedData)
                .attr('fill', 'none')
                .attr('stroke', '#F97316')
                .attr('stroke-width', 2.5)
                .attr('d', smoothedLine);

            // Forecast confidence band
            if (forecastLine.length > 0) {
                const area = d3
                    .area<{ date: Date; forecast: number; lower: number; upper: number }>()
                    .x((d) => xScale(d.date))
                    .y0((d) => yScale(d.lower))
                    .y1((d) => yScale(d.upper))
                    .curve(d3.curveMonotoneX);

                g.append('path')
                    .datum(forecastLine)
                    .attr('fill', 'rgba(249,115,22,0.08)')
                    .attr('d', area);

                // Forecast line (dashed)
                const fLine = d3
                    .line<{ date: Date; forecast: number; lower: number; upper: number }>()
                    .x((d) => xScale(d.date))
                    .y((d) => yScale(d.forecast))
                    .curve(d3.curveMonotoneX);

                g.append('path')
                    .datum(forecastLine)
                    .attr('fill', 'none')
                    .attr('stroke', '#F97316')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,4')
                    .attr('d', fLine);
            }

            // TODAY marker (High-fidelity telemetry)
            const todayX = xScale(new Date());
            if (todayX > 0 && todayX < w) {
                const todayMarkerY = 40; // Fixed height for the callout
                const delay = 2500;

                // Pulsing Halo
                const halo = g.append('circle')
                    .attr('cx', todayX)
                    .attr('cy', todayMarkerY)
                    .attr('r', 0)
                    .attr('fill', 'none')
                    .attr('stroke', 'rgba(255,255,255,0.6)')
                    .attr('stroke-width', 1.5)
                    .attr('opacity', 0);

                halo.transition()
                    .delay(delay)
                    .duration(500)
                    .attr('r', 18)
                    .attr('opacity', 0.4)
                    .on('end', () => {
                        halo.append('animate')
                            .attr('attributeName', 'r')
                            .attr('values', '10;24;10')
                            .attr('dur', '4s')
                            .attr('repeatCount', 'indefinite');
                        halo.append('animate')
                            .attr('attributeName', 'opacity')
                            .attr('values', '0.4;0;0.4')
                            .attr('dur', '4s')
                            .attr('repeatCount', 'indefinite');
                    });

                // Core Dot
                g.append('circle')
                    .attr('cx', todayX)
                    .attr('cy', todayMarkerY)
                    .attr('r', 0)
                    .attr('fill', '#fff')
                    .attr('stroke', 'var(--solar-flare)')
                    .attr('stroke-width', 2)
                    .transition()
                    .delay(delay)
                    .duration(500)
                    .attr('r', 4.5);

                // Technical Callout Line
                g.append('line')
                    .attr('x1', todayX)
                    .attr('y1', todayMarkerY)
                    .attr('x2', todayX)
                    .attr('y2', h)
                    .attr('stroke', 'rgba(255,255,255,0.3)')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4,4')
                    .attr('opacity', 0)
                    .transition()
                    .delay(delay)
                    .duration(800)
                    .attr('opacity', 1);

                // Label Group
                const labelGroup = g.append('g')
                    .attr('transform', `translate(${todayX + 10}, ${todayMarkerY - 12})`)
                    .attr('opacity', 0);

                labelGroup.append('text')
                    .attr('fill', '#fff')
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', '10px')
                    .attr('font-weight', '700')
                    .attr('letter-spacing', '0.05em')
                    .text('MISSION TIME: TODAY');

                labelGroup.append('text')
                    .attr('y', 12)
                    .attr('fill', 'var(--solar-orange)')
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', '9px')
                    .attr('font-weight', '500')
                    .text('SOLAR CYCLE 25 • ACTIVE');

                labelGroup.transition()
                    .delay(delay + 400)
                    .duration(500)
                    .attr('opacity', 1);
            }

            // Annotation markers for major events (Refined callouts)
            annotationEvents.forEach((event) => {
                const x = xScale(new Date(event.date));
                if (x < 0 || x > w) return;

                const isMajor = event.year === 1859 || event.year === 2012 || event.year === 2003;

                g.append('line')
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', h)
                    .attr('stroke', isMajor ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.25)')
                    .attr('stroke-width', isMajor ? 1.5 : 1)
                    .attr('stroke-dasharray', '2,4');

                const label = g.append('g')
                    .attr('transform', `translate(${x}, ${- 12})`) // Lifted slightly
                    .attr('class', 'annotation-label')
                    .style('cursor', 'pointer');

                // The "Pointy Thing" (Technical indicator)
                label.append('path')
                    .attr('d', 'M -4,0 L 0,6 L 4,0 Z')
                    .attr('transform', 'translate(0, 2)')
                    .attr('fill', isMajor ? 'rgba(239,68,68,1)' : 'rgba(239,68,68,0.5)');

                label.append('text')
                    .attr('transform', 'rotate(-45)')
                    .attr('font-family', 'var(--font-mono)')
                    .attr('font-size', isMajor ? '11px' : '9.5px') // Slightly larger
                    .attr('font-weight', isMajor ? '700' : '500')
                    .attr('fill', isMajor ? 'rgba(239,68,68,1)' : 'rgba(239,68,68,0.7)')
                    .text(`${event.year} `);

                if (isMajor) {
                    label.append('circle')
                        .attr('r', 2.5)
                        .attr('fill', 'rgba(239,68,68,0.9)')
                        .attr('cy', 10);
                }
            });

            // Cycle peak markers
            solarCyclePeaks
                .filter((c) => c.peakSSN !== null && c.peakYear >= 1749 && c.peakYear <= 2025)
                .forEach((cycle) => {
                    const x = xScale(new Date(cycle.peakYear, 0, 1));
                    const y = yScale(cycle.peakSSN!);
                    if (x < 0 || x > w) return;

                    g.append('polygon')
                        .attr('points', `${x},${y - 6} ${x - 4},${y + 2} ${x + 4},${y + 2} `)
                        .attr('fill', '#FDB813')
                        .attr('opacity', 0.5);
                });

            // Axes
            const xAxis = d3
                .axisBottom(xScale)
                .ticks(d3.timeYear.every(50))
                .tickFormat((d) => d3.timeFormat('%Y')(d as Date))
                .tickSize(0);

            g.append('g')
                .attr('transform', `translate(0, ${h})`)
                .call(xAxis)
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .attr('dy', '15px');

            const yAxis = d3
                .axisRight(yScale)
                .ticks(6)
                .tickSize(0);

            g.append('g')
                .attr('transform', `translate(${w}, 0)`)
                .call(yAxis)
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '11px')
                .attr('dx', '10px');

            // Chart title
            g.append('text')
                .attr('x', 0)
                .attr('y', -20)
                .attr('fill', '#fff')
                .attr('font-family', 'var(--font-heading)')
                .attr('font-size', '16px')
                .attr('font-weight', '600')
                .text('Solar Activity 1749–2030');

            // Source
            g.append('text')
                .attr('x', w)
                .attr('y', h + 30)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .text('Data: SILSO Royal Observatory of Belgium');

            // Path draw animation
            const smoothedLength = (smoothedPath.node() as SVGPathElement)?.getTotalLength() || 0;
            const monthlyLength = (monthlyPath.node() as SVGPathElement)?.getTotalLength() || 0;

            smoothedPath
                .attr('stroke-dasharray', smoothedLength)
                .attr('stroke-dashoffset', smoothedLength)
                .transition()
                .duration(2000)
                .delay(200)
                .ease(d3.easeCubicInOut)
                .attr('stroke-dashoffset', 0);

            monthlyPath
                .attr('stroke-dasharray', monthlyLength)
                .attr('stroke-dashoffset', monthlyLength)
                .transition()
                .duration(2000)
                .ease(d3.easeCubicInOut)
                .attr('stroke-dashoffset', 0);

        },
        [monthlyData, smoothedData, forecastLine, annotationEvents, isChartInView]
    );

    // Current cycle progress
    const cycleStart = new Date('2019-12-01');
    const now = new Date();
    const yearsInCycle = (now.getTime() - cycleStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const progressPercent = Math.min((yearsInCycle / 11) * 100, 100);

    return (
        <section id="solar-heartbeat" className="heartbeat" ref={sectionRef}>
            <div className="heartbeat__bg" />
            <div className="heartbeat__content container">
                <div className="heartbeat__main-row">
                    <div className="heartbeat__sticky">
                        <motion.div
                            className="heartbeat__sticky-content"
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true, margin: '-100px' }}
                            variants={magneticTransition}
                        >
                            <motion.div className="section-label" variants={fadeUp}>
                                <Activity size={16} />
                                <span>The Solar Pulse</span>
                            </motion.div>

                            <motion.h2 variants={fadeUp}>
                                The Sun breathes.
                                <br />
                                Every 11 years.
                            </motion.h2>

                            <motion.p variants={fadeUp}>
                                Like a cosmic heartbeat, the Sun cycles between periods of calm and
                                chaos. At solar minimum, its surface is serene. At solar maximum,
                                it erupts with flares, hurls plasma into space, and bombards Earth
                                with charged particles.
                            </motion.p>

                            <motion.p variants={fadeUp}>
                                This rhythm is driven by the <strong>Solar Dynamo</strong> — a massive
                                internal engine of churning plasma that twists and tangles the Sun's
                                magnetic fields until they eventually snap and reset.
                            </motion.p>

                            <motion.p variants={fadeUp}>
                                We&apos;ve been tracking this pulse since 1749 — the longest continuous
                                scientific observation in history. Today, we stand at the edge of
                                Cycle 25&apos;s peak, watching the most documented solar event in human history.
                            </motion.p>
                        </motion.div>
                    </div>

                    <div className="heartbeat__chart" ref={chartContainerRef}>
                        <svg ref={svgRef} />
                    </div>
                </div>

                <motion.div
                    className="heartbeat__facts-grid"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: window.innerWidth < 768 ? "-20px" : "-100px" }}
                    variants={fadeUp}
                >
                    {/* Cycle Progress as the first "card" */}
                    <div className="heartbeat__fact-card heartbeat__fact-card--progress glass">
                        <div className="heartbeat__cycle-counter">
                            <span className="heartbeat__cycle-label">
                                Cycle 25 Progress
                            </span>
                            <div className="heartbeat__progress-bar">
                                <div
                                    className="heartbeat__progress-fill"
                                    style={{
                                        width: `${progressPercent}%`,
                                        background:
                                            progressPercent > 70
                                                ? 'linear-gradient(90deg, var(--solar-core), var(--solar-flare))'
                                                : progressPercent > 40
                                                    ? 'linear-gradient(90deg, var(--aurora-green), var(--solar-core))'
                                                    : 'var(--aurora-green)',
                                    }}
                                />
                            </div>
                            <span className="heartbeat__progress-label mono">
                                {yearsInCycle.toFixed(1)} / 11 years
                            </span>
                        </div>
                    </div>

                    <div className="heartbeat__fact-card glass">
                        <TrendingUp size={16} />
                        <span>Cycle 25 tracking stronger than predicted</span>
                    </div>
                    <div className="heartbeat__fact-card glass">
                        <Calendar size={16} />
                        <span>Solar maximum expected 2025–2026</span>
                    </div>
                    <div className="heartbeat__fact-card glass">
                        <AlertCircle size={16} />
                        <span>Currently near peak cycle activity</span>
                    </div>
                </motion.div>
            </div>

            {/* ─── Phase 2: Explainer Panel ─── */}
            <div className="heartbeat__explainer container">
                <motion.h3
                    className="heartbeat__explainer-heading"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                >
                    <Eye size={20} />
                    <span>What Am I Looking At?</span>
                </motion.h3>

                <div className="heartbeat__explainer-grid">
                    <motion.div
                        className="heartbeat__explainer-card glass"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ delay: 0.1 }}
                        variants={fadeUp}
                    >
                        <div className="heartbeat__explainer-card-icon">
                            <BarChart3 size={18} />
                        </div>
                        <h4>The Pattern</h4>
                        <p>
                            Each peak is a solar maximum — a period of intense magnetic
                            activity. The faint line shows noisy monthly data; the bold line is
                            the 13-month smoothed average that reveals the true cycle.
                        </p>
                    </motion.div>

                    <motion.div
                        className="heartbeat__explainer-card glass"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ delay: 0.2 }}
                        variants={fadeUp}
                    >
                        <div className="heartbeat__explainer-card-icon">
                            <Target size={18} />
                        </div>
                        <h4>The Forecast</h4>
                        <p>
                            The dashed line extending beyond "TODAY" shows NASA's official
                            prediction for Cycle 25. The shaded band around it represents
                            the uncertainty range — where the real numbers could land.
                        </p>
                    </motion.div>

                    <motion.div
                        className="heartbeat__explainer-card glass"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ delay: 0.3 }}
                        variants={fadeUp}
                    >
                        <div className="heartbeat__explainer-card-icon">
                            <Gauge size={18} />
                        </div>
                        <h4>The Stakes</h4>
                        <p>
                            Red markers show years when major solar storms hit Earth. Notice
                            they cluster near the peaks. Every cycle maximum is a window of
                            elevated risk for satellites, power grids, and GPS systems.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                >
                    <KeyTakeaway>
                        Solar activity follows an unmistakable 11-year rhythm. We're currently
                        near the peak of Cycle 25 — meaning the Sun is at its most active,
                        and the risk of powerful eruptions affecting Earth's technology is at
                        its highest.
                    </KeyTakeaway>
                </motion.div>
            </div>
        </section>
    );
};
