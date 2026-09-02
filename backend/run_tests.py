"""
Zero-dependency Python test runner using standard library unittest and urllib.
Can also run with FastAPI TestClient if installed.
"""

import unittest
from main import app, run_clinical_validation, ReportSentence


class TestBionicFlowBackend(unittest.TestCase):
    def test_case_1_ct_brain(self):
        dictation = (
            "CT brain. There is a 12 by 8 millimetre acute haemorrhage in the left "
            "basal ganglia with mild surrounding oedema. No midline shift. The ventricles are normal."
        )
        findings = [
            ReportSentence(
                id="f1",
                text="There is a 12 by 8 millimetre acute haemorrhage in the left basal ganglia.",
                source="dictation",
                section="findings",
            ),
            ReportSentence(
                id="f2",
                text="No midline shift identified.",
                source="dictation",
                section="findings",
            ),
            ReportSentence(
                id="f3",
                text="The ventricles and basal cisterns are normal.",
                source="template",
                section="findings",
            ),
        ]
        impression = [
            ReportSentence(
                id="i1",
                text="Acute left basal ganglia haemorrhage measuring 12 by 8 millimetre with mild surrounding oedema.",
                source="system_inference",
                section="impression",
            ),
            ReportSentence(
                id="i2",
                text="No midline shift identified.",
                source="system_inference",
                section="impression",
            ),
        ]

        warnings = run_clinical_validation(dictation, findings, impression)
        errors = [w for w in warnings if w.severity == "error"]
        self.assertEqual(len(errors), 0)

    def test_case_2_ct_abdomen(self):
        dictation = (
            "Contrast CT abdomen. Post cholecystectomy status. Liver shows a 2.4 centimetre "
            "hypodense lesion in segment six. No biliary dilatation. Both kidneys are normal. Rest of the abdomen is unremarkable."
        )
        findings = [
            ReportSentence(
                id="f1",
                text="Post cholecystectomy status noted.",
                source="dictation",
                section="findings",
            ),
            ReportSentence(
                id="f2",
                text="Gallbladder is surgically absent.",
                source="template",
                section="findings",
            ),
            ReportSentence(
                id="f3",
                text="Liver shows a 2.4 centimetre hypodense lesion in segment six.",
                source="dictation",
                section="findings",
            ),
        ]
        impression = [
            ReportSentence(
                id="i1",
                text="2.4 centimetre hypodense lesion in segment six of the liver.",
                source="system_inference",
                section="impression",
            )
        ]

        warnings = run_clinical_validation(dictation, findings, impression)
        errors = [w for w in warnings if w.severity == "error"]
        self.assertEqual(len(errors), 0)

    def test_case_3_deliberate_inconsistency(self):
        dictation = (
            "There is a 14 millimetre lesion in the left kidney. No hydronephrosis. "
            "Impression: Right renal lesion measuring 14 centimetres with hydronephrosis."
        )
        findings = [
            ReportSentence(
                id="f1",
                text="There is a 14 millimetre lesion in the left kidney.",
                source="dictation",
                section="findings",
            ),
            ReportSentence(
                id="f2",
                text="No hydronephrosis.",
                source="dictation",
                section="findings",
            ),
        ]
        impression = [
            ReportSentence(
                id="i1",
                text="Right renal lesion measuring 14 centimetres with hydronephrosis.",
                source="dictation",
                section="impression",
            )
        ]

        warnings = run_clinical_validation(dictation, findings, impression)
        self.assertGreaterEqual(len(warnings), 3)

        types = {w.type for w in warnings}
        self.assertIn("laterality", types)
        self.assertIn("measurement", types)
        self.assertIn("negation", types)


if __name__ == "__main__":
    unittest.main()
