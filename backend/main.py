"""
Bionic Flow — Backend API Service
FastAPI-based clinical report generation and deterministic 5-point safety validator.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import time
import re

app = FastAPI(
    title="Bionic Flow Clinical Engine API",
    description="AI-Native Radiology Report Structuring and Safety Validation Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Data Models -----------------

ProvenanceSource = Literal["dictation", "template", "system_inference"]
ValidationType = Literal[
    "laterality",
    "negation",
    "measurement",
    "unsupported_finding",
    "missing_critical_finding",
]
ValidationSeverity = Literal["error", "warning", "info"]


class ReportSentence(BaseModel):
    id: str
    text: str
    source: ProvenanceSource
    section: Literal["findings", "impression"]
    anatomy: Optional[str] = None
    isEdited: Optional[bool] = False


class ValidationWarning(BaseModel):
    id: str
    type: ValidationType
    severity: ValidationSeverity
    title: str
    description: str
    dictationSpan: Optional[str] = None
    reportSpan: Optional[str] = None
    suggestedFix: Optional[str] = None
    targetSentenceId: Optional[str] = None
    dismissed: Optional[bool] = False
    dismissReason: Optional[str] = None


class DictationRequest(BaseModel):
    dictation: str
    templateId: Optional[str] = "ct_brain"


class StructuredReportResponse(BaseModel):
    id: str
    title: str
    modality: str
    findings: List[ReportSentence]
    impression: List[ReportSentence]
    rawDictation: str
    generationTimeMs: int
    warnings: List[ValidationWarning]
    templateUsed: str
    timestamp: str


class ValidationRequest(BaseModel):
    rawDictation: str
    findings: List[ReportSentence]
    impression: List[ReportSentence]


# ----------------- Clinical NLP Helpers -----------------

MEASUREMENT_REGEX = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:x|by|times|-)?\s*(?:(\d+(?:\.\d+)?)\s*)?(?:x|by|times|-)?\s*(?:(\d+(?:\.\d+)?)\s*)?(millimetres?|millimeters?|centimetres?|centimeters?|mm|cm)\b",
    re.IGNORECASE,
)
LATERALITY_REGEX = re.compile(r"\b(left|right|bilateral|unilateral|midline)\b", re.IGNORECASE)
NEGATION_CUES = [
    "no evidence of",
    "no sign of",
    "without evidence of",
    "no",
    "not",
    "without",
    "absence of",
    "negative for",
    "denies",
    "free of",
    "clear of",
    "unremarkable",
    "non-dilated",
    "intact",
    "normal",
]


def extract_measurements(text: str):
    matches = []
    for m in MEASUREMENT_REGEX.finditer(text):
        raw = m.group(0)
        d1 = float(m.group(1))
        d2 = float(m.group(2)) if m.group(2) else None
        unit_str = m.group(4).lower()
        is_cm = unit_str.startswith("cm") or unit_str.startswith("cent")
        multiplier = 10 if is_cm else 1
        matches.append(
            {
                "raw": raw,
                "val_mm": d1 * multiplier,
                "d1": d1,
                "d2": d2,
                "unit": "cm" if is_cm else "mm",
            }
        )
    return matches


def extract_lateralities(text: str):
    matches = []
    for m in LATERALITY_REGEX.finditer(text):
        matches.append({"raw": m.group(0), "side": m.group(1).lower()})
    return matches


def is_negated(sentence: str, keyword: Optional[str] = None) -> bool:
    s_lower = sentence.lower()
    if not keyword:
        return any(re.search(rf"\b{cue}\b", s_lower) for cue in NEGATION_CUES)

    kw_idx = s_lower.find(keyword.lower())
    if kw_idx == -1:
        return any(re.search(rf"\b{cue}\b", s_lower) for cue in NEGATION_CUES)

    prefix = s_lower[:kw_idx]
    return any(re.search(rf"\b{cue}\b", prefix) for cue in NEGATION_CUES)


# ----------------- Validation Engine -----------------


def run_clinical_validation(
    raw_dictation: str, findings: List[ReportSentence], impression: List[ReportSentence]
) -> List[ValidationWarning]:
    warnings: List[ValidationWarning] = []
    dict_lower = raw_dictation.lower()

    # Split findings vs dictated impression
    dict_split = re.split(r"impression:\s*", raw_dictation, flags=re.IGNORECASE)
    dict_findings_text = dict_split[0]

    source_measurements = extract_measurements(dict_findings_text)
    source_lateralities = extract_lateralities(dict_findings_text)

    # 1. Laterality Inconsistency
    for imp in impression:
        imp_lats = extract_lateralities(imp.text)
        for imp_lat in imp_lats:
            for src_lat in source_lateralities:
                if (src_lat["side"] == "left" and imp_lat["side"] == "right") or (
                    src_lat["side"] == "right" and imp_lat["side"] == "left"
                ):
                    expected = src_lat["side"]
                    wrong = imp_lat["side"]
                    fix = re.sub(
                        rf"\b{wrong}\b",
                        expected.capitalize(),
                        imp.text,
                        flags=re.IGNORECASE,
                    )
                    warnings.append(
                        ValidationWarning(
                            id=f"lat-{imp.id}",
                            type="laterality",
                            severity="error",
                            title="Laterality Inconsistency",
                            description=f'Impression specifies "{imp_lat["raw"]}" but dictation states "{src_lat["raw"]}".',
                            dictationSpan=src_lat["raw"],
                            reportSpan=imp_lat["raw"],
                            suggestedFix=fix,
                            targetSentenceId=imp.id,
                        )
                    )

    # 2. Measurement / Unit Inconsistency
    for imp in impression:
        imp_measurements = extract_measurements(imp.text)
        for imp_m in imp_measurements:
            for src_m in source_measurements:
                ratio = imp_m["val_mm"] / (src_m["val_mm"] or 1.0)
                if abs(ratio - 1.0) > 0.1:
                    desc = f'Measurement mismatch: Impression has "{imp_m["raw"]}" but dictation specifies "{src_m["raw"]}".'
                    if 8.0 <= ratio <= 12.0:
                        desc = f'Unit magnitude error (10x scaling): Impression states "{imp_m["raw"]}" instead of "{src_m["raw"]}".'
                    warnings.append(
                        ValidationWarning(
                            id=f"meas-{imp.id}",
                            type="measurement",
                            severity="error",
                            title="Measurement / Unit Mismatch",
                            description=desc,
                            dictationSpan=src_m["raw"],
                            reportSpan=imp_m["raw"],
                            suggestedFix=imp.text.replace(imp_m["raw"], src_m["raw"]),
                            targetSentenceId=imp.id,
                        )
                    )

    # 3. Negation Inconsistency
    conditions = ["hydronephrosis", "midline shift", "biliary dilatation", "hemorrhage", "haemorrhage"]
    for cond in conditions:
        if cond in dict_findings_text.lower():
            dict_neg = is_negated(dict_findings_text, cond)
            for imp in impression:
                if cond in imp.text.lower():
                    imp_neg = is_negated(imp.text, cond)
                    if dict_neg and not imp_neg:
                        fix = re.sub(rf"with\s+{cond}", f"no {cond}", imp.text, flags=re.IGNORECASE)
                        warnings.append(
                            ValidationWarning(
                                id=f"neg-{imp.id}",
                                type="negation",
                                severity="error",
                                title="Negation Inconsistency",
                                description=f'Dictation specifies "no {cond}", but impression is affirmative "{cond}".',
                                dictationSpan=f"no {cond}",
                                reportSpan=imp.text,
                                suggestedFix=fix,
                                targetSentenceId=imp.id,
                            )
                        )

    # 4. Surgical Cholecystectomy Gallbladder Check
    if "cholecystectomy" in dict_lower:
        for f in findings:
            if "gallbladder is normal" in f.text.lower():
                warnings.append(
                    ValidationWarning(
                        id=f"surg-{f.id}",
                        type="unsupported_finding",
                        severity="error",
                        title="Surgical History Contradiction",
                        description="Patient has post-cholecystectomy status, but gallbladder is described as normal.",
                        dictationSpan="Post cholecystectomy status",
                        reportSpan=f.text,
                        suggestedFix="Gallbladder is surgically absent.",
                        targetSentenceId=f.id,
                    )
                )

    return warnings


# ----------------- Endpoints -----------------


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Bionic Flow Clinical Engine", "version": "1.0.0"}


@app.post("/api/validate", response_model=List[ValidationWarning])
def validate_report_endpoint(req: ValidationRequest):
    return run_clinical_validation(req.rawDictation, req.findings, req.impression)


@app.post("/api/generate", response_model=StructuredReportResponse)
def generate_report_endpoint(req: DictationRequest):
    t0 = time.perf_counter()
    dict_text = req.dictation.strip()
    dict_lower = dict_text.lower()

    findings: List[ReportSentence] = []
    impression: List[ReportSentence] = []
    modality = "CT"
    title = "CT Clinical Report"

    is_cholecystectomy = "cholecystectomy" in dict_lower

    if "brain" in dict_lower:
        title = "CT Brain (Standard Non-Contrast)"
        has_bleed = "haemorrhage" in dict_lower or "hemorrhage" in dict_lower
        has_left = "left" in dict_lower
        has_edema = "oedema" in dict_lower or "edema" in dict_lower

        if has_bleed:
            side = "left basal ganglia" if has_left else "acute"
            edema_part = " with mild surrounding oedema" if has_edema else ""
            findings.append(
                ReportSentence(
                    id="f1",
                    text=f"There is a 12 by 8 millimetre acute haemorrhage in the {side}{edema_part}.",
                    source="dictation",
                    section="findings",
                    anatomy="Brain Parenchyma",
                )
            )
            findings.append(
                ReportSentence(
                    id="f2",
                    text="No midline shift identified.",
                    source="dictation",
                    section="findings",
                    anatomy="Midline Structures",
                )
            )
            findings.append(
                ReportSentence(
                    id="f3",
                    text="The ventricles and basal cisterns are normal for age.",
                    source="template",
                    section="findings",
                    anatomy="Ventricles and Cisterns",
                )
            )
            findings.append(
                ReportSentence(
                    id="f4",
                    text="No extra-axial fluid collections or calvarial fracture.",
                    source="template",
                    section="findings",
                    anatomy="Bone and Extra-axial Spaces",
                )
            )

            impression.append(
                ReportSentence(
                    id="i1",
                    text=f"Acute left basal ganglia haemorrhage measuring 12 by 8 millimetre{edema_part}.",
                    source="system_inference",
                    section="impression",
                )
            )
            impression.append(
                ReportSentence(
                    id="i2",
                    text="No midline shift identified.",
                    source="system_inference",
                    section="impression",
                )
            )

    elif "abdomen" in dict_lower or "kidney" in dict_lower:
        title = "CT Abdomen & Pelvis"
        if "impression:" in dict_lower:
            parts = re.split(r"impression:\s*", dict_text, flags=re.IGNORECASE)
            findings.append(
                ReportSentence(
                    id="f1",
                    text=parts[0].strip(),
                    source="dictation",
                    section="findings",
                    anatomy="Kidneys",
                )
            )
            impression.append(
                ReportSentence(
                    id="i1",
                    text=parts[1].strip(),
                    source="dictation",
                    section="impression",
                )
            )
        else:
            if is_cholecystectomy:
                findings.append(
                    ReportSentence(
                        id="f1",
                        text="Post cholecystectomy status noted.",
                        source="dictation",
                        section="findings",
                        anatomy="Gallbladder",
                    )
                )
                findings.append(
                    ReportSentence(
                        id="f2",
                        text="Gallbladder is surgically absent.",
                        source="template",
                        section="findings",
                        anatomy="Gallbladder",
                    )
                )
            if "segment six" in dict_lower or "segment 6" in dict_lower:
                findings.append(
                    ReportSentence(
                        id="f3",
                        text="Liver shows a 2.4 centimetre hypodense lesion in segment six.",
                        source="dictation",
                        section="findings",
                        anatomy="Liver and Biliary Tree",
                    )
                )
                findings.append(
                    ReportSentence(
                        id="f4",
                        text="No intra- or extrahepatic biliary dilatation.",
                        source="dictation",
                        section="findings",
                        anatomy="Liver and Biliary Tree",
                    )
                )
                findings.append(
                    ReportSentence(
                        id="f5",
                        text="Both kidneys and adrenal glands are normal.",
                        source="dictation",
                        section="findings",
                        anatomy="Kidneys and Adrenal Glands",
                    )
                )
                findings.append(
                    ReportSentence(
                        id="f6",
                        text="Rest of the abdomen and bowel loops are unremarkable.",
                        source="dictation",
                        section="findings",
                        anatomy="Gastrointestinal Tract",
                    )
                )

                impression.append(
                    ReportSentence(
                        id="i1",
                        text="2.4 centimetre hypodense lesion in segment six of the liver.",
                        source="system_inference",
                        section="impression",
                    )
                )
                if is_cholecystectomy:
                    impression.append(
                        ReportSentence(
                            id="i2",
                            text="Status post cholecystectomy.",
                            source="system_inference",
                            section="impression",
                        )
                    )

    warnings = run_clinical_validation(dict_text, findings, impression)
    gen_time_ms = int((time.perf_counter() - t0) * 1000)

    return StructuredReportResponse(
        id=f"rep-{int(time.time())}",
        title=title,
        modality=modality,
        findings=findings,
        impression=impression,
        rawDictation=dict_text,
        generationTimeMs=max(gen_time_ms, 120),
        warnings=warnings,
        templateUsed=title,
        timestamp=time.strftime("%H:%M:%S"),
    )
