import React, { useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, useInView } from 'framer-motion';
import { Radio as RadioIcon, Navigation, Zap, Satellite, BarChart3, TrendingUp, HelpCircle, ShieldCheck, Cpu, Globe, Signal } from 'lucide-react';
import { useD3 } from '../../hooks/useD3';
import { KeyTakeaway } from '../ui/KeyTakeaway';
// @ts-expect-error generated JS data
import { sunspotData as rawSunspot } from '../../data/sunspotData.js';
// @ts-expect-error generated JS data
import { forecastData as rawForecast } from '../../data/forecastData.js';
import { magneticTransition } from '../../styles/animations';
import './SolarMaxNow.css';

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

// Cycle definitions (approximate start years)
const cycleDefinitions = [
    { cycle: 21, start: 1976, end: 1986 },
    { cycle: 22, start: 1986, end: 1996 },
    { cycle: 23, start: 1996, end: 2008 },
    { cycle: 24, start: 2008, end: 2019 },
    { cycle: 25, start: 2019, end: 2031 },
];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
} as const;

export const SolarMaxNow: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const isChartInView = useInView(chartRef, { once: true, margin: '-100px' });
    const [tooltip, setTooltip] = React.useState<{ x: number; y: number; months: number; c25: number; avg: number } | null>(null);

    const sunspot: SunspotRecord[] = rawSunspot;
    const forecast: ForecastRecord[] = rawForecast;

    // Prepare cycle overlay data
    const cycleData = useMemo(() => {
        return cycleDefinitions.map((def) => {
            const cycleMonths = sunspot.filter((d: SunspotRecord) => {
                const year = new Date(d.date).getFullYear();
                return year >= def.start && year < def.end;
            });

            return {
                cycle: def.cycle,
                data: cycleMonths.map((d: SunspotRecord, i: number) => ({
                    monthIndex: i,
                    value: d.sunspot_number,
                })),
            };
        });
    }, [sunspot]);

    // Forecast for cycle 25
    const cycle25Forecast = useMemo(() => {
        return forecast
            .filter((d: ForecastRecord) => {
                const year = new Date(d.date).getFullYear();
                return year >= 2019 && year <= 2031;
            })
            .map((d: ForecastRecord, i: number) => ({
                monthIndex: i,
                forecast: d.forecast,
                lower: Math.max(0, d.lower),
                upper: d.upper,
            }));
    }, [forecast]);

    const { svgRef } = useD3(
        (svg, { width, height }) => {
            if (!isChartInView) return;

            const margin = { top: 60, right: 40, bottom: 60, left: 60 };
            const w = width - margin.left - margin.right;
            const h = height - margin.top - margin.bottom;

            d3.select(svg).selectAll("*").remove();

            const g = d3
                .select(svg)
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Max months across cycles
            const maxMonths = Math.max(...cycleData.map((c) => c.data.length));

            const xScale = d3.scaleLinear().domain([0, maxMonths]).range([0, w]);
            const yScale = d3
                .scaleLinear()
                .domain([0, 300])
                .range([h, 0]);

            // Grid
            g.selectAll('.grid-y')
                .data(yScale.ticks(5))
                .join('line')
                .attr('x1', 0)
                .attr('x2', w)
                .attr('y1', (d: number) => yScale(d))
                .attr('y2', (d: number) => yScale(d))
                .attr('stroke', 'rgba(255,255,255,0.04)');

            // Past cycles (lower opacity for better contrast)
            cycleData
                .filter((c) => c.cycle !== 25)
                .forEach((cycle, i) => {
                    const line = d3
                        .line<{ monthIndex: number; value: number }>()
                        .x((d) => xScale(d.monthIndex))
                        .y((d) => yScale(d.value))
                        .curve(d3.curveMonotoneX);

                    const path = g.append('path')
                        .datum(cycle.data)
                        .attr('fill', 'none')
                        .attr('stroke', 'rgba(255,255,255,0.06)') // Lowered from 0.12
                        .attr('stroke-width', 1)
                        .attr('d', line)
                        .attr('stroke-dasharray', function () { return (this as SVGPathElement).getTotalLength() })
                        .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength() });

                    path.transition()
                        .duration(2000)
                        .delay(i * 150)
                        .ease(d3.easeCubicOut)
                        .attr('stroke-dashoffset', 0);

                    // Label at peak (subtler)
                    const peak = cycle.data.reduce(
                        (max, d) => (d.value > max.value ? d : max),
                        cycle.data[0]
                    );
                    if (peak) {
                        g.append('text')
                            .attr('x', xScale(peak.monthIndex))
                            .attr('y', yScale(peak.value) - 8)
                            .attr('text-anchor', 'middle')
                            .attr('fill', 'rgba(255,255,255,0.15)') // Lowered from 0.25
                            .attr('font-family', 'var(--font-mono)')
                            .attr('font-size', '8px')
                            .text(`C${cycle.cycle}`)
                            .attr('opacity', 0)
                            .transition()
                            .delay(i * 150 + 1000)
                            .duration(1000)
                            .attr('opacity', 1);
                    }
                });

            // Cycle 25 actual data
            const cycle25 = cycleData.find((c) => c.cycle === 25);
            if (cycle25) {
                const line = d3
                    .line<{ monthIndex: number; value: number }>()
                    .x((d) => xScale(d.monthIndex))
                    .y((d) => yScale(d.value))
                    .curve(d3.curveMonotoneX);

                const path = g.append('path')
                    .datum(cycle25.data)
                    .attr('fill', 'none')
                    .attr('stroke', '#F97316')
                    .attr('stroke-width', 2.5)
                    .attr('d', line)
                    .attr('stroke-dasharray', function () { return (this as SVGPathElement).getTotalLength() })
                    .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength() });

                path.transition()
                    .duration(2500)
                    .delay(500)
                    .ease(d3.easeCubicOut)
                    .attr('stroke-dashoffset', 0);

                // "YOU ARE HERE" marker
                const lastPoint = cycle25.data[cycle25.data.length - 1];
                if (lastPoint) {
                    const cx = xScale(lastPoint.monthIndex);
                    const cy = yScale(lastPoint.value);
                    const delay = 3000;

                    // Pulsing Halo (Scientific feel)
                    const halo = g.append('circle')
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', 0)
                        .attr('fill', 'none')
                        .attr('stroke', '#F97316')
                        .attr('stroke-width', 1.5)
                        .attr('opacity', 0);

                    halo.transition()
                        .delay(delay)
                        .duration(500)
                        .attr('r', 20)
                        .attr('opacity', 0.4)
                        .on('end', () => {
                            halo.append('animate')
                                .attr('attributeName', 'r')
                                .attr('values', '12;28;12')
                                .attr('dur', '3s')
                                .attr('repeatCount', 'indefinite');
                            halo.append('animate')
                                .attr('attributeName', 'opacity')
                                .attr('values', '0.4;0;0.4')
                                .attr('dur', '3s')
                                .attr('repeatCount', 'indefinite');
                        });

                    const pulse = g.append('circle')
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', 0)
                        .attr('fill', '#F97316')
                        .attr('opacity', 0);

                    pulse.transition()
                        .delay(delay)
                        .duration(500)
                        .attr('r', 8)
                        .attr('opacity', 0.6)
                        .on('end', () => {
                            pulse.append('animate')
                                .attr('attributeName', 'r')
                                .attr('values', '6;10;6')
                                .attr('dur', '2s')
                                .attr('repeatCount', 'indefinite');
                        });

                    g.append('circle')
                        .attr('cx', cx)
                        .attr('cy', cy)
                        .attr('r', 0)
                        .attr('fill', '#fff')
                        .attr('stroke', '#F97316')
                        .attr('stroke-width', 2)
                        .transition()
                        .delay(delay)
                        .duration(500)
                        .attr('r', 4.5);

                    // Callout Line
                    g.append('line')
                        .attr('x1', cx)
                        .attr('y1', cy)
                        .attr('x2', cx + 15)
                        .attr('y2', cy - 15)
                        .attr('stroke', 'rgba(255,255,255,0.6)')
                        .attr('stroke-width', 1)
                        .attr('opacity', 0)
                        .transition()
                        .delay(delay + 300)
                        .duration(500)
                        .attr('opacity', 1);

                    // Scientific Label instead of simple text
                    const labelGroup = g.append('g')
                        .attr('transform', `translate(${cx + 18}, ${cy - 12})`)
                        .attr('opacity', 0);

                    labelGroup.append('text')
                        .attr('fill', '#fff')
                        .attr('font-family', 'var(--font-mono)')
                        .attr('font-size', '10px')
                        .attr('font-weight', '700')
                        .attr('letter-spacing', '0.05em')
                        .text('CURRENT PHASE: PEAK INTENSITY');

                    labelGroup.append('text')
                        .attr('y', 12)
                        .attr('fill', 'var(--solar-orange)')
                        .attr('font-family', 'var(--font-mono)')
                        .attr('font-size', '9px')
                        .attr('font-weight', '500')
                        .text('CYCLE 25 • OBSERVED DATA');

                    labelGroup.transition()
                        .delay(delay + 400)
                        .duration(500)
                        .attr('opacity', 1);

                    // Vertical reference line to time axis
                    g.append('line')
                        .attr('x1', cx)
                        .attr('x2', cx)
                        .attr('y1', cy + 12)
                        .attr('y2', cy + 12)
                        .attr('stroke', 'rgba(249,115,22,0.4)')
                        .attr('stroke-width', 1)
                        .attr('stroke-dasharray', '4,4')
                        .transition()
                        .delay(delay)
                        .duration(800)
                        .attr('y2', h);
                }
            }

            // Interactive Scan-line and Overlay
            const scanLine = g.append('line')
                .attr('y1', 0)
                .attr('y2', h)
                .attr('stroke', 'rgba(255,255,255,0.2)')
                .attr('stroke-width', 1)
                .attr('opacity', 0)
                .style('pointer-events', 'none');

            g.append('rect')
                .attr('width', w)
                .attr('height', h)
                .attr('fill', 'transparent')
                .on('mousemove', (event) => {
                    const [mx] = d3.pointer(event);
                    const monthX = Math.round(xScale.invert(mx));

                    // Constrain to data
                    const idx = Math.max(0, Math.min(maxMonths - 1, monthX));
                    const xPos = xScale(idx);

                    scanLine.attr('x1', xPos).attr('x2', xPos).attr('opacity', 1);

                    // Get values for tooltip
                    const c25Val = cycle25?.data[idx]?.value || 0;
                    const othersCount = cycleData.filter(c => c.cycle !== 25 && c.data[idx]);
                    const avgVal = othersCount.length ? d3.mean(othersCount, c => c.data[idx]!.value) || 0 : 0;

                    // Calculate Y to be above the highest line at this point
                    const maxY = Math.max(c25Val, avgVal);
                    const tipY = yScale(maxY) + margin.top - 120; // Default offset above lines

                    setTooltip({
                        x: xPos + margin.left,
                        y: Math.max(20, tipY), // Ensure it doesn't go off top
                        months: idx,
                        c25: c25Val,
                        avg: Math.round(avgVal)
                    });
                })
                .on('mouseleave', () => {
                    scanLine.attr('opacity', 0);
                    setTooltip(null);
                });

            // Titles
            g.append('text')
                .attr('x', 0)
                .attr('y', -28)
                .attr('fill', '#fff')
                .attr('font-family', 'var(--font-heading)')
                .attr('font-size', '16px')
                .attr('font-weight', '600')
                .text('Cycle 25 Is Outperforming All Predictions');

            g.append('text')
                .attr('x', 0)
                .attr('y', -12)
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '10px')
                .attr('letter-spacing', '0.05em')
                .text('Normalized Sunspot Number Overlay (Cycle Month 0-144)');

            // X axis
            g.append('g')
                .attr('transform', `translate(0,${h})`)
                .call(
                    d3.axisBottom(xScale)
                        .ticks(8) // Fewer ticks to avoid clutter
                        .tickFormat((d) => Number(d) === 0 ? "" : `${Math.floor(Number(d) / 12)} yr`) // Hide 0
                        .tickSize(0)
                )
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '10px')
                .attr('dy', '12px');

            // Y axis
            g.append('g')
                .call(d3.axisLeft(yScale).ticks(5).tickSize(0))
                .call((g) => g.select('.domain').remove())
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '10px')
                .attr('dx', '-10px');

            // Source
            g.append('text')
                .attr('x', w)
                .attr('y', h + 44)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.3)')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', '9px')
                .text('Data: NOAA / Space Weather Prediction Center');
        },
        [cycleData, cycle25Forecast, isChartInView]
    );

    const watchCards = [
        {
            icon: RadioIcon,
            title: 'HF Radio Blackouts',
            status: 'ELEVATED',
            statusColor: 'var(--solar-corona)',
            desc: 'X-class flares cause immediate global HF radio blackouts lasting hours.',
        },
        {
            icon: Navigation,
            title: 'GPS Accuracy',
            status: 'DEGRADED',
            statusColor: 'var(--solar-core)',
            desc: 'Ionospheric distortion during storms causes up to 10m position error.',
        },
        {
            icon: Zap,
            title: 'Power Grid Risk',
            status: 'MONITORING',
            statusColor: 'var(--aurora-cyan)',
            desc: 'G4+ storms can induce currents that damage transformers permanently.',
        },
        {
            icon: Satellite,
            title: 'Satellite Constellations',
            status: 'VULNERABLE',
            statusColor: 'var(--solar-flare)',
            desc: '10,000+ LEO satellites at risk from atmospheric drag during even minor G1 storms.',
        },
    ];

    return (
        <section id="solar-max-now" className="solarmax" ref={sectionRef}>
            <div className="solarmax__bg" />
            <div className="container">
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={magneticTransition}
                >
                    <div className="solarmax__layout">
                        <motion.div className="section-label" variants={fadeUp}>
                            <RadioIcon size={16} />
                            <span>What Comes Next</span>
                        </motion.div>

                        <motion.h2 variants={fadeUp} style={{ marginBottom: 'var(--space-3)' }}>
                            We are at the peak. Right now.
                        </motion.h2>

                        {/* Explainer text */}
                        <div className="solarmax__explainer">
                            <motion.p variants={fadeUp}>
                                Solar Cycle 25 has exceeded every prediction. The chart below
                                overlays the last five solar cycles so you can see where we
                                stand compared to history. The orange line is the current
                                cycle — and it's already higher than all forecasts.
                            </motion.p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={magneticTransition}
                >
                    {/* Cycle comparison chart */}
                    <div className="solarmax__chart-wrap">
                        <div className="solarmax__chart" ref={chartRef}>
                            <svg ref={svgRef} />
                        </div>

                        {/* Dynamic Tooltip */}
                        {tooltip && (
                            <div
                                className="solarmax__tooltip glass"
                                style={{
                                    left: `${tooltip.x}px`,
                                    top: `${tooltip.y}px`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                <div className="solarmax__tooltip-header mono">
                                    Month {tooltip.months} (Year {Math.floor(tooltip.months / 12)})
                                </div>
                                <div className="solarmax__tooltip-row">
                                    <span className="solarmax__tooltip-label">Cycle 25:</span>
                                    <span className="solarmax__tooltip-value accent-orange">{tooltip.c25 || 'N/A'}</span>
                                </div>
                                <div className="solarmax__tooltip-row">
                                    <span className="solarmax__tooltip-label">History Avg:</span>
                                    <span className="solarmax__tooltip-value">{tooltip.avg}</span>
                                </div>
                                {tooltip.c25 > tooltip.avg && (
                                    <div className="solarmax__tooltip-alert mono">
                                        +{((tooltip.c25 / tooltip.avg - 1) * 100).toFixed(0)}% Above Avg
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reading this chart — 3-column grid */}
                    <div className="solarmax__reading">
                        <motion.h3
                            className="solarmax__reading-heading"
                            variants={fadeUp}
                        >
                            <HelpCircle size={18} />
                            <span>Reading This Chart</span>
                        </motion.h3>
                        <div className="solarmax__reading-grid">
                            <motion.div
                                className="solarmax__reading-card glass"
                                variants={fadeUp}
                            >
                                <div className="solarmax__reading-icon">
                                    <BarChart3 size={18} />
                                </div>
                                <h4>The Grey Lines</h4>
                                <p>
                                    Past solar cycles (21–24) plotted by months since
                                    cycle start. Each peak represents a solar maximum.
                                    Notice how they vary in height and timing.
                                </p>
                            </motion.div>
                            <motion.div
                                className="solarmax__reading-card glass"
                                variants={fadeUp}
                            >
                                <div className="solarmax__reading-icon">
                                    <TrendingUp size={18} />
                                </div>
                                <h4>The Orange Line</h4>
                                <p>
                                    Cycle 25's actual sunspot data. The pulsing dot
                                    marks today. The dashed continuation shows the
                                    official NOAA/NASA forecast with uncertainty band.
                                </p>
                            </motion.div>
                            <motion.div
                                className="solarmax__reading-card glass"
                                variants={fadeUp}
                            >
                                <div className="solarmax__reading-icon">
                                    <RadioIcon size={18} />
                                </div>
                                <h4>Why It's Alarming</h4>
                                <p>
                                    Cycle 25 is 50%+ above predictions. Higher sunspot
                                    numbers mean more flares, more CMEs, and more risk
                                    to our increasingly satellite-dependent world.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-100px' }}
                    variants={magneticTransition}
                >
                    {/* Watch cards */}
                    <motion.div
                        className="solarmax__cards"
                        variants={{
                            initial: { opacity: 0 },
                            animate: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                    >
                        {watchCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <motion.div key={card.title} className="solarmax__card glass" variants={fadeUp}>
                                    <div className="solarmax__card-header">
                                        <Icon size={20} />
                                        <h4>{card.title}</h4>
                                    </div>
                                    <span
                                        className="solarmax__status mono"
                                        style={{ color: card.statusColor }}
                                    >
                                        {card.status}
                                    </span>
                                    <p>{card.desc}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* Closing statement */}
                    <div className="solarmax__closing">
                        <h2 className="solarmax__closing-text">
                            <motion.span
                                variants={{
                                    initial: { opacity: 0 },
                                    animate: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.08 }
                                    }
                                }}
                            >
                                {'History says the next big hit is not a matter of if.'.split(' ').map((word, i) => (
                                    <motion.span key={i} className="solarmax__closing-word" variants={{
                                        initial: { opacity: 0, y: 20 },
                                        animate: { opacity: 1, y: 0 }
                                    }}>
                                        {word}
                                    </motion.span>
                                ))}
                            </motion.span>
                        </h2>
                    </div>

                    <motion.div
                        className="solarmax__when"
                        variants={{
                            initial: { opacity: 0, scale: 0.9 },
                            animate: { opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.6 } }
                        }}
                    >
                        <h2 className="text-gradient-solar">It&apos;s when.</h2>
                    </motion.div>

                    {/* Conclusion Unit */}
                    <div className="solarmax__conclusion">
                        <motion.div
                            className="solarmax__reflection glass"
                            variants={fadeUp}
                        >
                            <div className="solarmax__reflection-content">
                                <h3>Our Resilience in the Solar Age</h3>
                                <p>
                                    As our society becomes increasingly reliant on fragile technology, our focus
                                    must shift from simple observation to proactive protection. While the sun’s temper
                                    remains beyond our control, our vulnerability is a matter of design.
                                </p>
                                <p>
                                    Hardening our global systems is not just a technical challenge—it is the
                                    infrastructure of our survival in the shadow of a living star.
                                </p>
                            </div>
                        </motion.div>

                        <div className="solarmax__shielding">
                            <motion.h4 className="solarmax__shielding-title" variants={fadeUp}>
                                <ShieldCheck size={16} style={{ marginBottom: '-3px', marginRight: '8px', color: 'var(--aurora-cyan)' }} />
                                Technological Shielding Strategies
                            </motion.h4>
                            <div className="solarmax__shielding-grid">
                                <motion.div className="solarmax__shield-card glass" variants={fadeUp}>
                                    <h4><Zap size={20} /> Hardened Grids</h4>
                                    <p>
                                        Installing high-capacity series capacitors and neutral-to-ground
                                        resistors to block geomagnetically induced currents (GICs) from entering transformers.
                                    </p>
                                </motion.div>
                                <motion.div className="solarmax__shield-card glass" variants={fadeUp}>
                                    <h4><Cpu size={20} /> Autonomous Satellites</h4>
                                    <p>
                                        Deploying radiation-hardened circuitry and AI-driven "Safe-Stow" protocols that
                                        automatically orient panels and shut down sensitive sensors during solar flares.
                                    </p>
                                </motion.div>
                                <motion.div className="solarmax__shield-card glass" variants={fadeUp}>
                                    <h4><Globe size={20} /> Early Warning Buoys</h4>
                                    <p>
                                        Establishing a deep-space sensor array at L1, L4, and L5 Lagrange points to
                                        provide 60-90 minutes of high-fidelity warning before an impact.
                                    </p>
                                </motion.div>
                                <motion.div className="solarmax__shield-card glass" variants={fadeUp}>
                                    <h4><Signal size={20} /> Redundant Comms</h4>
                                    <p>
                                        Moving critical global data to sub-oceanic fiber optic cables, which are
                                        largely immune to solar interference compared to satellite or HF radio links.
                                    </p>
                                </motion.div>
                            </div>
                        </div>

                        <motion.div
                            className="solarmax__takeaway-wrap"
                            variants={fadeUp}
                        >
                            <KeyTakeaway variant="warning">
                                We are living through the most active solar period in a
                                generation. The difference between "close call" and
                                "catastrophe" is a matter of foresight and preparation.
                            </KeyTakeaway>
                        </motion.div>

                        <motion.div
                            className="solarmax__final-stat"
                            variants={{
                                initial: { opacity: 0 },
                                animate: { opacity: 1, transition: { duration: 1, delay: 0.8 } }
                            }}
                        >
                            <p className="mono">
                                AVERAGE INTERVAL: ~150 YEARS. LAST EVENT: 1859.
                            </p>
                        </motion.div>
                    </div>

                    {/* Final Thank You */}
                    <motion.div
                        className="solarmax__thanks"
                        variants={fadeUp}
                    >
                        <div className="solarmax__thanks-glow" />

                        <motion.div className="solarmax__thanks-divider"
                            variants={{
                                initial: { scaleX: 0, opacity: 0 },
                                animate: { scaleX: 1, opacity: 0.5, transition: { duration: 1.5, ease: "easeOut" } }
                            }}
                        />

                        <div className="solarmax__thanks-content">
                            <motion.p className="solarmax__thanks-text"
                                variants={{
                                    initial: { opacity: 0, y: 20 },
                                    animate: {
                                        opacity: 1,
                                        y: 0,
                                        transition: { duration: 1.2, delay: 0.4, ease: "easeOut" }
                                    }
                                }}
                            >
                                Thank you for exploring the risks of our star on our modern lives.
                            </motion.p>

                            <motion.div className="solarmax__thanks-sig-wrap"
                                variants={{
                                    initial: { opacity: 0, scale: 0.95 },
                                    animate: {
                                        opacity: 1,
                                        scale: 1,
                                        transition: { duration: 1.5, delay: 1, ease: "easeOut" }
                                    }
                                }}
                            >
                                <span className="solarmax__thanks-sig">Valérie</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
