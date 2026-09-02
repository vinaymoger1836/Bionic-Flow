import type {
  ReportSentence,
  ValidationWarning,
} from '../types/report';
import {
  extractLateralities,
  extractMeasurements,
  extractClinicalFindings,
  isNegatedSentence,
} from './entityExtractor';

export function validateReport(
  rawDictation: string,
  findings: ReportSentence[],
  impression: ReportSentence[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const dictationLower = rawDictation.toLowerCase();

  // Separate ground truth findings portion of dictation from any dictated impression
  const dictationSplit = rawDictation.split(/impression:\s*/i);
  const dictationFindingsText = dictationSplit[0];

  // Extract from ground-truth source (the findings part of dictation + structured findings)
  const sourceMeasurements = extractMeasurements(dictationFindingsText);
  const sourceLateralities = extractLateralities(dictationFindingsText);
  const sourceClinicalFindings = extractClinicalFindings(dictationFindingsText);

  // 1. LATERALITY CHECK
  for (const impSentence of impression) {
    const impLats = extractLateralities(impSentence.text);

    for (const impLat of impLats) {
      for (const srcLat of sourceLateralities) {
        if (
          (srcLat.side === 'left' && impLat.side === 'right') ||
          (srcLat.side === 'right' && impLat.side === 'left')
        ) {
          const expectedSide = srcLat.side;
          const wrongSide = impLat.side;
          const fixReplacement = expectedSide.charAt(0).toUpperCase() + expectedSide.slice(1);
          const wrongPattern = new RegExp(`\\b${wrongSide}\\b`, 'gi');

          warnings.push({
            id: `lat-mismatch-${impSentence.id}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'laterality',
            severity: 'error',
            title: 'Laterality Inconsistency',
            description: `Impression states "${impLat.raw} ${impLat.anatomy}" but dictation specifies "${srcLat.raw}" for this finding.`,
            dictationSpan: srcLat.raw,
            reportSpan: impLat.raw,
            suggestedFix: impSentence.text.replace(wrongPattern, fixReplacement),
            targetSentenceId: impSentence.id,
          });
        }
      }
    }
  }

  // 2. MEASUREMENT & UNIT CHECK
  for (const impSentence of impression) {
    const impMeasurements = extractMeasurements(impSentence.text);
    for (const impM of impMeasurements) {
      for (const srcM of sourceMeasurements) {
        const srcValMm = srcM.normalizedMm[0];
        const impValMm = impM.normalizedMm[0];

        const ratio = impValMm / (srcValMm || 1);
        if (Math.abs(ratio - 1) > 0.1) {
          let description = `Measurement mismatch: Impression has "${impM.raw}" but dictation states "${srcM.raw}".`;
          if (ratio >= 8 && ratio <= 12) {
            description = `Unit magnitude error (10x scaling): Impression states "${impM.raw}" but dictation specified "${srcM.raw}".`;
          }

          warnings.push({
            id: `meas-mismatch-${impSentence.id}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'measurement',
            severity: 'error',
            title: 'Measurement / Unit Inconsistency',
            description,
            dictationSpan: srcM.raw,
            reportSpan: impM.raw,
            suggestedFix: impSentence.text.replace(impM.raw, srcM.raw),
            targetSentenceId: impSentence.id,
          });
        }
      }
    }
  }

  // 3. NEGATION INCONSISTENCY CHECK
  const keyConditions = [
    'hydronephrosis',
    'midline shift',
    'biliary dilatation',
    'hemorrhage',
    'haemorrhage',
    'infarct',
    'pneumothorax',
    'fracture',
    'mass effect',
    'calculus',
    'calculi',
    'cholecystitis',
  ];

  for (const cond of keyConditions) {
    const dictHasCond = dictationFindingsText.toLowerCase().includes(cond);
    if (!dictHasCond) continue;

    const dictNegated = isNegatedSentence(dictationFindingsText, cond);

    for (const impSentence of impression) {
      if (impSentence.text.toLowerCase().includes(cond)) {
        const impNegated = isNegatedSentence(impSentence.text, cond);

        if (dictNegated && !impNegated) {
          warnings.push({
            id: `neg-flip-${impSentence.id}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'negation',
            severity: 'error',
            title: 'Negation Inconsistency',
            description: `Dictation states "no ${cond}" (negated), but impression describes affirmative "${cond}".`,
            dictationSpan: `no ${cond}`,
            reportSpan: impSentence.text,
            suggestedFix: impSentence.text
              .replace(new RegExp(`with\\s+${cond}`, 'gi'), `without ${cond}`)
              .replace(new RegExp(`\\b${cond}\\b`, 'gi'), `no ${cond}`),
            targetSentenceId: impSentence.id,
          });
        } else if (!dictNegated && impNegated) {
          warnings.push({
            id: `neg-flip-aff-${impSentence.id}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'negation',
            severity: 'error',
            title: 'Negation Inconsistency',
            description: `Dictation reported active/positive "${cond}", but impression has negated "no ${cond}".`,
            dictationSpan: cond,
            reportSpan: impSentence.text,
            suggestedFix: impSentence.text.replace(new RegExp(`no\\s+${cond}`, 'gi'), cond),
            targetSentenceId: impSentence.id,
          });
        }
      }
    }
  }

  // 4. SURGICAL HISTORY INTEGRITY CHECK (e.g. Gallbladder after cholecystectomy)
  if (
    dictationLower.includes('cholecystectomy') ||
    dictationLower.includes('post cholecystectomy')
  ) {
    for (const finding of findings) {
      if (
        finding.text.toLowerCase().includes('gallbladder is normal') ||
        finding.text.toLowerCase().includes('gallbladder is unremarkable')
      ) {
        warnings.push({
          id: `surg-gb-${finding.id}`,
          type: 'unsupported_finding',
          severity: 'error',
          title: 'Surgical History Contradiction',
          description:
            'Dictation notes post-cholecystectomy status, but gallbladder is described as present and normal.',
          dictationSpan: 'Post cholecystectomy status',
          reportSpan: finding.text,
          suggestedFix: 'Gallbladder is surgically absent.',
          targetSentenceId: finding.id,
        });
      }
    }
  }

  // 5. IMPORTANT FINDINGS MISSING FROM IMPRESSION
  const criticalDictFindings = sourceClinicalFindings.filter(
    (f) => f.isAcuteOrCritical && !f.isNegated
  );

  const impressionText = impression.map((s) => s.text).join(' ').toLowerCase();

  for (const crit of criticalDictFindings) {
    const isRepresented =
      impressionText.includes(crit.entity) ||
      (crit.entity === 'haemorrhage' && impressionText.includes('hemorrhage')) ||
      (crit.entity === 'hemorrhage' && impressionText.includes('haemorrhage')) ||
      (crit.entity === 'oedema' && impressionText.includes('edema')) ||
      (crit.entity === 'edema' && impressionText.includes('oedema')) ||
      impressionText.includes(crit.anatomy);

    if (!isRepresented) {
      warnings.push({
        id: `missing-crit-${crit.entity}-${Math.random().toString(36).substr(2, 5)}`,
        type: 'missing_critical_finding',
        severity: 'warning',
        title: 'Critical Finding Missing from Impression',
        description: `Positive finding "${crit.rawSentence.trim()}" in dictation is not clearly synthesized in the Impression.`,
        dictationSpan: crit.rawSentence,
        suggestedFix: `Acute finding: ${crit.rawSentence.trim()}`,
      });
    }
  }

  // 6. UNSUPPORTED FINDINGS IN IMPRESSION (Hallucination check)
  const severeDiagnoses = [
    'mass effect',
    'herniation',
    'hydrocephalus',
    'cholecystitis',
    'malignancy',
    'metastasis',
    'pneumothorax',
    'fracture',
    'aneurysm',
  ];

  for (const impSentence of impression) {
    const impLower = impSentence.text.toLowerCase();
    for (const diag of severeDiagnoses) {
      if (
        impLower.includes(diag) &&
        !dictationLower.includes(diag) &&
        !isNegatedSentence(impSentence.text, diag)
      ) {
        warnings.push({
          id: `unsupported-hallucination-${impSentence.id}-${diag}`,
          type: 'unsupported_finding',
          severity: 'error',
          title: 'Unsupported Finding in Impression',
          description: `Impression introduces positive diagnosis "${diag}" which was never dictated or observed in findings.`,
          reportSpan: diag,
          targetSentenceId: impSentence.id,
        });
      }
    }
  }

  return warnings;
}
