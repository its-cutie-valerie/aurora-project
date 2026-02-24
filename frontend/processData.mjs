// Pre-process CSV data files into JS modules
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, 'src/data');
mkdirSync(dataDir, { recursive: true });

// Parse CSV helper
function parseCSV(filepath) {
    const content = readFileSync(resolve(__dirname, filepath), 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
            const v = values[i]?.trim();
            if (v === '' || v === undefined) {
                obj[h.trim()] = null;
            } else if (!isNaN(Number(v))) {
                obj[h.trim()] = Number(v);
            } else {
                obj[h.trim()] = v;
            }
        });
        return obj;
    });
}

// 1. Process master_solar.csv → sunspotData.js and stormData.js
const master = parseCSV('datasets/master_solar.csv');

// Sunspot data: date, sunspot_number, solar_cycle
const sunspotData = master
    .filter(r => r.sunspot_number !== null)
    .map(r => ({
        date: r.date,
        sunspot_number: r.sunspot_number,
        solar_cycle: r.solar_cycle
    }));

writeFileSync(resolve(dataDir, 'sunspotData.js'),
    `// Monthly sunspot numbers 1749-present\n// Source: SILSO Royal Observatory of Belgium\nexport const sunspotData = ${JSON.stringify(sunspotData)};\n`
);

// Storm/Kp data: records with Kp data
const stormData = master
    .filter(r => r.kp_max_gfz !== null || r.kp_max_omni !== null)
    .map(r => ({
        date: r.date,
        kp_max: r.kp_max_gfz ?? r.kp_max_omni ?? null,
        kp_mean: r.kp_mean_gfz ?? r.kp_mean_omni ?? null,
        dst_min: r.dst_min,
        storm_days: r.storm_days,
        flares_X: r.flares_X,
        flares_M: r.flares_M,
        flares_C: r.flares_C,
        flares_B: r.flares_B,
        flares_A: r.flares_A,
        cme_count: r.cme_count,
        cme_speed_mean: r.cme_speed_mean,
        gst_count: r.gst_count,
        gst_kp_max: r.gst_kp_max,
        f10_7: r.f10_7_gfz ?? r.f10_7_omni ?? null,
        sw_speed_mean: r.sw_speed_mean,
        bz_min: r.bz_min
    }));

writeFileSync(resolve(dataDir, 'stormData.js'),
    `// Monthly storm/geomagnetic data\n// Source: GFZ Potsdam, OMNI2\nexport const stormData = ${JSON.stringify(stormData)};\n`
);

// Flare data for heatmap
const flareData = master
    .filter(r => r.flares_X !== null || r.flares_M !== null || r.flares_C !== null || r.flares_B !== null || r.flares_A !== null)
    .map(r => ({
        date: r.date,
        X: r.flares_X ?? 0,
        M: r.flares_M ?? 0,
        C: r.flares_C ?? 0,
        B: r.flares_B ?? 0,
        A: r.flares_A ?? 0
    }));

writeFileSync(resolve(dataDir, 'flareData.js'),
    `// Monthly flare counts by class\n// Source: NASA DONKI\nexport const flareData = ${JSON.stringify(flareData)};\n`
);

// 2. Process forecast_cycle25.csv
const forecast = parseCSV('datasets/forecast_cycle25.csv');
const forecastData = forecast.map(r => ({
    date: r.date,
    forecast: r.ssn_forecast,
    lower: r.ssn_lower,
    upper: r.ssn_upper
}));

writeFileSync(resolve(dataDir, 'forecastData.js'),
    `// Solar cycle 25 forecast with confidence bands\n// Source: SILSO/WDC-SILSO Forecast\nexport const forecastData = ${JSON.stringify(forecastData)};\n`
);

// 3. Process events_annotations.csv
const events = parseCSV('datasets/events_annotations.csv');
writeFileSync(resolve(dataDir, 'eventAnnotations.js'),
    `// Solar event annotations\n// Sources: NASA DONKI, OMNI2, Historical records\nexport const eventAnnotations = ${JSON.stringify(events)};\n`
);

console.log('✅ Data files generated:');
console.log(`   sunspotData.js  - ${sunspotData.length} records`);
console.log(`   stormData.js    - ${stormData.length} records`);
console.log(`   flareData.js    - ${flareData.length} records`);
console.log(`   forecastData.js - ${forecastData.length} records`);
console.log(`   eventAnnotations.js - ${events.length} records`);
