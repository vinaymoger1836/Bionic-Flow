import type {
  StructuredReport,
  ReportSentence,
  GenerationSettings,
} from '../types/report';
import { getTemplateForDictation } from './templates';
import { validateReport } from './reportValidator';
import { generateStructuredReport } from './reportGenerator';

export async function generateReportWithLLM(
  dictation: string,
  templateId: string | undefined,
  settings: GenerationSettings
): Promise<StructuredReport> {
  const startTime = performance.now();
  const template = getTemplateForDictation(dictation, templateId);

  // If no API key is provided, gracefully fall back to local deterministic engine
  if (!settings.apiKey?.trim()) {
    console.warn('No API key provided for Live LLM mode. Falling back to local engine.');
    return generateStructuredReport(dictation, templateId);
  }

  let endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  if (settings.provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
  } else if (settings.provider === 'custom' && settings.customEndpoint) {
    endpoint = settings.customEndpoint;
  }

  const systemPrompt = `You are Bionic Flow, an AI-native radiology reporting engine at 5C Network.
Convert the radiologist's natural dictation into a sign-ready, structured report conforming strictly to:
1. "findings": An array of discrete sentence objects.
2. "impression": An array of actionable synthesis sentence objects.
3. "source" provenance for EVERY sentence must be strictly one of:
   - "dictation": sentence transcribed or adapted directly from the radiologist's dictation.
   - "template": standard normal template text for unmentioned normal anatomy.
   - "system_inference": clinical impression synthesized by the system.

CRITICAL SAFETY RULES:
- Never change the side/laterality (left remains left, right remains right).
- Never change or scale measurements/units (e.g. 14 mm must stay 14 mm, not 14 cm).
- If dictation mentions surgical history (e.g. post-cholecystectomy), never describe that organ as normal.
- Respond ONLY with a valid JSON object matching the schema below.

JSON Schema:
{
  "modality": "${template.modality}",
  "title": "${template.name}",
  "findings": [
    { "text": "Sentence text.", "source": "dictation"|"template"|"system_inference", "anatomy": "Organ" }
  ],
  "impression": [
    { "text": "Impression point.", "source": "dictation"|"template"|"system_inference" }
  ]
}`;

  const userPrompt = `Radiology Dictation:
"""
${dictation}
"""

Base Template: ${template.name}
Template organ normals to use for unmentioned anatomy:
${template.organSections.map((s) => `- ${s.name}: ${s.normalText}`).join('\n')}

Generate the complete structured report in JSON:`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: settings.modelName || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: settings.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM provider.');
    }

    const parsed = JSON.parse(content);

    const findings: ReportSentence[] = (parsed.findings || []).map(
      (f: any, idx: number) => ({
        id: `llm-find-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        text: f.text || '',
        source: f.source || 'dictation',
        section: 'findings',
        anatomy: f.anatomy,
      })
    );

    const impression: ReportSentence[] = (parsed.impression || []).map(
      (i: any, idx: number) => ({
        id: `llm-imp-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        text: i.text || '',
        source: i.source || 'system_inference',
        section: 'impression',
      })
    );

    const generationTimeMs = Math.round(performance.now() - startTime);

    // Run deterministic safety validator over the live LLM output!
    const warnings = validateReport(dictation, findings, impression);

    return {
      id: `report-llm-${Date.now()}`,
      title: parsed.title || template.name,
      modality: parsed.modality || template.modality,
      findings,
      impression,
      rawDictation: dictation,
      generationTimeMs,
      warnings,
      templateUsed: template.name,
      timestamp: new Date().toLocaleTimeString(),
      llmModelUsed: `${settings.provider.toUpperCase()} (${settings.modelName})`,
    };
  } catch (error: any) {
    console.error('Failed to generate with live LLM, falling back to local engine:', error);
    const fallback = generateStructuredReport(dictation, templateId);
    
    // Extract clean error message
    let errMsg = error.message || 'API Error';
    try {
      const match = errMsg.match(/\{.*\}/);
      if (match) {
        const errObj = JSON.parse(match[0]);
        if (errObj.error?.message) {
          errMsg = errObj.error.message;
        }
      }
    } catch (_) {}

    return {
      ...fallback,
      title: `${fallback.title} [Live LLM Error: ${errMsg.slice(0, 60)}... → Local Fallback]`,
    };
  }
}
