"""
app/services/sustainability_score.py
─────────────────────────────────────
Composite sustainability score (0–100) per institution.

Algorithm:
    score = energy_score*0.30 + water_score*0.20 +
            waste_score*0.25  + carbon_score*0.25

Each sub-score is normalised against a baseline derived from
institution type (university/college benchmarks).
"""

from dataclasses import dataclass
from typing import Optional


# ── Baseline benchmarks per institution type ──────────────────────────────────
# (monthly figures for a medium-sized campus)

_BASELINES = {
    "university": {
        "energy_kwh":   65_000,
        "water_liters": 4_000_000,
        "waste_kg":     18_000,
        "carbon_kg":    30_000,
    },
    "college": {
        "energy_kwh":   30_000,
        "water_liters": 1_500_000,
        "waste_kg":     8_000,
        "carbon_kg":    12_000,
    },
    "institute": {
        "energy_kwh":   20_000,
        "water_liters": 800_000,
        "waste_kg":     5_000,
        "carbon_kg":    8_000,
    },
}

_WEIGHTS = {
    "energy": 0.30,
    "water":  0.20,
    "waste":  0.25,
    "carbon": 0.25,
}


@dataclass
class ScoreResult:
    energy_score:   float
    water_score:    float
    waste_score:    float
    carbon_score:   float
    composite:      float            # 0–100
    trend:          str              # "improved" | "declined" | "stable"
    score_delta:    float            # vs previous period
    sdg_7_score:    float
    sdg_11_score:   float
    sdg_12_score:   float
    sdg_13_score:   float


def _normalise(actual: float, baseline: float) -> float:
    """
    Convert an actual consumption value to a 0–100 score.
    Lower consumption → higher score.
    Clamped to [0, 100].
    """
    if baseline <= 0:
        return 50.0
    ratio = actual / baseline          # 1.0 = exactly at baseline → score 50
    raw   = 100 * (2 - ratio)          # linear: 0x → 100, 1x → 100-0=100 → recalibrate
    # More intuitive: score = 100 * max(0, 1 - (actual - target) / target)
    # where target is 80% of baseline (aspirational)
    target = baseline * 0.80
    score  = 100 * max(0.0, 1.0 - max(0.0, actual - target) / target)
    return round(min(100.0, max(0.0, score)), 2)


def calculate_score(
    energy_kwh:   float,
    water_liters: float,
    waste_kg:     float,
    carbon_kg:    float,
    institution_type: str = "university",
    prev_composite: Optional[float] = None,
) -> ScoreResult:
    """Compute composite sustainability score and SDG sub-scores."""

    baselines = _BASELINES.get(institution_type, _BASELINES["university"])

    e_score = _normalise(energy_kwh,   baselines["energy_kwh"])
    w_score = _normalise(water_liters, baselines["water_liters"])
    wt_score = _normalise(waste_kg,    baselines["waste_kg"])
    c_score = _normalise(carbon_kg,    baselines["carbon_kg"])

    composite = round(
        e_score  * _WEIGHTS["energy"] +
        w_score  * _WEIGHTS["water"]  +
        wt_score * _WEIGHTS["waste"]  +
        c_score  * _WEIGHTS["carbon"],
        2,
    )

    # Trend vs previous period
    delta = 0.0
    trend = "stable"
    if prev_composite is not None:
        delta = round(composite - prev_composite, 2)
        if delta >= 2.0:
            trend = "improved"
        elif delta <= -2.0:
            trend = "declined"

    return ScoreResult(
        energy_score  = e_score,
        water_score   = w_score,
        waste_score   = wt_score,
        carbon_score  = c_score,
        composite     = composite,
        trend         = trend,
        score_delta   = delta,
        # SDG mappings
        sdg_7_score   = e_score,                           # SDG 7: energy
        sdg_11_score  = round((e_score + w_score) / 2, 2), # SDG 11: urban (proxy)
        sdg_12_score  = wt_score,                          # SDG 12: consumption
        sdg_13_score  = c_score,                           # SDG 13: climate
    )
