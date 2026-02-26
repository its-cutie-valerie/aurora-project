# The Sun's Temper: Aurora Project

A comprehensive data visualization platform for exploring the dynamic behavior of our Sun and its impact on Earth — from historical sunspot cycles to extreme geomagnetic storms.

## Project Overview

The **Aurora Project** (also known as *The Sun's Temper*, and many other names (thanks ADHD)) is a web application designed to aggregate, process, and visualize space weather data from multiple scientific sources. It provides an experience through interactive timelines, 3D models, and forecasting.

---

## Project Structure

The repository is organized into two main components:

### Data Pipeline (`/data`)
A pipeline that automates the collection and processing of solar data.
- **`data_collection.py`**: Downloads data from:
  - **SILSO**: Sunspot numbers (1749–present).
  - **NASA DONKI**: Coronal Mass Ejections (CMEs), Solar Flares, and Geomagnetic Storms.
  - **SunPy HEK**: Solar flare catalogs.
  - **GFZ Potsdam**: Kp/Ap geomagnetic indices.
  - **WDC Kyoto**: Dst index and OMNI solar wind datasets.
  - **NOAA SWPC**: Real-time flare feeds.
- **`data_processing.py`**: Cleans and aggregates raw data into processed CSVs for the frontend. Includes a **Prophet**-based forecasting model for Solar Cycle 25.

### Frontend Application (`/frontend`)
An immersive, interactive web application built with modern web technologies:
- **React + TypeScript + Vite**: Core framework.
- **Three.js & React Three Fiber**: For 3D visualizations.
- **D3.js & Framer Motion**: For data-driven charts and animations.
- **Tone.js**: For auditory data representation.

---

## Getting Started

### Data Pipeline Setup
1. Navigate to the `data` directory:
   ```bash
   cd data
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) Create a `.env` file with your `NASA_API_KEY` to avoid rate limits.
4. Run the collection script:
   ```bash
   python data_collection.py
   ```
5. Process the data for the frontend:
   ```bash
   python data_processing.py
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Key Features
- **Interactive Timelines**: Scroll through centuries of solar history.
- **Impact Simulation**: Visualize how solar events affect satellite orbits and power grids.
- **3D Solar System**: Interactive starfield and planetary views.
- **Cycle 25 Forecast**: View predicted sunspot activity through 2030.

---

## Acknowledgments
Special thanks to the [SILSO](https://www.sidc.be/silso/), [NASA CCMC](https://kanzelhohe.uni-graz.at/), [NOAA SWPC](https://www.swpc.noaa.gov/), and [GFZ Potsdam](https://www.gfz-potsdam.de/en/) for providing the open-source scientific data that makes this project possible.
