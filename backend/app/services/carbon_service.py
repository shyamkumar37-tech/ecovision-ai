"""
app/services/carbon_service.py
───────────────────────────────
Carbon footprint calculation with IPCC / IEA emission factors.
Returns total CO₂e + per-category breakdown + AI recommendations.
"""

from dataclasses import dataclass, field
from typing import List

from app.ai.rag_pipeline import tag_sdgs


# ── Emission factors (kg CO₂e per unit) ──────────────────────────────────────
# Sources: IEA 2023, IPCC AR6, EPA

_EF_ELECTRICITY_KG_PER_KWH    = 0.82    # India grid average (CEA 2023)
_EF_WATER_KG_PER_1000L        = 0.149   # water treatment + pumping
_EF_TRANSPORT_KG_PER_KM       = 0.21    # average car (petrol)
_EF_PAPER_KG_PER_KG            = 1.84   # paper production lifecycle


@dataclass
class CarbonResult:
    electricity_co2:   float
    water_co2:         float
    transport_co2:     float
    paper_co2:         float
    total_carbon_kg:   float
    annual_projection: float
    potential_savings: float
    recommendations:   List[str] = field(default_factory=list)
    sdg_tags:          List[str] = field(default_factory=list)


_RECOMMENDATIONS = [
    "Switch to LED lighting and smart occupancy sensors — can cut electricity emissions by 30–40%. [SDG 7]",
    "Install rooftop solar panels; target 20–30% of campus electricity from on-site generation. [SDG 7]",
    "Implement rainwater harvesting to reduce treated water consumption by up to 25%. [SDG 11]",
    "Launch a green commute programme — subsidised bus passes and EV charging stations reduce transport CO₂ by 45%. [SDG 11]",
    "Mandate double-sided printing and digital-first workflows to eliminate paper waste. [SDG 12]",
    "Offset remaining emissions via verified reforestation credits (Gold Standard). [SDG 13]",
    "Set a Science-Based Target (SBT) aligned with 1.5 °C pathway — commit to net-zero by 2040. [SDG 13]",
]


def calculate_carbon(
    electricity_kwh: float,
    water_liters: float,
    transport_km: float,
    paper_kg: float,
) -> CarbonResult:
    e_co2  = round(electricity_kwh  * _EF_ELECTRICITY_KG_PER_KWH,  2)
    w_co2  = round((water_liters / 1000) * _EF_WATER_KG_PER_1000L, 2)
    t_co2  = round(transport_km     * _EF_TRANSPORT_KG_PER_KM,      2)
    p_co2  = round(paper_kg         * _EF_PAPER_KG_PER_KG,          2)

    total  = round(e_co2 + w_co2 + t_co2 + p_co2, 2)
    annual = round(total * 12, 2)

    # Potential savings if all recommendations followed (conservative 35%)
    savings = round(total * 0.35, 2)

    recs = [r for r in _RECOMMENDATIONS]
    tags = tag_sdgs(" ".join(recs))

    return CarbonResult(
        electricity_co2   = e_co2,
        water_co2         = w_co2,
        transport_co2     = t_co2,
        paper_co2         = p_co2,
        total_carbon_kg   = total,
        annual_projection = annual,
        potential_savings = savings,
        recommendations   = recs,
        sdg_tags          = tags,
    )
