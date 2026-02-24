import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import ChromiumDino from './ChromiumDino';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { Zap, DollarSign, Radio, Info } from 'lucide-react';
import { glitchVariants } from '../../styles/animations';
import './ImpactSimulator.css';

const fadeUp = {
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.9, ease: 'easeOut' } }
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// CANVAS DIMENSIONS
// ══════════════════════════════════════════════════════════════════════════════

const CW = 1000;
const CH = 1000;

// ══════════════════════════════════════════════════════════════════════════════
// CITY LIGHTS — [lon, lat, size 1–5, flicker seed 0–1]
// ══════════════════════════════════════════════════════════════════════════════

interface City { lon: number; lat: number; size: number; seed: number }

const CITIES: City[] = [
    // North America (US & Mexico)
    { lon: -74, lat: 41, size: 5, seed: 0.23 }, { lon: -118, lat: 34, size: 5, seed: 0.67 }, { lon: -88, lat: 42, size: 4, seed: 0.41 },
    { lon: -95, lat: 30, size: 4, seed: 0.82 }, { lon: -112, lat: 33, size: 4, seed: 0.15 }, { lon: -75, lat: 40, size: 4, seed: 0.59 },
    { lon: -97, lat: 33, size: 4, seed: 0.33 }, { lon: -122, lat: 47, size: 4, seed: 0.71 }, { lon: -105, lat: 40, size: 3, seed: 0.48 },
    { lon: -71, lat: 42, size: 4, seed: 0.92 }, { lon: -84, lat: 34, size: 4, seed: 0.27 }, { lon: -80, lat: 26, size: 4, seed: 0.56 },
    { lon: -93, lat: 45, size: 3, seed: 0.13 }, { lon: -99, lat: 19, size: 5, seed: 0.07 }, { lon: -83, lat: 42, size: 3, seed: 0.44 },
    { lon: -122, lat: 37, size: 5, seed: 0.55 }, { lon: -90, lat: 30, size: 3, seed: 0.74 }, { lon: -103, lat: 20, size: 4, seed: 0.12 },
    { lon: -100, lat: 25, size: 4, seed: 0.34 }, { lon: -111, lat: 29, size: 3, seed: 0.88 }, { lon: -117, lat: 32, size: 4, seed: 0.51 },
    // Canada
    { lon: -79.3, lat: 43.6, size: 5, seed: 0.78 }, { lon: -73.5, lat: 45.5, size: 5, seed: 0.34 }, { lon: -123.1, lat: 49.2, size: 4, seed: 0.62 },
    { lon: -114.0, lat: 51.0, size: 4, seed: 0.11 }, { lon: -113.4, lat: 53.5, size: 3, seed: 0.99 }, { lon: -75.7, lat: 45.4, size: 4, seed: 0.45 },
    { lon: -71.2, lat: 46.8, size: 3, seed: 0.22 }, { lon: -97.1, lat: 49.8, size: 3, seed: 0.77 }, { lon: -63.5, lat: 44.6, size: 3, seed: 0.55 },
    // Europe
    { lon: -0.1, lat: 51.5, size: 5, seed: 0.19 }, { lon: 2.3, lat: 48.8, size: 5, seed: 0.74 }, { lon: 13.4, lat: 52.5, size: 4, seed: 0.31 },
    { lon: -3.7, lat: 40.4, size: 4, seed: 0.88 }, { lon: 12.4, lat: 41.9, size: 4, seed: 0.22 }, { lon: 4.9, lat: 52.3, size: 4, seed: 0.65 },
    { lon: 16.3, lat: 48.2, size: 3, seed: 0.47 }, { lon: 21.0, lat: 52.2, size: 4, seed: 0.91 }, { lon: 30.5, lat: 50.4, size: 4, seed: 0.38 },
    { lon: 37.6, lat: 55.7, size: 5, seed: 0.16 }, { lon: 30.3, lat: 59.9, size: 4, seed: 0.76 }, { lon: 18.0, lat: 59.3, size: 3, seed: 0.53 },
    { lon: 10.7, lat: 59.9, size: 3, seed: 0.29 }, { lon: 24.9, lat: 60.1, size: 3, seed: 0.84 }, { lon: 23.7, lat: 37.9, size: 4, seed: 0.61 },
    { lon: 28.9, lat: 41.0, size: 5, seed: 0.37 }, { lon: 26.1, lat: 44.4, size: 3, seed: 0.73 }, { lon: 2.1, lat: 41.3, size: 4, seed: 0.46 },
    { lon: 9.1, lat: 45.4, size: 4, seed: 0.95 }, { lon: 9.9, lat: 53.5, size: 4, seed: 0.58 }, { lon: -9.1, lat: 38.7, size: 3, seed: 0.67 },
    { lon: 4.3, lat: 50.8, size: 4, seed: 0.12 }, { lon: 14.4, lat: 50.0, size: 3, seed: 0.33 },
    // Asia
    { lon: 139.6, lat: 35.6, size: 5, seed: 0.43 }, { lon: 135.5, lat: 34.6, size: 4, seed: 0.86 }, { lon: 126.9, lat: 37.5, size: 5, seed: 0.12 },
    { lon: 116.4, lat: 39.9, size: 5, seed: 0.69 }, { lon: 121.4, lat: 31.2, size: 5, seed: 0.35 }, { lon: 113.2, lat: 23.1, size: 4, seed: 0.81 },
    { lon: 114.1, lat: 22.3, size: 5, seed: 0.26 }, { lon: 106.5, lat: 29.5, size: 4, seed: 0.64 }, { lon: 114.2, lat: 30.5, size: 4, seed: 0.93 },
    { lon: 117.2, lat: 39.1, size: 4, seed: 0.52 }, { lon: 77.2, lat: 28.6, size: 5, seed: 0.39 }, { lon: 72.8, lat: 19.0, size: 5, seed: 0.83 },
    { lon: 77.5, lat: 12.9, size: 4, seed: 0.24 }, { lon: 88.3, lat: 22.5, size: 4, seed: 0.57 }, { lon: 67.0, lat: 24.8, size: 5, seed: 0.11 },
    { lon: 90.4, lat: 23.8, size: 4, seed: 0.79 }, { lon: 100.5, lat: 13.7, size: 4, seed: 0.42 }, { lon: 106.8, lat: -6.2, size: 5, seed: 0.96 },
    { lon: 103.8, lat: 1.3, size: 5, seed: 0.18 }, { lon: 120.9, lat: 14.5, size: 4, seed: 0.66 }, { lon: 51.3, lat: 35.6, size: 4, seed: 0.30 },
    { lon: 44.3, lat: 33.3, size: 4, seed: 0.87 }, { lon: 46.7, lat: 24.7, size: 4, seed: 0.54 }, { lon: 55.2, lat: 25.2, size: 4, seed: 0.20 },
    { lon: 121.5, lat: 25.0, size: 4, seed: 0.14 }, { lon: 106.6, lat: 10.7, size: 4, seed: 0.77 }, { lon: 101.6, lat: 3.1, size: 4, seed: 0.33 },
    { lon: 74.3, lat: 31.5, size: 4, seed: 0.88 }, { lon: 78.4, lat: 17.3, size: 4, seed: 0.41 }, { lon: 80.2, lat: 13.0, size: 4, seed: 0.99 },
    // Africa
    { lon: 3.3, lat: 6.5, size: 5, seed: 0.85 }, { lon: 31.2, lat: 30.0, size: 5, seed: 0.14 }, { lon: 15.3, lat: -4.3, size: 4, seed: 0.70 },
    { lon: 36.8, lat: -1.2, size: 4, seed: 0.45 }, { lon: 28.0, lat: -26.2, size: 4, seed: 0.28 }, { lon: 18.4, lat: -33.9, size: 3, seed: 0.90 },
    { lon: -7.5, lat: 33.5, size: 4, seed: 0.03 }, { lon: 38.7, lat: 9.0, size: 4, seed: 0.72 }, { lon: 3.0, lat: 36.7, size: 3, seed: 0.50 },
    { lon: 32.5, lat: 15.5, size: 3, seed: 0.38 }, { lon: -0.1, lat: 5.6, size: 4, seed: 0.66 },
    // South America
    { lon: -46.6, lat: -23.5, size: 5, seed: 0.63 }, { lon: -58.3, lat: -34.6, size: 5, seed: 0.10 }, { lon: -43.1, lat: -22.9, size: 4, seed: 0.94 },
    { lon: -77.0, lat: -12.0, size: 4, seed: 0.40 }, { lon: -74.0, lat: 4.7, size: 4, seed: 0.76 }, { lon: -70.6, lat: -33.4, size: 4, seed: 0.32 },
    { lon: -66.9, lat: 10.4, size: 3, seed: 0.07 }, { lon: -47.8, lat: -15.7, size: 3, seed: 0.55 }, { lon: -51.2, lat: -30.0, size: 4, seed: 0.22 },
    { lon: -38.5, lat: -3.7, size: 4, seed: 0.66 }, { lon: -75.5, lat: 6.2, size: 3, seed: 0.88 }, { lon: -79.8, lat: -2.1, size: 3, seed: 0.11 },
    { lon: -78.4, lat: -0.2, size: 3, seed: 0.44 }, { lon: -63.1, lat: -17.7, size: 3, seed: 0.99 }, { lon: -57.6, lat: -25.2, size: 3, seed: 0.33 },
    { lon: -56.1, lat: -34.9, size: 3, seed: 0.77 }, { lon: -60.0, lat: -3.1, size: 3, seed: 0.21 }, { lon: -34.8, lat: -8.0, size: 3, seed: 0.54 },
    { lon: -38.5, lat: -12.9, size: 3, seed: 0.81 }, { lon: -43.9, lat: -19.9, size: 4, seed: 0.19 }, { lon: -49.2, lat: -25.4, size: 3, seed: 0.65 },
    { lon: -64.1, lat: -31.4, size: 3, seed: 0.47 }, { lon: -60.6, lat: -32.9, size: 3, seed: 0.92 },
    // Oceania
    { lon: 151.2, lat: -33.8, size: 5, seed: 0.97 }, { lon: 144.9, lat: -37.8, size: 4, seed: 0.60 }, { lon: 153.0, lat: -27.4, size: 4, seed: 0.15 },
    { lon: 115.8, lat: -31.9, size: 3, seed: 0.80 }, { lon: 174.7, lat: -36.8, size: 4, seed: 0.44 }, { lon: 138.6, lat: -34.9, size: 3, seed: 0.27 }
];

// ══════════════════════════════════════════════════════════════════════════════
// DERIVED STORM VALUES
// ══════════════════════════════════════════════════════════════════════════════

const getFlareLabel = (v: number) => {
    if (v < 25) return `M${((v - 10) / 1.5).toFixed(1)}`;
    if (v < 50) return `X${((v - 25) * 0.4).toFixed(1)}`;
    if (v < 75) return `X${(10 + (v - 50) * 0.68).toFixed(0)}`;
    return `X${(28 + (v - 75)).toFixed(0)}`;
};

const getThumbColor = (v: number) =>
    v < 30 ? '#10B981' : v < 50 ? '#FBBF24' : v < 65 ? '#F97316' : v < 80 ? '#EF4444' : '#dc2626';

interface StormData {
    gridLabel: string; gridColor: string; gridPct: number;
    gScale: string; gColor: string; auroraLat: string;
    economicLabel: string; economicColor: string; affectedPct: number;
}

const getStormData = (v: number): StormData => {
    const affectedPct = Math.max(0, Math.min(100, ((v - 20) / 75) * 100));
    if (v < 25) return { gridLabel: 'NOMINAL', gridColor: '#10B981', gridPct: 5, gScale: 'G0', gColor: '#10B981', auroraLat: 'None visible', economicLabel: '< $1B / day', economicColor: '#10B981', affectedPct };
    if (v < 40) return { gridLabel: 'DEGRADED', gridColor: '#FBBF24', gridPct: 20, gScale: 'G2', gColor: '#FBBF24', auroraLat: '≥ 65° lat', economicLabel: '$2–10B / day', economicColor: '#FBBF24', affectedPct };
    if (v < 55) return { gridLabel: 'STRESSED', gridColor: '#F97316', gridPct: 45, gScale: 'G3', gColor: '#F97316', auroraLat: '≥ 55° lat', economicLabel: '$10–50B / day', economicColor: '#F97316', affectedPct };
    if (v < 70) return { gridLabel: 'CRITICAL', gridColor: '#EF4444', gridPct: 70, gScale: 'G4', gColor: '#EF4444', auroraLat: '≥ 45° lat', economicLabel: '$50–500B / day', economicColor: '#EF4444', affectedPct };
    if (v < 85) return { gridLabel: 'COLLAPSE', gridColor: '#dc2626', gridPct: 88, gScale: 'G5', gColor: '#dc2626', auroraLat: '≥ 30° lat', economicLabel: '$0.5–2T / day', economicColor: '#dc2626', affectedPct };
    return { gridLabel: 'EXTINCTION', gridColor: '#7f1d1d', gridPct: 100, gScale: 'G5+', gColor: '#7f1d1d', auroraLat: 'Global', economicLabel: '> $10T total', economicColor: '#7f1d1d', affectedPct };
};
const BLACKOUT_MESSAGES = [
    { code: 'ERR_CONNECTION_TIMED_OUT', sub: 'Signal propagation interrupted by ionospheric saturation. The Sun has priority access.' },
    { code: 'ERR_NAME_NOT_RESOLVED', sub: 'Global DNS infrastructure is experiencing temporary solar-induced amnesia.' },
    { code: 'ERR_INTERNET_DISCONNECTED', sub: 'Planetary communications degraded. Analog alternatives recommended.' },
    { code: 'ERR_CONNECTION_REFUSED', sub: 'Remote systems are no longer responding to external reality.' },
    { code: 'ERR_ADDRESS_UNREACHABLE', sub: 'Routing tables destabilized after geomagnetic field disturbance.' },
    { code: 'ERR_GRID_FAILURE', sub: 'Regional power infrastructure entered protective shutdown. Restart timeline uncertain.' },
    { code: 'ERR_SATELLITE_OFFLINE', sub: 'Multiple orbital assets currently unresponsive following radiation exposure.' },
    { code: 'ERR_BACKBONE_COLLAPSE', sub: 'Long-distance fiber repeaters lost synchronization during induced current surge.' },
    { code: 'ERR_NAVIGATION_UNAVAILABLE', sub: 'Satellite positioning drift exceeds safe operational limits.' },
    { code: 'ERR_DATA_CORRUPTION_DETECTED', sub: 'Bit integrity compromised by high-energy particle interference.' },
    { code: 'ERR_FAILOVER_FAILED', sub: 'Redundant systems unavailable. They were also on Earth.' },
    { code: 'ERR_INFRASTRUCTURE_REBOOTING', sub: 'Large portions of modern civilization are attempting to power cycle.' },
    { code: 'ERR_EXTERNAL_ENVIRONMENT_HOSTILE', sub: 'Space weather conditions exceed engineering assumptions.' },
    { code: 'ERR_WAIT_INDEFINITELY', sub: 'Recovery will begin once the star finishes what it is doing.' }
];



// ══════════════════════════════════════════════════════════════════════════════
// CANVAS DRAW
// ══════════════════════════════════════════════════════════════════════════════

type WorldTopology = Topology<{ land: GeometryCollection; countries: GeometryCollection }>;

// ─── BACKGROUND STARS ────────────────────────────────────────────────────────
const STARS = Array.from({ length: 150 }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH,
    size: Math.random() * 1.5,
    opacity: 0.1 + Math.random() * 0.7,
    seed: Math.random() * 100
}));

const drawStars = (ctx: CanvasRenderingContext2D, time: number) => {
    STARS.forEach(star => {
        const flicker = Math.sin(time * 0.001 + star.seed) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * flicker})`;
        // Using fillRect is significantly faster than arc() for small 1-2px elements
        ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    });
};

const GRATICULE = d3.geoGraticule().step([15, 15])();

const drawFrame = (
    ctx: CanvasRenderingContext2D,
    land: d3.GeoPermissibleObjects,
    projection: d3.GeoProjection,
    intensity: number,
    time: number,
) => {
    ctx.clearRect(0, 0, CW, CH);
    drawStars(ctx, time);

    const path = d3.geoPath(projection, ctx);

    const cx = CW / 2;
    const cy = CH / 2;
    const radius = Math.min(CW, CH) / 2 * 0.85;

    // ── Atmosphere Glow ──────────────────────────────────────────────────────
    // Fixed: Reduced radius from 1.5 to 1.15 to prevent sharp canvas edge cutoff
    const atmosphericGlow = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.15);
    atmosphericGlow.addColorStop(0, 'rgba(0, 100, 255, 0.2)');
    atmosphericGlow.addColorStop(0.4, 'rgba(50, 160, 255, 0.08)');
    atmosphericGlow.addColorStop(0.7, 'rgba(100, 210, 255, 0.03)');
    atmosphericGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = atmosphericGlow;
    ctx.fillRect(0, 0, CW, CH);

    // ── Sunward Indicator (Reactive) ─────────────────────────────────────────
    const sunX = cx - radius * 1.4;
    const sunY = cy;

    // Draw "Solar Wind" stream lines
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const yOff = (i - 2) * radius * 0.4;
        const alpha = (0.05 + Math.sin(time * 0.002 + i) * 0.02) * (intensity / 100);
        ctx.moveTo(sunX - 100, sunY + yOff);
        ctx.lineTo(cx - radius * 0.8, sunY + yOff);
        ctx.strokeStyle = `rgba(255, 230, 150, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── Magnetopause Shield ──────────────────────────────────────────────────
    if (intensity > 15) {
        const shieldT = Math.min(1, (intensity - 15) / 85);
        const shieldDist = radius * (1.1 - shieldT * 0.18);
        const shake = Math.sin(time * 0.08) * intensity * 0.08;

        ctx.beginPath();
        ctx.arc(cx - radius * 0.2, cy, shieldDist + shake, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.1 + shieldT * 0.5})`;
        ctx.lineWidth = 2 + shieldT * 6;
        ctx.setLineDash([15, 25]);
        ctx.lineDashOffset = -time * 0.08;
        ctx.stroke();
        ctx.setLineDash([]);

        // Impact Glow
        const impactGlow = ctx.createRadialGradient(cx - shieldDist, cy, 0, cx - shieldDist, cy, radius * 0.4);
        impactGlow.addColorStop(0, `rgba(255, 200, 100, ${shieldT * 0.3})`);
        impactGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = impactGlow;
        ctx.fillRect(0, 0, CW, CH);
    }

    // ── Globe Base (Hard Shield) ──────────────────────────────────────────────
    // Fixed "see-through" by ensuring a perfectly opaque foundation
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#01040a'; // Absolute deep-space void
    ctx.fill();

    // Ocean Depth (Multi-layered for realism)
    const oceanGrad = ctx.createRadialGradient(cx * 0.7, cy * 0.7, radius * 0.05, cx, cy, radius);
    oceanGrad.addColorStop(0, '#103060'); // Bright patch
    oceanGrad.addColorStop(0.5, '#051225');
    oceanGrad.addColorStop(1, '#020205');
    ctx.fillStyle = oceanGrad;
    ctx.fill();

    // Specular Highlight (The "Shine")
    const specular = ctx.createRadialGradient(cx * 0.6, cy * 0.6, 0, cx * 0.6, cy * 0.6, radius * 0.8);
    specular.addColorStop(0, 'rgba(150, 200, 255, 0.12)');
    specular.addColorStop(1, 'transparent');
    ctx.fillStyle = specular;
    ctx.fill();

    // ── Hull Glow (Atmospheric Volume) ───────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
    ctx.stroke();

    // ── Day/Night Shading (Smarter occlusion) ────────────────────────────────
    const nightGrad = ctx.createLinearGradient(cx - radius * 0.8, cy, cx + radius, cy);
    nightGrad.addColorStop(0, 'rgba(0,0,0,0)');
    nightGrad.addColorStop(0.4, 'rgba(0,0,0,0.5)');
    nightGrad.addColorStop(0.9, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = nightGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // ── Graticule ────────────────────────────────────────────────────────────
    ctx.beginPath();
    path(GRATICULE);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── Landmasses ───────────────────────────────────────────────────────────
    ctx.beginPath();
    path(land);
    ctx.fillStyle = '#14332b';
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // ── Storm Tints (Reactive colors) ────────────────────────────────────────
    if (intensity > 25) {
        ctx.save();
        ctx.beginPath();
        path(land);
        ctx.clip();
        const t = Math.min(1, (intensity - 25) / 75);
        const rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        rGrad.addColorStop(0, `rgba(255, ${100 - t * 100}, 0, ${t * 0.5})`);
        rGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = rGrad;
        ctx.fillRect(0, 0, CW, CH);
        ctx.restore();
    }

    // ── City Lights ──────────────────────────────────────────────────────────
    const rot = projection.rotate();
    const center: [number, number] = [-rot[0], -rot[1]];

    CITIES.forEach(city => {
        // Explicitly check if the city is on the visible hemisphere (within 90 degrees of the center)
        // to prevent "see-through" artifacts where back-side lights are drawn on top.
        if (d3.geoDistance([city.lon, city.lat], center) > Math.PI / 2) return;

        const pt = projection([city.lon, city.lat]);
        if (!pt) return;
        const [px, py] = pt;

        const latAbs = Math.abs(city.lat);
        const normI = Math.max(0, (intensity - 10) / 90);
        const safeThreshold = 90 * (1 - normI);
        const flicker = Math.sin(time * (0.003 + city.seed * 0.004) + city.seed * 100) * 0.5 + 0.5;

        let power: number;
        if (latAbs < safeThreshold - 14) power = 1;
        else if (latAbs > safeThreshold + 6) power = Math.min(1, (latAbs - safeThreshold - 6) / 24) > 0.85 ? 0 : flicker * 0.15;
        else power = (1 - (latAbs - (safeThreshold - 14)) / 20) * (0.6 + flicker * 0.4);

        if (power <= 0.01) return;

        // More visceral heat for high intensity power
        const glowR = city.size * (3 + city.size * 0.8);
        const grd = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grd.addColorStop(0, `rgba(255, 230, 150, ${power * 0.8})`);
        grd.addColorStop(0.5, `rgba(255, 100, 0, ${power * 0.3})`);
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grd;
        // fillRect over the radius bounding box applies the radial gradient much faster than an arc
        ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

        ctx.fillStyle = `rgba(255, 255, 200, ${power})`;
        const coreR = city.size * 0.4;
        ctx.fillRect(px - coreR, py - coreR, coreR * 2, coreR * 2);
    });

    // ── Cinematic Auroras ("Soft Shiny Stuffs" Mode) ─────────────────────────
    if (intensity > 20) {
        const tA = Math.min(1, (intensity - 20) / 80);
        const auroraLat = 75 - tA * 45;

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Professional light-leak blending

        for (const hem of [-1, 1]) {
            // Shiny Layers: Outer Glow -> Inner Core -> High Sheen
            for (let layer = 0; layer < 3; layer++) {
                const bands = [];
                // Very software, low opacity for "shiny" feel
                const bandAlpha = (0.08 + (1 - layer * 0.3) * 0.25) * tA;

                let r, g, b;
                if (tA < 0.3) {
                    r = 0; g = 255; b = 180; // Ethereal Mint
                } else if (tA < 0.6) {
                    r = 100; g = 180; b = 255; // Electric Azure
                } else {
                    r = 255; g = 100; b = 200; // Galactic Pink
                }

                const colorBase = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${bandAlpha})`;

                for (let i = 0; i < 2; i++) {
                    const bandLat = (auroraLat + (layer * 4) + i * 3) * hem;
                    // Slightly slower, more "floating" movement
                    const wave1 = Math.sin(time * 0.0008 + i * 1.5 + layer) * (4 + tA * 8);
                    const wave2 = Math.cos(time * 0.0005 - i) * (3 + tA * 5);

                    const coords = d3.range(-180, 181, 15).map(lon => [lon, bandLat + wave1 + wave2]);
                    bands.push(coords);
                }

                ctx.beginPath();
                path({ type: 'MultiLineString', coordinates: bands });

                // Multi-pass Blur for softness
                ctx.shadowBlur = (layer + 1) * 20 * tA;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${bandAlpha * 1.5})`;
                ctx.strokeStyle = colorBase;
                ctx.lineWidth = 25 - layer * 8; // Wider, softer bands
                ctx.lineCap = 'round';
                ctx.stroke();

                // Bright "Shiny" Edge Reflection
                if (layer === 2) {
                    ctx.globalAlpha = 0.5 * tA;
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════




export const ImpactSimulator: React.FC = () => {
    const [isSimStarted, setIsSimStarted] = useState(false);
    const [intensity, setIntensity] = useState(10);
    const [blackoutPhase, setBlackoutPhase] = useState<'none' | 'black' | 'error'>('none');
    const [blackoutIdx, setBlackoutIdx] = useState(0);

    const timeoutMsgRef = useRef<number | null>(null);
    const timeoutErrRef = useRef<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const rafRef = useRef<number>(0);
    const intensityRef = useRef(intensity);
    intensityRef.current = intensity;

    // Geo objects stored in a ref — loaded once, never triggers re-render
    const geoRef = useRef<{ land: d3.GeoPermissibleObjects; projection: d3.GeoProjection } | null>(null);

    // ── Load world-atlas TopoJSON (replaces ~200 lines of hand-coded polygons) ──
    const rotateRef = useRef<[number, number, number]>([-40, -20, 0]); // Init rotation
    const isDraggingRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isSimStarted) return;
        d3.json<WorldTopology>('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(world => {
                if (!world) return;
                const land = topojson.feature(world, world.objects.land);
                const radius = Math.min(CW, CH) / 2 * 0.85;
                const projection = d3.geoOrthographic()
                    .scale(radius)
                    .translate([CW / 2, CH / 2])
                    .clipAngle(90);
                geoRef.current = { land, projection };
            });
    }, [isSimStarted]);

    // ── Animation loop (reads intensity via ref — no restarts on slider change) ──
    const isInView = useInView(sectionRef, { margin: '100px' });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isSimStarted) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const start = performance.now();

        // Setup Drag Interaction
        const drag = d3.drag<HTMLCanvasElement, unknown>()
            .on('start', () => { isDraggingRef.current = true; })
            .on('drag', (event) => {
                if (geoRef.current) {
                    const rot = geoRef.current.projection.rotate();
                    // Sensitivity scaling based on canvas size
                    const k = 120 / geoRef.current.projection.scale();
                    rotateRef.current = [
                        rot[0] + event.dx * k,
                        Math.max(-90, Math.min(90, rot[1] - event.dy * k)),
                        rot[2]
                    ];
                }
            })
            .on('end', () => { isDraggingRef.current = false; });

        d3.select(canvas).call(drag);

        const loop = (now: number) => {
            if (!isInView) {
                rafRef.current = requestAnimationFrame(loop);
                return;
            }

            if (geoRef.current) {
                // Auto-rotation if not dragging
                if (!isDraggingRef.current) {
                    rotateRef.current[0] += 0.08; // Base spin speed
                }

                geoRef.current.projection.rotate(rotateRef.current);
                drawFrame(ctx, geoRef.current.land, geoRef.current.projection, intensityRef.current, now - start);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafRef.current);
            d3.select(canvas).on('.drag', null);
        };
    }, [isInView, isSimStarted]); // Restart loop when visibility or activation changes

    // ── Scroll entrance handled by Framer Motion ──────────────────────────────

    // ── Blackout Sequence ──────────────────────────────────────────────────
    useEffect(() => {
        if (intensity >= 80 && blackoutPhase === 'none') {
            if (!timeoutMsgRef.current) {
                const delay = Math.max(1500, (100 - intensity) * 200);
                timeoutMsgRef.current = setTimeout(() => {
                    setBlackoutPhase('black');
                    setBlackoutIdx(Math.floor(Math.random() * BLACKOUT_MESSAGES.length));
                    timeoutMsgRef.current = null;
                }, delay) as unknown as number;
            }
        } else if (intensity < 80 && blackoutPhase === 'none') {
            if (timeoutMsgRef.current) {
                clearTimeout(timeoutMsgRef.current);
                timeoutMsgRef.current = null;
            }
        }
    }, [intensity, blackoutPhase]);

    useEffect(() => {
        if (blackoutPhase === 'black' && !timeoutErrRef.current) {
            timeoutErrRef.current = setTimeout(() => {
                setBlackoutPhase('error');
                setIsSimStarted(false); // Shut down simulation engine for performance
                timeoutErrRef.current = null;
            }, 100) as unknown as number;
        }
    }, [blackoutPhase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutMsgRef.current) clearTimeout(timeoutMsgRef.current);
            if (timeoutErrRef.current) clearTimeout(timeoutErrRef.current);
        };
    }, []);

    const handleReload = () => {
        if (timeoutMsgRef.current) clearTimeout(timeoutMsgRef.current);
        if (timeoutErrRef.current) clearTimeout(timeoutErrRef.current);
        timeoutMsgRef.current = null;
        timeoutErrRef.current = null;
        setBlackoutPhase('none');
        setIntensity(10);
        setIsSimStarted(false); // Return to placeholder state
    };

    const pct = ((intensity - 10) / 90) * 100;
    const thumbColor = getThumbColor(intensity);
    const storm = getStormData(intensity);

    return (
        <section id="simulator" className="sim section" ref={sectionRef}>
            <div className="sim__bg" />
            <div className="container">

                {/* ── Header ── */}
                <div className="sim__header section-text-column">
                    <motion.div
                        className="section-label"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-100px' }}
                        variants={fadeUp}
                    >
                        <Zap size={14} />
                        <span className="eyebrow">Interactive Simulation</span>
                    </motion.div>
                    <motion.h2
                        className="section-title"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-100px' }}
                        variants={fadeUp}
                        transition={{ delay: 0.1 }}
                    >
                        Watch the <span className="text-gradient-solar">Lights</span> Die.
                    </motion.h2>
                    <motion.p
                        className="section-description"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-100px' }}
                        variants={fadeUp}
                        transition={{ delay: 0.2 }}
                    >
                        Drag the slider to escalate the solar storm. Watch cities go dark in real-time —
                        starting from the poles and cascading toward the equator as geomagnetic fury intensifies.
                    </motion.p>
                </div>

                {/* ── Dashboard ── */}
                {!isSimStarted ? (
                    <motion.div
                        className="sim__placeholder"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        onClick={() => setIsSimStarted(true)}
                    >
                        <div className="sim__placeholder-rings">
                            <div className="sim__placeholder-ring" />
                            <div className="sim__placeholder-ring sim__placeholder-ring--2" />
                        </div>
                        <div className="sim__placeholder-content">
                            <Zap className="sim__placeholder-icon" size={32} />
                            <h3 className="sim__placeholder-title">Simulation Offline</h3>
                            <p className="sim__placeholder-text">
                                Planetary impact modeling requires significant system resources.
                                Click to initialize the geomagnetic storm atlas.
                            </p>
                            <button className="sim__placeholder-btn">
                                Activate Simulation
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        className="sim__dashboard"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <div className="sim__top-row">
                            {/* Canvas map */}
                            <div className="sim__map-wrap">
                                <canvas
                                    ref={canvasRef}
                                    width={CW}
                                    height={CH}
                                    className="sim__canvas"
                                    aria-label="Earth night-lights simulation"
                                />

                                {/* Visceral G5 Effects */}
                                <div className={`sim__glitch-overlay ${intensity >= 70 ? 'active' : ''}`} />
                                <div className={`sim__static ${intensity >= 85 ? 'intense' : ''}`} />


                                {/* Severity badge */}
                                <div className="sim__map-badge" style={{
                                    color: thumbColor,
                                    borderColor: `${thumbColor}55`,
                                    boxShadow: `0 0 20px ${thumbColor}30`,
                                }}>
                                    <span className="sim__badge-class">{getFlareLabel(intensity)}</span>
                                    <span className="sim__badge-label">Solar Flare</span>
                                </div>

                                {/* Auroral boundary line indicator */}
                                {intensity > 20 && (
                                    <div
                                        className="sim__lat-indicator"
                                        style={{ '--lat-pct': `${(1 - (68 - ((intensity - 20) / 80) * 38) / 90) * 50}%` } as React.CSSProperties}
                                    >
                                        <span className="sim__lat-label">Auroral boundary</span>
                                    </div>
                                )}

                                {/* Legend */}
                                <div className="sim__legend">
                                    <span className="sim__legend-dot sim__legend-dot--on" />
                                    <span>Powered</span>
                                    <span className="sim__legend-dot sim__legend-dot--off" />
                                    <span>Blackout</span>
                                </div>
                            </div>

                            {/* ── Stat cards ── */}
                            <div className="sim__stats">
                                {/* Power Grid */}
                                <motion.div
                                    className="sim__stat"
                                    style={{ '--sc': storm.gridColor } as React.CSSProperties}
                                    animate={intensity >= 65 ? "glitch" : "idle"}
                                    variants={glitchVariants}
                                >
                                    <div className="sim__stat-top">
                                        <span className="sim__stat-icon"><Zap size={13} /></span>
                                        <span className="sim__stat-name">POWER GRID</span>
                                        <div className="sim__tooltip-wrap">
                                            <Info size={12} className="sim__tooltip-icon" />
                                            <div className="sim__tooltip">Measures cascading blackouts as high-voltage transformers fail under geomagnetically induced currents.</div>
                                        </div>
                                    </div>
                                    <div className="sim__stat-value" style={{ color: storm.gridColor }}>{storm.gridLabel}</div>
                                    <div className="sim__stat-bar-wrap">
                                        <div className="sim__stat-bar" style={{ width: `${storm.gridPct}%`, background: storm.gridColor }} />
                                    </div>
                                    <div className="sim__stat-sub">{storm.affectedPct.toFixed(0)}% of cities affected</div>
                                </motion.div>

                                {/* Economic Loss */}
                                <motion.div
                                    className="sim__stat"
                                    style={{ '--sc': storm.economicColor } as React.CSSProperties}
                                    animate={intensity >= 80 ? "glitch" : "idle"}
                                    variants={glitchVariants}
                                >
                                    <div className="sim__stat-top">
                                        <span className="sim__stat-icon"><DollarSign size={13} /></span>
                                        <span className="sim__stat-name">ECONOMIC LOSS</span>
                                        <div className="sim__tooltip-wrap">
                                            <Info size={12} className="sim__tooltip-icon" />
                                            <div className="sim__tooltip">Estimated global daily GDP lost due to power outages, supply chain collapse, and satellite damage.</div>
                                        </div>
                                    </div>
                                    <div className="sim__stat-value" style={{ color: storm.economicColor }}>{storm.economicLabel}</div>
                                    <div className="sim__stat-bar-wrap">
                                        <div className="sim__stat-bar" style={{ width: `${Math.min(100, pct * 1.1)}%`, background: storm.economicColor }} />
                                    </div>
                                    <div className="sim__stat-sub">Estimated global daily GDP</div>
                                </motion.div>

                                {/* Geomagnetic Scale */}
                                <motion.div
                                    className="sim__stat"
                                    style={{ '--sc': storm.gColor } as React.CSSProperties}
                                    animate={intensity >= 55 ? "glitch" : "idle"}
                                    variants={glitchVariants}
                                >
                                    <div className="sim__stat-top">
                                        <span className="sim__stat-icon"><Radio size={13} /></span>
                                        <span className="sim__stat-name">GEOMAGNETIC</span>
                                        <div className="sim__tooltip-wrap">
                                            <Info size={12} className="sim__tooltip-icon" />
                                            <div className="sim__tooltip">The NOAA G-Scale measures disturbances in Earth's magnetic field, pushing auroras toward the equator.</div>
                                        </div>
                                    </div>
                                    <div className="sim__stat-value" style={{ color: storm.gColor }}>Scale {storm.gScale}</div>
                                    <div className="sim__stat-bar-wrap">
                                        <div className="sim__stat-bar" style={{ width: `${storm.gridPct}%`, background: storm.gColor }} />
                                    </div>
                                    <div className="sim__stat-sub">Aurora visible at {storm.auroraLat}</div>
                                </motion.div>
                            </div>
                        </div> {/* End Top Row */}

                        {/* ── Custom slider ── */}
                        <div className="sim__slider-section">
                            <div className="sim__slider-header">
                                <span className="sim__slider-title">Flare Magnitude</span>
                                <span className="sim__slider-value" style={{ color: thumbColor }}>
                                    {getFlareLabel(intensity)}
                                    <span className="sim__slider-value-sub">
                                        {intensity >= 85 ? 'Carrington-level' : intensity >= 65 ? 'Extreme' : intensity >= 40 ? 'X-class' : 'M-class'}
                                    </span>
                                </span>
                            </div>

                            <div
                                className="sim__slider-wrap"
                                style={{ '--pct': `${pct}%`, '--tc': thumbColor } as React.CSSProperties}
                            >
                                {/* Visual track (pointer-events: none) */}
                                <div className="sim__track">
                                    <div className="sim__track-fill" />
                                    <div className="sim__track-thumb" style={{
                                        background: thumbColor,
                                        boxShadow: `0 0 14px ${thumbColor}, 0 0 28px ${thumbColor}60`,
                                    }} />
                                </div>
                                {/* Invisible native range on top — captures all interaction */}
                                <input
                                    type="range" min={10} max={100} step={1} value={intensity}
                                    onChange={e => setIntensity(+e.target.value)}
                                    className="sim__range-native"
                                    aria-label="Solar flare magnitude"
                                />
                            </div>

                            <div className="sim__track-labels">
                                <span>M-class</span><span>X1</span><span>X10</span><span>X28 ★</span><span>X50+</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <motion.p
                    className="sim__footnote"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    transition={{ delay: 0.4 }}
                >
                    ★ The 2003 Halloween Storm reached X28 — the most powerful flare in recorded history.
                    The 1859 Carrington Event is estimated at X45+, before modern instrumentation.
                </motion.p>

            </div>

            {/* ── Space Blackout Sequence ── */}
            <AnimatePresence>
                {blackoutPhase !== 'none' && (
                    <motion.div
                        className={`sim__blackout-container phase-${blackoutPhase}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                    >
                        {blackoutPhase === 'error' && (
                            <motion.div
                                className="sim__chrome-error"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="sim__dino-spacer">
                                    <ChromiumDino />
                                </div>
                                <h1 className="sim__blackout-title">This site can’t be reached</h1>
                                <p className="sim__blackout-desc">
                                    The webpage at <strong>solar://flare-simulator/</strong> has been temporarily ghosted by the grid. It's not you, it's the solar weather.
                                </p>
                                <p className="sim__blackout-code">{BLACKOUT_MESSAGES[blackoutIdx].code}</p>

                                <div className="sim__blackout-actions">
                                    <button className="sim__reload-btn" onClick={handleReload}>I acknowledge the risks Sun can have on our planet</button>
                                </div>

                                <div className="sim__blackout-sub">
                                    {BLACKOUT_MESSAGES[blackoutIdx].sub}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};