"""
app/services/waste_service.py
──────────────────────────────
Waste classification, disposal guidance, and sustainability impact scoring.
SDG 12 aligned: Responsible Consumption and Production.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.ai.rag_pipeline import tag_sdgs


@dataclass
class WasteCategoryResult:
    category:            str
    weight_kg:           float
    percentage:          float
    disposal_method:     str
    recycling_potential: str      # "high" | "medium" | "low"


@dataclass
class WasteResult:
    total_waste_kg:          float
    categories:              List[WasteCategoryResult]
    ai_recommendations:      List[str]
    sustainability_impact:   float    # 0–100
    disposal_methods:        Dict[str, Any]
    sdg_tags:                List[str] = field(default_factory=list)


_DISPOSAL = {
    "plastic": {
        "method":   "Segregate by resin code (PET, HDPE, PVC). Hand over to CPCB-authorised recyclers.",
        "potential": "high",
        "rec":      "Replace single-use plastic with biodegradable alternatives; install reverse vending machines. [SDG 12]",
    },
    "paper": {
        "method":   "Collect dry paper separately; send to paper recycling mills. Avoid contamination with food.",
        "potential": "high",
        "rec":      "Implement paperless workflows; use double-sided printing to cut paper use by 50%. [SDG 12]",
    },
    "food": {
        "method":   "Compost organic matter on-site or via biogas digester for energy recovery.",
        "potential": "medium",
        "rec":      "Partner with food-sharing apps to redistribute surplus cafeteria food before composting. [SDG 12]",
    },
    "ewaste": {
        "method":   "NEVER landfill. Use CPCB/MoEFCC authorised e-waste handlers (Attero, E-Parisaraa).",
        "potential": "low",
        "rec":      "Extend device lifecycle via repair cafés; bulk-procure energy-star certified equipment. [SDG 12]",
    },
}


def analyze_waste(
    plastic_kg: float,
    paper_kg:   float,
    food_kg:    float,
    ewaste_kg:  float,
) -> WasteResult:
    total = plastic_kg + paper_kg + food_kg + ewaste_kg
    if total == 0:
        total = 1  # avoid division by zero

    raw = {"plastic": plastic_kg, "paper": paper_kg, "food": food_kg, "ewaste": ewaste_kg}

    categories = [
        WasteCategoryResult(
            category            = k,
            weight_kg           = v,
            percentage          = round((v / total) * 100, 1),
            disposal_method     = _DISPOSAL[k]["method"],
            recycling_potential = _DISPOSAL[k]["potential"],
        )
        for k, v in raw.items()
    ]

    recs = [_DISPOSAL[k]["rec"] for k in raw]
    tags = tag_sdgs(" ".join(recs))

    # Impact score: penalise e-waste heavily, reward low food waste
    ewaste_penalty = min(30, ewaste_kg * 2)
    food_penalty   = min(20, food_kg * 0.05)
    base           = 100 - ewaste_penalty - food_penalty
    impact_score   = round(max(0, min(100, base)), 2)

    disposal_map = {k: _DISPOSAL[k]["method"] for k in raw}

    return WasteResult(
        total_waste_kg        = round(total, 2),
        categories            = categories,
        ai_recommendations    = recs,
        sustainability_impact = impact_score,
        disposal_methods      = disposal_map,
        sdg_tags              = tags,
    )
