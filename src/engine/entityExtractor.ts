export interface ExtractedMeasurement {
  raw: string;
  dimensions: number[];
  unit: 'mm' | 'cm' | 'm';
  normalizedMm: number[];
  spanIndex: [number, number];
}

export interface ExtractedLaterality {
  side: 'left' | 'right' | 'bilateral' | 'unilateral' | 'midline';
  anatomy: string;
  raw: string;
  spanIndex: [number, number];
}

export interface ExtractedFinding {
  entity: string;
  anatomy: string;
  isNegated: boolean;
  laterality?: 'left' | 'right' | 'bilateral';
  measurement?: ExtractedMeasurement;
  isAcuteOrCritical: boolean;
  rawSentence: string;
}

// Regex for clinical units and measurements (handles "12 by 8 mm", "12 x 8 mm", "2.4 cm", "14 millimetre")
const MEASUREMENT_REGEX =
  /(\d+(?:\.\d+)?)\s*(?:x|by|times|-)?\s*(?:(\d+(?:\.\d+)?)\s*)?(?:x|by|times|-)?\s*(?:(\d+(?:\.\d+)?)\s*)?(millimetres?|millimeters?|centimetres?|centimeters?|mm|cm)\b/gi;

const LATERALITY_REGEX = /\b(left|right|bilateral|unilateral|midline)\b/gi;

const NEGATION_CUES = [
  'no evidence of',
  'no sign of',
  'without evidence of',
  'no',
  'not',
  'without',
  'absence of',
  'negative for',
  'denies',
  'free of',
  'clear of',
  'unremarkable',
  'non-dilated',
  'intact',
  'normal',
];

const CRITICAL_KEYWORDS = [
  'haemorrhage',
  'hemorrhage',
  'bleed',
  'hematoma',
  'infarct',
  'infarction',
  'stroke',
  'lesion',
  'mass',
  'fracture',
  'pneumothorax',
  'dissection',
  'aneurysm',
  'oedema',
  'edema',
  'hydronephrosis',
  'thrombus',
  'embolism',
];

const ANATOMY_KEYWORDS = [
  'basal ganglia',
  'cerebral',
  'cortex',
  'ventricle',
  'ventricles',
  'midline',
  'liver',
  'segment six',
  'segment 6',
  'segment vi',
  'segment vii',
  'segment 7',
  'gallbladder',
  'biliary',
  'kidney',
  'kidneys',
  'renal',
  'spleen',
  'pancreas',
  'adrenal',
  'adrenals',
  'lung',
  'lungs',
  'pleura',
  'rib',
  'spine',
  'bowel',
  'peritoneum',
  'abdomen',
];

export function extractMeasurements(text: string): ExtractedMeasurement[] {
  const results: ExtractedMeasurement[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(MEASUREMENT_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const d1 = parseFloat(match[1]);
    const d2 = match[2] ? parseFloat(match[2]) : undefined;
    const d3 = match[3] ? parseFloat(match[3]) : undefined;
    const rawUnit = match[4].toLowerCase();

    const unit: 'mm' | 'cm' | 'm' = rawUnit.startsWith('cm') || rawUnit.startsWith('cent') ? 'cm' : 'mm';
    const dimensions = [d1, d2, d3].filter((d): d is number => d !== undefined);
    const multiplier = unit === 'cm' ? 10 : 1;
    const normalizedMm = dimensions.map((d) => d * multiplier);

    results.push({
      raw,
      dimensions,
      unit,
      normalizedMm,
      spanIndex: [match.index, match.index + raw.length],
    });
  }

  return results;
}

export function extractLateralities(text: string): ExtractedLaterality[] {
  const results: ExtractedLaterality[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(LATERALITY_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const side = raw.toLowerCase() as ExtractedLaterality['side'];
    
    // Find nearby anatomy in a window of 60 characters
    const startWindow = Math.max(0, match.index - 40);
    const endWindow = Math.min(text.length, match.index + raw.length + 60);
    const nearbyText = text.slice(startWindow, endWindow).toLowerCase();
    
    let anatomy = 'unspecified';
    for (const kw of ANATOMY_KEYWORDS) {
      if (nearbyText.includes(kw)) {
        anatomy = kw;
        break;
      }
    }

    results.push({
      side,
      anatomy,
      raw,
      spanIndex: [match.index, match.index + raw.length],
    });
  }

  return results;
}

export function isNegatedSentence(sentence: string, targetKeyword?: string): boolean {
  const lower = sentence.toLowerCase();
  
  if (!targetKeyword) {
    return NEGATION_CUES.some((cue) => {
      const pattern = new RegExp(`\\b${cue}\\b`, 'i');
      return pattern.test(lower);
    });
  }

  const keywordIndex = lower.indexOf(targetKeyword.toLowerCase());
  if (keywordIndex === -1) {
    return NEGATION_CUES.some((cue) => new RegExp(`\\b${cue}\\b`, 'i').test(lower));
  }

  // Check prefix before keyword
  const prefix = lower.slice(0, keywordIndex);
  return NEGATION_CUES.some((cue) => new RegExp(`\\b${cue}\\b`, 'i').test(prefix));
}

export function extractClinicalFindings(sentence: string): ExtractedFinding[] {
  const lower = sentence.toLowerCase();
  const findings: ExtractedFinding[] = [];
  const measurements = extractMeasurements(sentence);
  const lateralities = extractLateralities(sentence);

  for (const crit of CRITICAL_KEYWORDS) {
    if (lower.includes(crit)) {
      let matchedAnatomy = 'general';
      for (const anat of ANATOMY_KEYWORDS) {
        if (lower.includes(anat)) {
          matchedAnatomy = anat;
          break;
        }
      }

      const lat = lateralities.find((l) => l.side === 'left' || l.side === 'right' || l.side === 'bilateral');
      const meas = measurements.length > 0 ? measurements[0] : undefined;
      const negated = isNegatedSentence(sentence, crit);

      findings.push({
        entity: crit,
        anatomy: matchedAnatomy,
        isNegated: negated,
        laterality: lat?.side as 'left' | 'right' | 'bilateral' | undefined,
        measurement: meas,
        isAcuteOrCritical: !negated,
        rawSentence: sentence,
      });
    }
  }

  return findings;
}
