"""
magic.py — Space Weather Data Collection Pipeline
===================================================
Downloads historical space weather data from multiple scientific sources
and saves them as timestamped CSVs in data/raw/.

Sources:
  1. SILSO  — Monthly & predicted sunspot numbers (1749–present)
  2. DONKI  — CMEs, Flares, Geomagnetic Storms, SEPs (2010–present)
  3. SunPy  — HEK solar flare catalog with GOES classes (2000–present)
  4. GFZ    — Kp/Ap geomagnetic indices (1932–present)
  5. Kyoto  — Dst index (2000–present)
  6. NOAA   — SWPC flare event JSON feeds
  7. Templates for hand-compiled aurora & satellite anomaly data

Usage:
  python magic.py                        # full run, all defaults
  python magic.py --start-year 2020      # DONKI/SunPy from 2020 only
  python magic.py --skip sunpy kp dst    # skip slow sources
"""

import os
import sys
import argparse
import logging
import time
import ftplib
from io import StringIO, BytesIO
from datetime import datetime

import requests
import pandas as pd
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# SunPy imports (may be slow on first load)
try:
    from sunpy.net import Fido, attrs as a
    SUNPY_AVAILABLE = True
except ImportError:
    SUNPY_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("magic")

RAW = os.path.join("data", "raw")
os.makedirs(RAW, exist_ok=True)

NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
if NASA_API_KEY == "DEMO_KEY":
    log.warning("Using DEMO_KEY for NASA API — rate-limited to 30 req/hr. "
                "Set NASA_API_KEY in .env for 1000 req/hr.")

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _session() -> requests.Session:
    """Requests session with automatic retries on transient errors."""
    s = requests.Session()
    retry = Retry(total=5, backoff_factor=1.5,
                  status_forcelist=[429, 500, 502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.headers.update({"User-Agent": "magic.py/1.0 (space-weather-pipeline)"})
    return s


def save(df: pd.DataFrame, name: str) -> int:
    """Save dataframe to CSV; returns row count (0 if empty)."""
    if df is None or df.empty:
        log.warning(f"No data for {name}")
        return 0
    path = os.path.join(RAW, f"{name}_{TIMESTAMP}.csv")
    df.to_csv(path, index=False)
    log.info(f"{name}: {len(df):,} rows → {path}")
    return len(df)


# ═══════════════════════════════════════════════════════════════════════════
# 1. SILSO — Sunspot Data  (1749–present)
# ═══════════════════════════════════════════════════════════════════════════

def fetch_silso() -> int:
    """Monthly mean total sunspot number + predicted sunspot number."""
    log.info("SILSO Sunspot Data")
    total = 0

    # Monthly actuals
    try:
        url = "https://www.sidc.be/silso/DATA/SN_m_tot_V2.0.txt"
        df = pd.read_csv(
            url, sep=r"\s+", header=None,
            names=["year", "month", "year_frac", "ssn", "std", "n_obs", "definitive"],
        )
        total += save(df, "silso_monthly_sunspot")
    except Exception as e:
        log.error(f"SILSO monthly: {e}")

    # Daily actuals
    try:
        url = "https://www.sidc.be/silso/DATA/SN_d_tot_V2.0.txt"
        df = pd.read_csv(
            url, sep=r"\s+", header=None,
            names=["year", "month", "day", "year_frac", "ssn", "std", "n_obs", "definitive"],
        )
        total += save(df, "silso_daily_sunspot")
    except Exception as e:
        log.error(f"SILSO daily: {e}")

    # Predicted sunspot number (SILSO smoothed monthly — CSV format is cleaner)
    try:
        url = "https://www.sidc.be/SILSO/DATA/SN_ms_tot_V2.0.csv"
        df = pd.read_csv(
            url, sep=";", header=None, on_bad_lines="skip",
            names=["year", "month", "year_frac", "ssn", "std", "n_obs", "definitive"],
        )
        total += save(df, "silso_predicted_sunspot")
    except Exception as e:
        log.warning(f"SILSO predicted (non-critical): {e}")

    return total


# ═══════════════════════════════════════════════════════════════════════════
# 2. NASA DONKI — CME, Flares, GST, SEP  (2010–present)
# ═══════════════════════════════════════════════════════════════════════════

def _donki_endpoint(session, endpoint: str, name: str,
                    start_year: int, end_year: int) -> int:
    """Generic DONKI fetcher — queries in quarterly chunks."""
    base = f"https://api.nasa.gov/DONKI/{endpoint}"
    frames = []

    # Build quarterly date ranges
    quarters = []
    for yr in range(start_year, end_year + 1):
        for q_start, q_end in [("01-01", "03-31"), ("04-01", "06-30"),
                                ("07-01", "09-30"), ("10-01", "12-31")]:
            sd = f"{yr}-{q_start}"
            ed = f"{yr}-{q_end}"
            if yr == datetime.now().year:
                today = datetime.now().strftime("%Y-%m-%d")
                if sd > today:
                    break
                ed = min(ed, today)
            quarters.append((sd, ed))

    for sd, ed in quarters:
        log.info(f"{name} {sd} → {ed}")
        try:
            r = session.get(base, params={
                "startDate": sd, "endDate": ed, "api_key": NASA_API_KEY
            }, timeout=90)
            r.raise_for_status()
            data = r.json()
            if data:
                frames.append(pd.DataFrame(data))
            time.sleep(0.5)
        except Exception as e:
            log.warning(f"{name} {sd}–{ed}: {e}")

    if frames:
        return save(pd.concat(frames, ignore_index=True), f"nasa_donki_{name.lower()}")
    return 0


def fetch_donki(start_year: int, end_year: int) -> int:
    """All four DONKI endpoints: CME, FLR, GST, SEP.

    NOTE: DONKI /FLR overlaps with SunPy HEK flares. Both are kept for
    cross-validation, but pick one as primary during cleaning.
    """
    log.info("NASA DONKI API")
    s = _session()
    total = 0
    for ep, label in [("CME", "cme"), ("FLR", "flr"), ("GST", "gst"), ("SEP", "sep")]:
        total += _donki_endpoint(s, ep, label, start_year, end_year)
    return total


# ═══════════════════════════════════════════════════════════════════════════
# 3. SunPy HEK — Solar Flare Catalog  (2000–present)
# ═══════════════════════════════════════════════════════════════════════════

def fetch_sunpy_flares(start_year: int, end_year: int) -> int:
    """Query HEK for all flares via SunPy Fido, then filter M/X class in pandas.

    NOTE: String comparison on GOES class (e.g. "M1.0" > "X1.0" alphabetically)
    is unreliable in HEK filters. We fetch ALL flares and filter afterwards.
    """
    log.info("SunPy HEK Flare Catalog")
    if not SUNPY_AVAILABLE:
        log.error("sunpy not installed — skipping")
        return 0

    frames = []
    yr = start_year
    while yr <= end_year:
        chunk_end = min(yr + 4, end_year)
        sd = f"{yr}-01-01"
        ed = f"{chunk_end}-12-31"
        log.info(f"    Searching {sd} → {ed}")
        try:
            result = Fido.search(
                a.Time(sd, ed),
                a.hek.EventType("FL"),
            )
            if "hek" in result:
                tbl = result["hek"].to_table()
                df = tbl.to_pandas()
                # Filter to M and X class in pandas (reliable string logic)
                if "fl_goescls" in df.columns:
                    mask = df["fl_goescls"].str.startswith(("M", "X"), na=False)
                    df = df[mask]
                    log.info(f"      Filtered to {len(df)} M/X-class flares")
                frames.append(df)
        except Exception as e:
            log.warning(f"{sd}–{ed}: {e}")
        time.sleep(1)
        yr = chunk_end + 1

    if frames:
        return save(pd.concat(frames, ignore_index=True), "sunpy_hek_flares")
    return 0


# ═══════════════════════════════════════════════════════════════════════════
# 4. Kp Index — GFZ Potsdam  (1932–present)
# ═══════════════════════════════════════════════════════════════════════════

def fetch_kp() -> int:
    """Download Kp/Ap index from GFZ via HTTPS (primary) or FTP (fallback)."""
    log.info("GFZ Kp Index")

    # --- Try HTTPS first (kp.gfz-potsdam.de) ---
    https_url = "https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt"
    try:
        s = _session()
        r = s.get(https_url, timeout=60)
        r.raise_for_status()
        path = os.path.join(RAW, f"gfz_kp_index_{TIMESTAMP}.txt")
        with open(path, "w") as f:
            f.write(r.text)
        lines = r.text.strip().split("\n")
        log.info(f"gfz_kp_index: {len(lines):,} lines → {path}")
        return len(lines)
    except Exception as e:
        log.warning(f"HTTPS failed ({e}), trying FTP fallback…")

    # --- FTP fallback ---
    try:
        ftp = ftplib.FTP("ftp.gfz-potsdam.de", timeout=30)
        ftp.login()

        # Walk into /home/obs and find the kp-ap directory
        for candidate in [
            "/home/obs/kp-ap/wdc",
            "/home/obs/Kp_Ap_டindex",
            "/home/obs",
        ]:
            try:
                ftp.cwd(candidate)
                break
            except ftplib.error_perm:
                continue

        # Try to find the big combined file
        filenames = ftp.nlst()
        target = None
        for fn in filenames:
            if "Kp" in fn and "since" in fn:
                target = fn
                break
        if target is None:
            # Grab any .txt file in the directory
            for fn in filenames:
                if fn.endswith(".txt"):
                    target = fn
                    break

        if target:
            lines = []
            ftp.retrlines(f"RETR {target}", lines.append)
            ftp.quit()
            path = os.path.join(RAW, f"gfz_kp_index_{TIMESTAMP}.txt")
            with open(path, "w") as f:
                f.write("\n".join(lines))
            log.info(f"gfz_kp_index (FTP): {len(lines):,} lines → {path}")
            return len(lines)
        else:
            ftp.quit()
            log.error("No Kp file found on FTP")
    except Exception as e:
        log.error(f"FTP fallback failed: {e}")

    return 0


# ═══════════════════════════════════════════════════════════════════════════
# 5. Dst Index — WDC Kyoto  (2000–present, yearly files)
# ═══════════════════════════════════════════════════════════════════════════

def fetch_dst() -> int:
    """Download Dst + solar wind data from NASA OMNI2 hourly dataset.

    OMNI2 is a merged dataset containing Dst, Kp, solar wind speed,
    magnetic field strength, and proton density since 1963.
    WARNING: The full file is ~700MB. This may take several minutes.
    """
    log.info("NASA OMNI2 (Dst + solar wind)")
    s = _session()

    try:
        omni_url = "https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2_all_years.dat"
        log.info("Downloading OMNI2 (~700MB, please be patient)…")
        r = s.get(omni_url, timeout=300, stream=True)
        r.raise_for_status()

        path = os.path.join(RAW, f"nasa_omni2_hourly_{TIMESTAMP}.dat")
        size = 0
        with open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                size += len(chunk)

        nlines = sum(1 for line in open(path) if line.strip())
        log.info(f"nasa_omni2: {nlines:,} lines ({size / 1e6:.1f} MB) → {path}")
        log.info("OMNI2 is fixed-width with no headers. See:")
        log.info("https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2.text")
        return nlines
    except Exception as e:
        log.error(f"OMNI2 download failed: {e}")

    return 0


# ═══════════════════════════════════════════════════════════════════════════
# 6. NOAA SWPC — Flare events & recent data  (JSON feeds)
# ═══════════════════════════════════════════════════════════════════════════

def fetch_noaa_swpc() -> int:
    """Grab NOAA SWPC JSON feeds for recent flare/event data."""
    log.info("NOAA SWPC JSON Feeds")
    s = _session()
    total = 0

    feeds = {
        "noaa_xray_flares": "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json",
        "noaa_solar_regions": "https://services.swpc.noaa.gov/json/solar_regions.json",
        "noaa_geomag_storm": "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
    }

    for name, url in feeds.items():
        try:
            r = s.get(url, timeout=15)
            r.raise_for_status()
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                # Some NOAA feeds have a header row as first element
                if isinstance(data[0], list):
                    df = pd.DataFrame(data[1:], columns=data[0])
                else:
                    df = pd.DataFrame(data)
                total += save(df, name)
            else:
                log.warning(f"{name}: empty response")
        except Exception as e:
            log.warning(f"{name}: {e}")

    return total


# ═══════════════════════════════════════════════════════════════════════════
# 7. Template CSVs — Hand-compiled datasets
# ═══════════════════════════════════════════════════════════════════════════

def create_templates() -> int:
    """Create starter CSV templates for manually-compiled datasets."""
    log.info("Creating template CSVs for manual data")
    count = 0

    # Aurora events template
    aurora_path = os.path.join(RAW, "aurora_events_manual.csv")
    if not os.path.exists(aurora_path):
        pd.DataFrame({
            "date": ["2024-05-10", "2024-05-11", "2003-10-29", "1989-03-13"],
            "storm_name": ["May 2024 Storm", "May 2024 Storm", "Halloween Storm", "Quebec Blackout"],
            "min_latitude_visible": [25, 30, 35, 40],
            "kp_max": [9, 8, 9, 9],
            "dst_min_nT": [-412, -350, -383, -589],
            "source": ["SpaceWeatherLive", "SpaceWeatherLive", "NOAA", "NOAA"],
            "notes": [
                "Visible across continental US and Europe",
                "Second night of multi-day storm",
                "One of the largest storms of Solar Cycle 23",
                "Caused Quebec power grid collapse",
            ],
        }).to_csv(aurora_path, index=False)
        log.info(f"aurora_events_manual template → {aurora_path}")
        count += 1

    # Satellite anomalies template
    sat_path = os.path.join(RAW, "satellite_anomalies.csv")
    if not os.path.exists(sat_path):
        pd.DataFrame({
            "date": ["2003-10-28", "2003-10-29", "1989-03-13", "2000-07-14",
                      "2024-05-10", "2022-02-03"],
            "satellite": ["ADEOS-II (Midori-II)", "DRTS (Kodama)", "GOES-7",
                          "ASCA", "Multiple Starlink", "Starlink (40 sats)"],
            "anomaly_type": ["Total loss", "Damage", "Sensor anomaly",
                             "Total loss", "Orbit decay", "Re-entry"],
            "cause": ["Solar panel failure from radiation", "Solar array degradation",
                      "Sensor saturation", "Attitude control loss from particle storm",
                      "Atmospheric drag from geomagnetic heating",
                      "Atmospheric drag from geomagnetic storm"],
            "solar_event": ["Halloween Storm X17.2", "Halloween Storm X10",
                            "March 1989 X15", "Bastille Day X5.7",
                            "May 2024 Storm", "Geomagnetic storm"],
            "source": ["ESA/JAXA", "JAXA", "NOAA", "JAXA/NASA", "SpaceX", "SpaceX"],
        }).to_csv(sat_path, index=False)
        log.info(f"satellite_anomalies template → {sat_path}")
        count += 1

    return count


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Space Weather Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--start-year", type=int, default=2010,
                        help="Start year for DONKI & SunPy (default: 2010)")
    parser.add_argument("--end-year", type=int, default=datetime.now().year,
                        help="End year (default: current year)")
    parser.add_argument("--skip", nargs="*", default=[],
                        choices=["silso", "donki", "sunpy", "kp", "dst", "noaa", "templates"],
                        help="Skip specific data sources")
    args = parser.parse_args()

    log.info(f"Date range: {args.start_year}–{args.end_year}")
    log.info(f"Output dir: {os.path.abspath(RAW)}")
    log.info(f"NASA key:   {'custom' if NASA_API_KEY != 'DEMO_KEY' else 'DEMO_KEY'}")

    results = {}

    if "silso" not in args.skip:
        results["SILSO Sunspots"] = fetch_silso()

    if "donki" not in args.skip:
        results["NASA DONKI"] = fetch_donki(args.start_year, args.end_year)

    if "sunpy" not in args.skip:
        results["SunPy HEK Flares"] = fetch_sunpy_flares(args.start_year, args.end_year)

    if "kp" not in args.skip:
        results["GFZ Kp Index"] = fetch_kp()

    if "dst" not in args.skip:
        results["Dst / OMNI"] = fetch_dst()

    if "noaa" not in args.skip:
        results["NOAA SWPC"] = fetch_noaa_swpc()

    if "templates" not in args.skip:
        results["Templates"] = create_templates()

    # ── Summary ──
    log.info("")
    log.info("COLLECTION SUMMARY")

    grand_total = 0
    for source, count in results.items():
        status = "✓" if count > 0 else "✗"
        log.info(f"  {status}  {source:<25s} {count:>8,} rows/lines")
        grand_total += count
    log.info(f"{'─' * 60}")
    log.info(f"{'TOTAL':<25s} {grand_total:>8,}")


    # List output files
    log.info("")
    log.info("Files in data/raw/:")
    for fn in sorted(os.listdir(RAW)):
        size = os.path.getsize(os.path.join(RAW, fn))
        log.info(f"{fn}  ({size:,} bytes)")

    return 0 if grand_total > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
