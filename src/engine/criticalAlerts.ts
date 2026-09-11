import type { CriticalAlert, ReportSentence } from '../types/report';
import { isNegatedSentence } from './entityExtractor';

interface CriticalFindingRule {
  keywords: string[];
  anatomyKeywords: string[];
  urgency: 'stat' | 'urgent';
  categoryName: string;
  defaultFindingLabel: string;
}

const CRITICAL_RULES: CriticalFindingRule[] = [
  {
    keywords: ['haemorrhage', 'hemorrhage', 'bleed', 'hematoma', 'subarachnoid', 'epidural', 'subdural'],
    anatomyKeywords: ['brain', 'head', 'basal ganglia', 'cerebral', 'parenchyma', 'cistern'],
    urgency: 'stat',
    categoryName: 'ACR Category 1 (Critical Acute Intracranial Finding)',
    defaultFindingLabel: 'Acute Intracranial Hemorrhage',
  },
  {
    keywords: ['pneumothorax'],
    anatomyKeywords: ['lung', 'pleura', 'chest', 'thorax'],
    urgency: 'stat',
    categoryName: 'ACR Category 1 (Tension/Acute Pneumothorax)',
    defaultFindingLabel: 'Acute Pneumothorax',
  },
  {
    keywords: ['pulmonary embolism', 'filling defect in pulmonary artery'],
    anatomyKeywords: ['pulmonary', 'chest', 'lung'],
    urgency: 'stat',
    categoryName: 'ACR Category 1 (Acute Pulmonary Embolism)',
    defaultFindingLabel: 'Acute Pulmonary Embolism',
  },
  {
    keywords: ['aortic dissection', 'aneurysm rupture', 'ruptured aneurysm'],
    anatomyKeywords: ['aorta', 'vascular', 'chest', 'abdomen'],
    urgency: 'stat',
    categoryName: 'ACR Category 1 (Aortic Dissection/Rupture)',
    defaultFindingLabel: 'Aortic Dissection/Vascular Emergency',
  },
  {
    keywords: ['infarct', 'infarction', 'stroke', 'loss of insular ribbon'],
    anatomyKeywords: ['brain', 'cerebral', 'mca', 'head'],
    urgency: 'stat',
    categoryName: 'ACR Category 1 (Acute Ischemic Infarction / Stroke)',
    defaultFindingLabel: 'Acute Territorial Cerebral Infarction',
  },
  {
    keywords: ['appendicitis', 'appendiceal'],
    anatomyKeywords: ['appendix', 'right lower quadrant', 'abdomen', 'pelvis'],
    urgency: 'urgent',
    categoryName: 'ACR Category 2 (Acute Surgical Abdomen / Appendicitis)',
    defaultFindingLabel: 'Acute Appendicitis',
  },
];

export function detectCriticalFinding(
  dictation: string,
  findings: ReportSentence[]
): CriticalAlert | null {
  const dictationLower = dictation.toLowerCase();

  for (const rule of CRITICAL_RULES) {
    const matchedKw = rule.keywords.find((kw) => dictationLower.includes(kw));
    if (!matchedKw) continue;

    // Check negation (e.g. "no acute intracranial hemorrhage" -> ignore)
    const isNegated = isNegatedSentence(dictation, matchedKw);
    if (isNegated) continue;

    // Verify matching anatomy if required
    const matchedAnatomy = rule.anatomyKeywords.find((anat) => dictationLower.includes(anat));
    if (rule.anatomyKeywords.length > 0 && !matchedAnatomy) continue;

    // Find the specific sentence describing this finding
    const specificSentence = findings.find(
      (f) =>
        f.source === 'dictation' &&
        rule.keywords.some((kw) => f.text.toLowerCase().includes(kw)) &&
        !isNegatedSentence(f.text, matchedKw)
    );

    const findingText = specificSentence ? specificSentence.text : rule.defaultFindingLabel;
    const anatomyLabel = matchedAnatomy ? matchedAnatomy.toUpperCase() : 'GENERAL';

    return {
      id: `crit-alert-${Date.now()}`,
      findingText,
      anatomy: anatomyLabel,
      urgency: rule.urgency,
      categoryName: rule.categoryName,
      notified: false,
    };
  }

  return null;
}
