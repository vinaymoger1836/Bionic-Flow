import type { TestCasePreset } from '../types/report';

export const TEST_CASE_PRESETS: TestCasePreset[] = [
  {
    id: 'case_1_brain',
    name: 'Case 1: CT Brain',
    badge: 'CT Neuro',
    dictation:
      'CT brain. There is a 12 by 8 millimetre acute haemorrhage in the left basal ganglia with mild surrounding oedema. No midline shift. The ventricles are normal.',
    expectedBehavior:
      'Left basal ganglia side preserved. No midline shift preserved. Ventricles tagged as normal baseline. 0 safety errors.',
    templateId: 'ct_brain',
  },
  {
    id: 'case_2_abdomen',
    name: 'Case 2: CT Abdomen',
    badge: 'CT Body',
    dictation:
      'Contrast CT abdomen. Post cholecystectomy status. Liver shows a 2.4 centimetre hypodense lesion in segment six. No biliary dilatation. Both kidneys are normal. Rest of the abdomen is unremarkable.',
    expectedBehavior:
      'Gallbladder marked as surgically absent (NOT normal). 2.4 cm segment VI liver lesion preserved in impression without hallucinated diagnosis.',
    templateId: 'ct_abdomen',
  },
  {
    id: 'case_3_inconsistency',
    name: 'Case 3: Deliberate Inconsistency',
    badge: 'Safety Trigger',
    dictation:
      'There is a 14 millimetre lesion in the left kidney. No hydronephrosis. Impression: Right renal lesion measuring 14 centimetres with hydronephrosis.',
    expectedBehavior:
      'Flags 3 critical errors: Laterality (Left vs Right), Measurement (14 mm vs 14 cm 10x error), Negation ("No hydronephrosis" vs "with hydronephrosis").',
    templateId: 'ct_abdomen',
    deliberateErrors: [
      'Laterality: Left kidney vs Right renal',
      'Measurement: 14 millimetre vs 14 centimetres (10x error)',
      'Negation: No hydronephrosis vs with hydronephrosis',
    ],
  },
  {
    id: 'case_4_chest',
    name: 'Case 4: CT Chest Normal Scan',
    badge: 'CT Thorax',
    dictation:
      'CT chest without contrast. Lungs are clear without focal consolidation or pneumothorax. No pleural effusion or mediastinal adenopathy. Thoracic cage is intact.',
    expectedBehavior:
      'All lung fields, pleura, and thoracic structures mapped to negative baseline findings. Impression confirms clear study.',
    templateId: 'ct_chest',
  },
];
