#!/usr/bin/env python3
"""
data_processing.py — Space Weather Data Cleaning & Aggregation
==============================================================
Processes raw data from data/raw/ into analysis-ready CSVs in data/processed/.

Pipeline
--------
1. Deduplicates raw files (keeps newest timestamp per file type)
2. Cleans each source:
   - SILSO sunspots → cycle labels (SC 1–25)
   - DONKI flares → GOES class parsing (A/B/C/M/X) + magnitude
   - DONKI CME → speed extraction from nested JSON
   - DONKI GST → max Kp per storm
   - GFZ Kp → 8 three-hourly Kp values per day → daily max + G-scale
   - OMNI2 → official 55-column parse → daily Dst/Kp/F10.7
3. Builds master_solar.csv (monthly aggregation, 1749–present)
4. Builds events_annotations.csv (named historical events)
5. Builds forecast_cycle25.csv (Prophet or cycle-average baseline)

Outputs → data/processed/
"""

import os
import re
import ast
import glob
import logging
import warnings
import pandas as pd
import numpy as np
from datetime import datetime
from io import StringIO

warnings.filterwarnings("ignore", category=FutureWarning)

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("process")

RAW = os.path.join("data", "raw")
OUT = os.path.join("data", "processed")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# Solar cycle boundaries (approximate start year of each cycle)
# Source: NOAA/SILSO consensus dates
# ---------------------------------------------------------------------------
SOLAR_CYCLES = [
    (1,  1755.2), (2,  1766.5), (3,  1775.5), (4,  1784.7), (5,  1798.3),
    (6,  1810.6), (7,  1823.3), (8,  1833.9), (9,  1843.5), (10, 1855.9),
    (11, 1867.2), (12, 1878.9), (13, 1890.3), (14, 1902.0), (15, 1913.6),
    (16, 1923.6), (17, 1933.8), (18, 1944.2), (19, 1954.3), (20, 1964.9),
    (21, 1976.5), (22, 1986.8), (23, 1996.4), (24, 2008.9), (25, 2019.9),
]

def _assign_cycle(year_frac: float) -> int:
    """Return solar cycle number for a fractional year."""
    for i in range(len(SOLAR_CYCLES) - 1, -1, -1):
        if year_frac >= SOLAR_CYCLES[i][1]:
            return SOLAR_CYCLES[i][0]
    return 0  # before cycle 1

# ---------------------------------------------------------------------------
# Kp → G-scale classification (NOAA)
# ---------------------------------------------------------------------------
def kp_to_gscale(kp: float) -> str:
    """Convert Kp (0-9) to NOAA G-scale storm level."""
    if kp < 5:   return "G0"   # Below storm threshold
    elif kp < 6: return "G1"   # Minor
    elif kp < 7: return "G2"   # Moderate
    elif kp < 8: return "G3"   # Strong
    elif kp < 9: return "G4"   # Severe
    else:        return "G5"   # Extreme

# ---------------------------------------------------------------------------
# GOES flare class parsing
# ---------------------------------------------------------------------------
def parse_goes_class(cls_str: str) -> dict:
    """Parse 'X5.4' → {'class_letter':'X', 'class_magnitude':5.4, 'class_numeric': 5.4e-4}"""
    if not isinstance(cls_str, str) or len(cls_str) < 2:
        return {"class_letter": None, "class_magnitude": None, "class_numeric": None}
    letter = cls_str[0].upper()
    try:
        mag = float(cls_str[1:])
    except ValueError:
        mag = None
    # GOES scale: A=1e-8, B=1e-7, C=1e-6, M=1e-5, X=1e-4  (W/m²)
    scale = {"A": 1e-8, "B": 1e-7, "C": 1e-6, "M": 1e-5, "X": 1e-4}
    numeric = mag * scale.get(letter, 0) if mag else None
    return {"class_letter": letter, "class_magnitude": mag, "class_numeric": numeric}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def latest(pattern: str, ext: str = "csv") -> str | None:
    """Get the newest file matching `{pattern}*` in data/raw/."""
    files = sorted(glob.glob(os.path.join(RAW, f"{pattern}*.{ext}")))
    if not files:
        # Try without extension restriction
        files = sorted(glob.glob(os.path.join(RAW, f"{pattern}*")))
    if not files:
        log.warning(f"  ⚠  No files for '{pattern}'")
        return None
    chosen = files[-1]
    log.info(f"  📄 {os.path.basename(chosen)}")
    return chosen


def _shape(df, name):
    """Print shape and date range summary."""
    if df.empty:
        print(f"  {name}: EMPTY")
        return
    date_col = None
    for c in ["date", "ds"]:
        if c in df.columns:
            date_col = c
            break
    if date_col is None and isinstance(df.index, pd.DatetimeIndex):
        print(f"  {name}: {df.shape}  |  {df.index.min().date()} → {df.index.max().date()}")
    elif date_col:
        dates = pd.to_datetime(df[date_col])
        print(f"  {name}: {df.shape}  |  {dates.min().date()} → {dates.max().date()}")
    else:
        print(f"  {name}: {df.shape}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. SILSO — Sunspot numbers + cycle labels
# ═══════════════════════════════════════════════════════════════════════════

def process_silso() -> pd.DataFrame:
    """Load SILSO monthly, add cycle labels."""
    f = latest("silso_monthly_sunspot")
    if not f:
        return pd.DataFrame()

    df = pd.read_csv(f)
    df["date"] = pd.to_datetime(df[["year", "month"]].assign(day=1))
    df["year_frac"] = df["year"] + (df["month"] - 0.5) / 12
    df["solar_cycle"] = df["year_frac"].apply(_assign_cycle)

    # Keep useful columns
    out = df[["date", "year", "month", "ssn", "std", "n_obs", "solar_cycle"]].copy()
    out.rename(columns={"ssn": "sunspot_number"}, inplace=True)
    _shape(out, "SILSO sunspots")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 2. DONKI Flares — classification
# ═══════════════════════════════════════════════════════════════════════════

def process_donki_flares() -> pd.DataFrame:
    """Clean DONKI FLR data; parse GOES class."""
    f = latest("nasa_donki_flr")
    if not f:
        return pd.DataFrame()

    df = pd.read_csv(f, low_memory=False)
    if "classType" not in df.columns or "peakTime" not in df.columns:
        log.warning("  ⚠  DONKI FLR missing expected columns")
        return pd.DataFrame()

    df["date"] = pd.to_datetime(df["peakTime"], utc=True, errors="coerce")
    df = df.dropna(subset=["date"])

    # Parse GOES class
    parsed = df["classType"].apply(parse_goes_class).apply(pd.Series)
    df = pd.concat([df, parsed], axis=1)

    keep = ["date", "flrID", "classType", "class_letter", "class_magnitude",
            "class_numeric", "sourceLocation", "activeRegionNum"]
    out = df[[c for c in keep if c in df.columns]].copy()
    _shape(out, "DONKI flares")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 3. DONKI CME — speed extraction
# ═══════════════════════════════════════════════════════════════════════════

def process_donki_cme() -> pd.DataFrame:
    """Extract CME speeds from nested cmeAnalyses JSON."""
    f = latest("nasa_donki_cme")
    if not f:
        return pd.DataFrame()

    df = pd.read_csv(f, low_memory=False)
    if "startTime" not in df.columns:
        return pd.DataFrame()

    df["date"] = pd.to_datetime(df["startTime"], utc=True, errors="coerce")
    df = df.dropna(subset=["date"])

    # Extract speed from cmeAnalyses (stored as string repr of list of dicts)
    speeds = []
    for raw in df["cmeAnalyses"]:
        speed = np.nan
        if isinstance(raw, str) and raw.startswith("["):
            try:
                analyses = ast.literal_eval(raw)
                # Take the "most accurate" analysis, or first
                for a in analyses:
                    if isinstance(a, dict):
                        if a.get("isMostAccurate"):
                            speed = a.get("speed", np.nan)
                            break
                if np.isnan(speed) and analyses:
                    speed = analyses[0].get("speed", np.nan) if isinstance(analyses[0], dict) else np.nan
            except (ValueError, SyntaxError):
                pass
        speeds.append(speed)

    df["speed_km_s"] = speeds

    keep = ["date", "activityID", "speed_km_s", "sourceLocation", "activeRegionNum"]
    out = df[[c for c in keep if c in df.columns]].copy()
    _shape(out, "DONKI CMEs")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 4. DONKI GST — Storm event grouping + max Kp
# ═══════════════════════════════════════════════════════════════════════════

def process_donki_gst() -> pd.DataFrame:
    """Extract max Kp from each geomagnetic storm event."""
    f = latest("nasa_donki_gst")
    if not f:
        return pd.DataFrame()

    df = pd.read_csv(f, low_memory=False)
    if "startTime" not in df.columns or "allKpIndex" not in df.columns:
        return pd.DataFrame()

    df["date"] = pd.to_datetime(df["startTime"], utc=True, errors="coerce")
    df = df.dropna(subset=["date"])

    # Parse allKpIndex (string repr of list of dicts)
    max_kps = []
    for raw in df["allKpIndex"]:
        kp_max = np.nan
        if isinstance(raw, str) and raw.startswith("["):
            try:
                entries = ast.literal_eval(raw)
                kps = [e["kpIndex"] for e in entries if isinstance(e, dict) and "kpIndex" in e]
                if kps:
                    kp_max = max(kps)
            except (ValueError, SyntaxError):
                pass
        max_kps.append(kp_max)

    df["kp_max"] = max_kps
    df["g_scale"] = df["kp_max"].apply(lambda x: kp_to_gscale(x) if pd.notna(x) else None)

    keep = ["date", "gstID", "kp_max", "g_scale"]
    out = df[[c for c in keep if c in df.columns]].copy()
    _shape(out, "DONKI storms")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 5. GFZ Kp — fixed-width text file
# ═══════════════════════════════════════════════════════════════════════════

def process_gfz_kp() -> pd.DataFrame:
    """Parse Kp_ap_Ap_SN_F107_since_1932.txt into daily rows."""
    f = latest("gfz_kp_index", ext="txt")
    if not f:
        return pd.DataFrame()

    # Read skipping comment lines
    with open(f) as fh:
        lines = [l for l in fh if not l.startswith("#") and l.strip()]

    if not lines:
        return pd.DataFrame()

    # GFZ format (after #-comments):
    # Year Mo Dy  days days_m Bsr dB  Kp1 Kp2 Kp3 Kp4 Kp5 Kp6 Kp7 Kp8
    #  ap1 ap2 ap3 ap4 ap5 ap6 ap7 ap8  Ap  SN F10.7obs F10.7adj  D
    col_names = [
        "year", "month", "day", "days", "days_m", "bartels_rot", "bartels_day",
        "Kp1", "Kp2", "Kp3", "Kp4", "Kp5", "Kp6", "Kp7", "Kp8",
        "ap1", "ap2", "ap3", "ap4", "ap5", "ap6", "ap7", "ap8",
        "Ap", "SN", "F10_7obs", "F10_7adj", "D",
    ]

    df = pd.read_csv(StringIO("".join(lines)), sep=r"\s+", header=None,
                     names=col_names, on_bad_lines="skip")

    # Create date
    df["date"] = pd.to_datetime(df[["year", "month", "day"]], errors="coerce")
    df = df.dropna(subset=["date"])

    # Kp columns: 8 three-hourly values per day. Replace fill value -1 with NaN.
    kp_cols = [f"Kp{i}" for i in range(1, 9)]
    for c in kp_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
        df.loc[df[c] < 0, c] = np.nan

    df["kp_daily_max"] = df[kp_cols].max(axis=1)
    df["kp_daily_mean"] = df[kp_cols].mean(axis=1)
    df["g_scale"] = df["kp_daily_max"].apply(lambda x: kp_to_gscale(x) if pd.notna(x) else None)

    # Ap (daily planetary index)
    df["Ap"] = pd.to_numeric(df["Ap"], errors="coerce")
    df.loc[df["Ap"] < 0, "Ap"] = np.nan

    # Sunspot number from GFZ
    df["SN"] = pd.to_numeric(df["SN"], errors="coerce")
    df.loc[df["SN"] < 0, "SN"] = np.nan

    # F10.7
    df["F10_7obs"] = pd.to_numeric(df["F10_7obs"], errors="coerce")
    df.loc[df["F10_7obs"] < 0, "F10_7obs"] = np.nan

    keep = ["date", "kp_daily_max", "kp_daily_mean", "g_scale", "Ap", "SN", "F10_7obs"]
    out = df[keep].copy()
    _shape(out, "GFZ Kp index")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 6. OMNI2 — hourly data (official 55-column format)
# ═══════════════════════════════════════════════════════════════════════════

# Column spec from https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/omni2.text
OMNI2_COLS = [
    "year", "doy", "hour",                                 # 1-3
    "bartels_rot",                                          # 4
    "imf_sc_id", "sw_sc_id",                                # 5-6
    "n_imf_pts", "n_plasma_pts",                            # 7-8
    "B_avg", "B_mag_avg",                                   # 9-10
    "B_lat_avg", "B_lon_avg",                               # 11-12
    "Bx_gse", "By_gse", "Bz_gse", "By_gsm", "Bz_gsm",     # 13-17
    "sigma_B_mag", "sigma_B", "sigma_Bx", "sigma_By", "sigma_Bz",  # 18-22
    "proton_temp", "proton_density",                        # 23-24
    "flow_speed", "flow_lon", "flow_lat",                   # 25-27
    "na_np_ratio", "flow_pressure",                         # 28-29
    "sigma_T", "sigma_N", "sigma_V", "sigma_phi_V", "sigma_theta_V", "sigma_NaNp",  # 30-35
    "e_field", "plasma_beta", "alfven_mach",                # 36-38
    "Kp", "R_sunspot", "Dst", "AE",                         # 39-42
    "proton_flux_1MeV", "proton_flux_2MeV", "proton_flux_4MeV",  # 43-45
    "proton_flux_10MeV", "proton_flux_30MeV", "proton_flux_60MeV",  # 46-48
    "flag", "ap", "f10_7", "PC_N", "AL", "AU", "mach_magnetosonic",  # 49-55
]

# Fill values for key columns (others use 9's pattern)
OMNI2_FILLS = {
    "Kp": 99, "R_sunspot": 999, "Dst": 99999, "AE": 9999,
    "f10_7": 999.9, "ap": 999, "flow_speed": 9999.0, "proton_density": 999.9,
    "Bz_gsm": 999.9, "B_avg": 999.9, "proton_temp": 9999999.0,
    "flow_pressure": 99.99, "PC_N": 999.9, "AL": 99999, "AU": 99999,
}


def process_omni2() -> pd.DataFrame:
    """Parse OMNI2 hourly data → daily aggregation of key parameters."""
    f = latest("nasa_omni2_hourly", ext="dat")
    if not f:
        return pd.DataFrame()

    log.info("Parsing OMNI2 (this takes ~1-2 min for ~200MB)...")
    try:
        df = pd.read_csv(
            f, sep=r"\s+", header=None, names=OMNI2_COLS,
            dtype="float64", na_values=None,
        )
    except Exception as e:
        log.error(f"OMNI2 parse failed: {e}")
        return pd.DataFrame()

    # Replace fill values with NaN
    for col, fill in OMNI2_FILLS.items():
        if col in df.columns:
            df.loc[df[col] >= fill, col] = np.nan

    # Kp: stored as e.g. 33 meaning 3+, 40 meaning 4o, 57 meaning 6-
    # Convert to standard 0-9 scale: Kp_value = Kp_encoded / 10
    df["Kp"] = df["Kp"] / 10.0

    # Date from year + day-of-year
    df["date"] = pd.to_datetime(
        df["year"].astype(int).astype(str) + df["doy"].astype(int).astype(str).str.zfill(3),
        format="%Y%j", errors="coerce"
    )
    df = df.dropna(subset=["date"])

    # Daily aggregation (key parameters only)
    daily = df.groupby("date").agg(
        Dst_min=("Dst", "min"),
        Kp_max=("Kp", "max"),
        Kp_mean=("Kp", "mean"),
        f10_7=("f10_7", "mean"),
        flow_speed_mean=("flow_speed", "mean"),
        proton_density_mean=("proton_density", "mean"),
        Bz_gsm_min=("Bz_gsm", "min"),
        R_sunspot=("R_sunspot", "mean"),
        ap_max=("ap", "max"),
    )

    daily["g_scale"] = daily["Kp_max"].apply(lambda x: kp_to_gscale(x) if pd.notna(x) else None)

    _shape(daily, "OMNI2 daily")
    return daily


# ═══════════════════════════════════════════════════════════════════════════
# 7. Master monthly aggregation
# ═══════════════════════════════════════════════════════════════════════════

def build_master(silso, flares, cmes, gst, gfz, omni) -> pd.DataFrame:
    """Merge all sources into one monthly master dataset."""
    frames = []

    # A — SILSO sunspots (already monthly)
    if not silso.empty:
        s = silso.set_index("date")[["sunspot_number", "solar_cycle"]]
        frames.append(s)

    # B — Flares: count by class per month
    if not flares.empty:
        fl = flares.copy()
        fl["month"] = fl["date"].dt.to_period("M").dt.to_timestamp()
        for letter in ["X", "M", "C", "B", "A"]:
            mask = fl["class_letter"] == letter
            counts = fl[mask].groupby("month").size().rename(f"flares_{letter}")
            frames.append(counts)
        # Total flares
        frames.append(fl.groupby("month").size().rename("flares_total"))

    # C — CMEs: count + mean speed per month
    if not cmes.empty:
        cm = cmes.copy()
        cm["month"] = cm["date"].dt.to_period("M").dt.to_timestamp()
        frames.append(cm.groupby("month").size().rename("cme_count"))
        frames.append(cm.groupby("month")["speed_km_s"].mean().rename("cme_speed_mean"))

    # D — GST: count of storm events per month + max Kp
    if not gst.empty:
        gt = gst.copy()
        gt["month"] = gt["date"].dt.to_period("M").dt.to_timestamp()
        frames.append(gt.groupby("month").size().rename("gst_count"))
        frames.append(gt.groupby("month")["kp_max"].max().rename("gst_kp_max"))

    # E — GFZ daily → monthly
    if not gfz.empty:
        gfz_m = gfz.set_index("date").resample("MS").agg({
            "kp_daily_max": "max",
            "kp_daily_mean": "mean",
            "Ap": "mean",
            "F10_7obs": "mean",
        }).rename(columns={
            "kp_daily_max": "kp_max_gfz",
            "kp_daily_mean": "kp_mean_gfz",
            "Ap": "ap_mean_gfz",
            "F10_7obs": "f10_7_gfz",
        })
        frames.append(gfz_m)

    # F — OMNI2 daily → monthly
    if not omni.empty:
        omni_m = omni.resample("MS").agg({
            "Dst_min": "min",
            "Kp_max": "max",
            "Kp_mean": "mean",
            "f10_7": "mean",
            "flow_speed_mean": "mean",
            "Bz_gsm_min": "min",
            "R_sunspot": "mean",
        }).rename(columns={
            "Dst_min": "dst_min",
            "Kp_max": "kp_max_omni",
            "Kp_mean": "kp_mean_omni",
            "f10_7": "f10_7_omni",
            "flow_speed_mean": "sw_speed_mean",
            "Bz_gsm_min": "bz_min",
            "R_sunspot": "sunspot_omni",
        })
        frames.append(omni_m)

    if not frames:
        return pd.DataFrame()

    master = pd.concat(frames, axis=1).sort_index()
    master.index.name = "date"

    # Storm day count per month (Kp >= 5)
    if not omni.empty and "Kp_max" in omni.columns:
        storm_days = omni[omni["Kp_max"] >= 5].resample("MS").size().rename("storm_days")
        master = master.join(storm_days, how="left")
        master["storm_days"] = master["storm_days"].fillna(0).astype(int)

    _shape(master, "Master solar (monthly)")
    return master


# ═══════════════════════════════════════════════════════════════════════════
# 8. Events annotations
# ═══════════════════════════════════════════════════════════════════════════

def build_events(flares, cmes, gst, omni) -> pd.DataFrame:
    """Create a unified event list for visualization annotations."""
    events = []

    # A — Major X-class flares (≥ X2.0)
    if not flares.empty and "class_letter" in flares.columns:
        xf = flares[flares["class_letter"] == "X"].copy()
        if "class_magnitude" in xf.columns:
            xf = xf[xf["class_magnitude"] >= 2.0]
        for _, r in xf.iterrows():
            events.append({
                "date": r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])[:10],
                "type": "X-class Flare",
                "magnitude": r.get("classType", ""),
                "source": "DONKI",
                "notes": f"AR {r.get('activeRegionNum', '?')}",
            })

    # B — Fast CMEs (≥ 1500 km/s)
    if not cmes.empty and "speed_km_s" in cmes.columns:
        fast = cmes[cmes["speed_km_s"] >= 1500].copy()
        for _, r in fast.iterrows():
            events.append({
                "date": r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])[:10],
                "type": "Fast CME",
                "magnitude": f"{r['speed_km_s']:.0f} km/s",
                "source": "DONKI",
                "notes": f"AR {r.get('activeRegionNum', '?')}",
            })

    # C — G4/G5 storms from DONKI GST
    if not gst.empty and "kp_max" in gst.columns:
        severe = gst[gst["kp_max"] >= 8].copy()
        for _, r in severe.iterrows():
            events.append({
                "date": r["date"].strftime("%Y-%m-%d") if hasattr(r["date"], "strftime") else str(r["date"])[:10],
                "type": "Geomagnetic Storm",
                "magnitude": f"Kp {r['kp_max']:.0f} ({r.get('g_scale', '')})",
                "source": "DONKI",
                "notes": r.get("gstID", ""),
            })

    # D — Extreme Dst events from OMNI2 (≤ −200 nT)
    if not omni.empty and "Dst_min" in omni.columns:
        extreme = omni[omni["Dst_min"] <= -200].copy()
        for date, r in extreme.iterrows():
            events.append({
                "date": date.strftime("%Y-%m-%d"),
                "type": "Extreme Dst",
                "magnitude": f"Dst {r['Dst_min']:.0f} nT",
                "source": "OMNI2",
                "notes": "",
            })

    # E — Manual aurora events
    f_aurora = latest("aurora_events_manual")
    if f_aurora:
        manual = pd.read_csv(f_aurora)
        for _, r in manual.iterrows():
            events.append({
                "date": r["date"],
                "type": "Named Aurora Storm",
                "magnitude": f"Kp {r.get('kp_max', '?')}, Dst {r.get('dst_min_nT', '?')} nT",
                "source": r.get("source", "Manual"),
                "notes": r.get("storm_name", ""),
            })

    # F — Satellite anomalies
    f_sat = latest("satellite_anomalies")
    if f_sat:
        sats = pd.read_csv(f_sat)
        for _, r in sats.iterrows():
            events.append({
                "date": r["date"],
                "type": "Satellite Anomaly",
                "magnitude": r.get("anomaly_type", ""),
                "source": r.get("source", "Manual"),
                "notes": f"{r.get('satellite', '')} — {r.get('cause', '')}",
            })

    df = pd.DataFrame(events)
    if not df.empty:
        df = df.drop_duplicates(subset=["date", "type", "magnitude"])
        df = df.sort_values("date").reset_index(drop=True)
    _shape(df, "Events annotations")
    return df


# ═══════════════════════════════════════════════════════════════════════════
# 9. Forecast
# ═══════════════════════════════════════════════════════════════════════════

def build_forecast(master: pd.DataFrame) -> pd.DataFrame:
    """Forecast sunspot numbers for Solar Cycle 25 (~through 2030)."""
    if master.empty or "sunspot_number" not in master.columns:
        log.warning("  ⚠  No sunspot data for forecasting")
        return pd.DataFrame()

    ts = master[["sunspot_number"]].dropna().copy()
    ts = ts.reset_index().rename(columns={"date": "ds", "sunspot_number": "y"})

    if PROPHET_AVAILABLE and len(ts) > 24:
        log.info("Forecasting with Prophet...")
        m = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.01,  # smooth for solar cycles
        )
        # Add ~11-year seasonality for solar cycles
        m.add_seasonality(name="solar_cycle", period=365.25 * 11, fourier_order=5)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            m.fit(ts)

        future = m.make_future_dataframe(periods=60, freq="MS")  # 5 years out
        fc = m.predict(future)
        # Clip to non-negative
        fc["yhat"] = fc["yhat"].clip(lower=0)
        fc["yhat_lower"] = fc["yhat_lower"].clip(lower=0)
        out = fc[["ds", "yhat", "yhat_lower", "yhat_upper"]].rename(
            columns={"ds": "date", "yhat": "ssn_forecast",
                      "yhat_lower": "ssn_lower", "yhat_upper": "ssn_upper"}
        )
        _shape(out, "Prophet forecast")
        return out

    # Fallback: cycle-average baseline
    log.info("Using cycle-average fallback for forecast...")
    # Average previous cycles aligned by phase
    cycle_len = 132  # ~11 years in months
    recent = ts.tail(cycle_len * 3)  # last 3 cycles
    if len(recent) < cycle_len:
        return pd.DataFrame()

    # Simple repeat of last cycle's shape
    last_cycle = ts.tail(cycle_len)["y"].values
    future_dates = pd.date_range(ts["ds"].max(), periods=61, freq="MS")[1:]
    forecast_vals = np.tile(last_cycle, 2)[:60]

    out = pd.DataFrame({
        "date": future_dates,
        "ssn_forecast": forecast_vals,
        "ssn_lower": forecast_vals * 0.7,
        "ssn_upper": forecast_vals * 1.3,
    })
    _shape(out, "Cycle-average forecast")
    return out


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    # ── Parse each source ──
    print("\nLoading & cleaning sources...\n")

    silso = process_silso()
    flares = process_donki_flares()
    cmes = process_donki_cme()
    gst = process_donki_gst()
    gfz = process_gfz_kp()
    omni = process_omni2()

    # ── Master monthly ──
    print("\nBuilding master monthly dataset...\n")
    master = build_master(silso, flares, cmes, gst, gfz, omni)

    if master.empty:
        log.error("  ✗  Master is empty — check raw files!")
        return 1

    master_path = os.path.join(OUT, "master_solar.csv")
    master.to_csv(master_path)
    log.info(f"  ✓  {master_path}  ({len(master):,} rows)")

    # ── Events ──
    print("\nBuilding events annotations...\n")
    events = build_events(flares, cmes, gst, omni)
    if not events.empty:
        ev_path = os.path.join(OUT, "events_annotations.csv")
        events.to_csv(ev_path, index=False)
        log.info(f"  ✓  {ev_path}  ({len(events):,} events)")

    # ── Forecast ──
    print("\nBuilding Cycle 25 forecast...\n")
    forecast = build_forecast(master)
    if not forecast.empty:
        fc_path = os.path.join(OUT, "forecast_cycle25.csv")
        forecast.to_csv(fc_path, index=False)
        log.info(f"  ✓  {fc_path}  ({len(forecast):,} rows)")

    # ── Summary ──
    print("Output files in data/processed/:")
    for fn in sorted(os.listdir(OUT)):
        size = os.path.getsize(os.path.join(OUT, fn))
        print(f"      {fn}  ({size:,} bytes)")
    print("═" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
