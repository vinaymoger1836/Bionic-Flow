"""
Python Unit Tests for Bionic Flow Backend API and Validation Engine.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_case_1_ct_brain():
    dictation = (
        "CT brain. There is a 12 by 8 millimetre acute haemorrhage in the left "
        "basal ganglia with mild surrounding oedema. No midline shift. The ventricles are normal."
    )
    res = client.post("/api/generate", json={"dictation": dictation, "templateId": "ct_brain"})
    assert res.status_code == 200
    data = res.json()

    # Verify no critical errors
    errors = [w for w in data["warnings"] if w["severity"] == "error"]
    assert len(errors) == 0

    # Verify laterality left preserved
    all_text = " ".join([s["text"] for s in data["findings"] + data["impression"]])
    assert "left" in all_text.lower()
    assert "right" not in all_text.lower()

    # Verify provenance markings
    dictation_items = [s for s in data["findings"] if s["source"] == "dictation"]
    assert len(dictation_items) > 0


def test_case_2_ct_abdomen():
    dictation = (
        "Contrast CT abdomen. Post cholecystectomy status. Liver shows a 2.4 centimetre "
        "hypodense lesion in segment six. No biliary dilatation. Both kidneys are normal. Rest of the abdomen is unremarkable."
    )
    res = client.post("/api/generate", json={"dictation": dictation, "templateId": "ct_abdomen"})
    assert res.status_code == 200
    data = res.json()

    # Verify gallbladder is not described as normal
    findings_text = " ".join([s["text"] for s in data["findings"]])
    assert "gallbladder is normal" not in findings_text.lower()
    assert "surgically absent" in findings_text.lower()

    # Verify liver lesion in impression
    imp_text = " ".join([s["text"] for s in data["impression"]])
    assert "2.4 centimetre" in imp_text.lower() or "2.4 cm" in imp_text.lower()


def test_case_3_inconsistency_detection():
    dictation = (
        "There is a 14 millimetre lesion in the left kidney. No hydronephrosis. "
        "Impression: Right renal lesion measuring 14 centimetres with hydronephrosis."
    )
    res = client.post("/api/generate", json={"dictation": dictation, "templateId": "ct_abdomen"})
    assert res.status_code == 200
    data = res.json()

    warnings = data["warnings"]
    assert len(warnings) >= 3

    types = {w["type"] for w in warnings}
    assert "laterality" in types
    assert "measurement" in types
    assert "negation" in types
