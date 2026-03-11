# The Sun's Temper: Aurora Project

A technical data science and visualization platform engineered to analyze solar dynamics and their socio-economic impact on Earth. This project aggregates three centuries of solar observations into an immersive, interactive experience.

## Best Storyteller Prize Winner
**[Codédex February 2026 Monthly Challenge](https://www.codedex.io/community/monthly-challenge/fuyhn9sB6nFKfPKXSvtF/winners) — The Dataset Challenge**

> "This one is paced like a documentary. It starts you off learning about the Sun, builds tension section by section, and by the time you hit the part where Earth dodged a trillion-dollar disaster by 9 days, you're locked in. One of our reviewers said it got them emotional. If you know Valérie, you know she goes all out every time."
> — **The Codédex Team**

---

## Technical Architecture

### Data Engineering Pipeline
The project features a robust Python-based ETL pipeline designed for scientific data reliability.
*   **Multi-Source Integration**: Automated ingestion from SILSO (Sunspot numbers 1749–present), NASA DONKI (CMEs, Flares, Geomagnetic Storms), SunPy HEK flare catalogs, GFZ Potsdam (Kp/Ap indices), and WDC Kyoto (Dst index).
*   **Adaptive Rate Limiting**: Implemented a quarterly-chunked request strategy with exponential backoff and HTTP session persistence to manage NASA API rate limits and large scientific datasets (e.g., OMNI2 700MB datasets).
*   **Normalization & Cleansing**: Custom parsers for fixed-width scientific text formats and nested JSON hierarchies, ensuring high-fidelity data normalization for downstream analysis.

### Predictive Modeling
*   **Solar Cycle Forecasting**: Implemented a time-series forecasting model using Facebook's **Prophet** algorithm. The model accounts for the ~11-year solar periodicity and seasonal nuances to predict Solar Cycle 25 activity through 2030.
*   **Categorization Engines**: Developed automated logic to classify solar flares according to GOES classes (A, B, C, M, X) and geomagnetic storms via the NOAA G-Scale.

### Interactive Frontend & Visualization
A high-performance React application built for immersive data storytelling.
*   **Geospacial Simulation Engine**: D3.js powered orthographic projection of Earth with real-time daylight/night-light transitions and TopoJSON-based landmass rendering.
*   **Reactive Impact Logic**: Custom algorithms to simulate cascading infrastructure failure (blackouts) based on geomagnetic intensity gradients, affecting city-level light signatures.
*   **High-Fidelity Rendering**: Leveraged **Three.js** and **React Three Fiber** for 3D solar body visualizations and **Framer Motion** for physics-based UI transitions.
*   **Data Sonification**: Auditory data representation using **Tone.js**, providing an accessible, multi-sensory understanding of solar heartbeat frequencies.

---

## Technical Stack

*   **Languages**: Python, TypeScript
*   **Library Logic**: Pandas, NumPy, Facebook Prophet, SunPy
*   **Frontend**: React, Vite, D3.js, Three.js, React Three Fiber, Framer Motion, Tone.js
*   **APIs**: NASA DONKI, SILSO, NOAA SWPC, GFZ Potsdam

---

## Getting Started

### Data Pipeline Setup
1. Navigate to the `data` directory and install dependencies:
   ```bash
   cd data && pip install -r requirements.txt
   ```
2. Configure environmental variables in a `.env` file with your `NASA_API_KEY`.
3. Run the pipeline:
   ```bash
   python data_collection.py && python data_processing.py
   ```

### Frontend Application
1. Navigate to the `frontend` directory and install dependencies:
   ```bash
   cd frontend && npm install
   ```
2. Launch the development server:
   ```bash
   npm run dev
   ```

---

## Engineering Acknowledgments

Scientific data provided by:
*   **SILSO World Data Center** (Royal Observatory of Belgium)
*   **NASA CCMC / DONKI** (Community Coordinated Modeling Center)
*   **NOAA SWPC** (Space Weather Prediction Center)
*   **GFZ Potsdam** (German Research Centre for Geosciences)
*   **WDC Kyoto** (World Data Center for Geomagnetism)
