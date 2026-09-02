import type { RadiologyTemplate } from '../types/report';

export const RADIOLOGY_TEMPLATES: RadiologyTemplate[] = [
  {
    id: 'ct_brain',
    name: 'CT Brain (Standard Non-Contrast)',
    modality: 'CT',
    organSections: [
      {
        name: 'Brain Parenchyma',
        normalText: 'Gray-white differentiation is preserved. No acute intracranial hemorrhage or territorial infarction.',
        keywords: ['parenchyma', 'cerebral', 'hemorrhage', 'haemorrhage', 'bleed', 'infarct', 'oedema', 'edema', 'basal ganglia', 'cortex'],
      },
      {
        name: 'Ventricles and Cisterns',
        normalText: 'The ventricles, sulci, and basal cisterns are prominent and normal for age.',
        keywords: ['ventricle', 'ventricles', 'cistern', 'cisterns', 'sulci', 'hydrocephalus'],
      },
      {
        name: 'Midline Structures',
        normalText: 'No midline shift or mass effect identified.',
        keywords: ['midline', 'midline shift', 'mass effect', 'herniation'],
      },
      {
        name: 'Bone and Extra-axial Spaces',
        normalText: 'No extra-axial fluid collections or calvarial fracture.',
        keywords: ['bone', 'calvarium', 'skull', 'fracture', 'subdural', 'epidural', 'subarachnoid'],
      },
    ],
  },
  {
    id: 'ct_abdomen',
    name: 'CT Abdomen & Pelvis (Contrast Enhanced)',
    modality: 'CT',
    organSections: [
      {
        name: 'Liver and Biliary Tree',
        normalText: 'The liver demonstrates normal size and attenuation without focal lesion. No intra- or extrahepatic biliary dilatation.',
        keywords: ['liver', 'hepatic', 'segment', 'biliary', 'bile duct', 'dilatation', 'dilation'],
      },
      {
        name: 'Gallbladder',
        normalText: 'The gallbladder is normal in appearance without radiopaque calculi or wall thickening.',
        keywords: ['gallbladder', 'gall bladder', 'cholelithiasis', 'cholecystitis', 'calculi'],
        surgicalKeywords: ['cholecystectomy', 'post cholecystectomy', 'post-cholecystectomy', 'gallbladder removed', 'prior cholecystectomy'],
      },
      {
        name: 'Pancreas and Spleen',
        normalText: 'Pancreas and spleen are normal in size and attenuation without focal lesions.',
        keywords: ['pancreas', 'pancreatic', 'spleen', 'splenic', 'splenomegaly'],
        surgicalKeywords: ['splenectomy', 'pancreatectomy'],
      },
      {
        name: 'Kidneys and Adrenal Glands',
        normalText: 'Both kidneys and adrenal glands are normal. No hydronephrosis, calculus, or perinephric stranding.',
        keywords: ['kidney', 'kidneys', 'renal', 'adrenal', 'adrenals', 'hydronephrosis', 'nephrolithiasis'],
        surgicalKeywords: ['nephrectomy'],
      },
      {
        name: 'Gastrointestinal Tract & Peritoneum',
        normalText: 'Bowel loops are unremarkable without obstruction, wall thickening, or free air. No ascites.',
        keywords: ['bowel', 'colon', 'stomach', 'appendix', 'peritoneum', 'ascites', 'free air', 'rest of the abdomen'],
        surgicalKeywords: ['appendectomy', 'colectomy'],
      },
    ],
  },
  {
    id: 'ct_chest',
    name: 'CT Chest (Standard)',
    modality: 'CT',
    organSections: [
      {
        name: 'Lungs and Airways',
        normalText: 'The lungs are clear without focal consolidation, pneumothorax, or suspicious pulmonary nodules.',
        keywords: ['lung', 'lungs', 'pulmonary', 'consolidation', 'nodule', 'pneumothorax', 'airway'],
      },
      {
        name: 'Pleura and Mediastinum',
        normalText: 'No pleural effusion or mediastinal lymphadenopathy. Cardiac silhouette is normal.',
        keywords: ['pleura', 'pleural', 'effusion', 'mediastinum', 'hilar', 'lymph node', 'heart', 'cardiac'],
      },
      {
        name: 'Chest Wall and Skeleton',
        normalText: 'No acute osseous fracture or chest wall mass.',
        keywords: ['rib', 'ribs', 'sternum', 'spine', 'bone', 'fracture', 'chest wall'],
      },
    ],
  },
];

export function getTemplateForDictation(dictation: string, explicitTemplateId?: string): RadiologyTemplate {
  if (explicitTemplateId) {
    const found = RADIOLOGY_TEMPLATES.find((t) => t.id === explicitTemplateId);
    if (found) return found;
  }

  const lower = dictation.toLowerCase();
  if (lower.includes('brain') || lower.includes('head') || lower.includes('haemorrhage') || lower.includes('hemorrhage') || lower.includes('basal ganglia') || lower.includes('stroke')) {
    return RADIOLOGY_TEMPLATES[0]; // ct_brain
  }
  if (lower.includes('abdomen') || lower.includes('pelvis') || lower.includes('liver') || lower.includes('cholecystectomy') || lower.includes('kidney') || lower.includes('renal') || lower.includes('gallbladder')) {
    return RADIOLOGY_TEMPLATES[1]; // ct_abdomen
  }
  if (lower.includes('chest') || lower.includes('lung') || lower.includes('thorax') || lower.includes('pleural')) {
    return RADIOLOGY_TEMPLATES[2]; // ct_chest
  }

  return RADIOLOGY_TEMPLATES[0];
}
