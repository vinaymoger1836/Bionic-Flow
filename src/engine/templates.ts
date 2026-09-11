import type { RadiologyTemplate } from '../types/report';

export const DEFAULT_RADIOLOGY_TEMPLATES: RadiologyTemplate[] = [
  {
    id: 'ct_brain',
    name: 'CT Brain (Standard Non-Contrast)',
    modality: 'CT',
    macroShortcut: '.normbrain',
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
    macroShortcut: '.normabd',
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
    macroShortcut: '.normchest',
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

export const RADIOLOGY_TEMPLATES = DEFAULT_RADIOLOGY_TEMPLATES;

const STORAGE_KEY = 'bionic_flow_custom_templates';

export function getStoredTemplates(): RadiologyTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_RADIOLOGY_TEMPLATES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load custom templates from storage:', err);
  }
  return DEFAULT_RADIOLOGY_TEMPLATES;
}

export function saveStoredTemplates(templates: RadiologyTemplate[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save templates to storage:', err);
  }
}

export function resetTemplatesToDefault(): RadiologyTemplate[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_RADIOLOGY_TEMPLATES;
}

export function getTemplateForDictation(
  dictation: string,
  explicitTemplateId?: string,
  availableTemplates?: RadiologyTemplate[]
): RadiologyTemplate {
  const templates = availableTemplates && availableTemplates.length > 0
    ? availableTemplates
    : getStoredTemplates();

  if (explicitTemplateId) {
    const found = templates.find((t) => t.id === explicitTemplateId);
    if (found) return found;
  }

  const lower = dictation.toLowerCase();
  if (lower.includes('brain') || lower.includes('head') || lower.includes('haemorrhage') || lower.includes('hemorrhage') || lower.includes('basal ganglia') || lower.includes('stroke')) {
    const brainTpl = templates.find((t) => t.id === 'ct_brain');
    if (brainTpl) return brainTpl;
  }
  if (lower.includes('abdomen') || lower.includes('pelvis') || lower.includes('liver') || lower.includes('cholecystectomy') || lower.includes('kidney') || lower.includes('renal') || lower.includes('gallbladder')) {
    const abdTpl = templates.find((t) => t.id === 'ct_abdomen');
    if (abdTpl) return abdTpl;
  }
  if (lower.includes('chest') || lower.includes('lung') || lower.includes('thorax') || lower.includes('pleural')) {
    const chestTpl = templates.find((t) => t.id === 'ct_chest');
    if (chestTpl) return chestTpl;
  }

  return templates[0] || DEFAULT_RADIOLOGY_TEMPLATES[0];
}
