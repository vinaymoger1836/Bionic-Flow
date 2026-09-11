export type ProvenanceSource = 'dictation' | 'template' | 'system_inference';

export type SectionType = 'findings' | 'impression';

export interface ReportSentence {
  id: string;
  text: string;
  source: ProvenanceSource;
  section: SectionType;
  anatomy?: string;
  isEdited?: boolean;
  originalText?: string;
  groundingSpan?: string;
}

export type ValidationType =
  | 'laterality'
  | 'negation'
  | 'measurement'
  | 'unsupported_finding'
  | 'missing_critical_finding';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationWarning {
  id: string;
  type: ValidationType;
  severity: ValidationSeverity;
  title: string;
  description: string;
  dictationSpan?: string;
  reportSpan?: string;
  suggestedFix?: string;
  targetSentenceId?: string;
  dismissed?: boolean;
  dismissReason?: string;
}

export interface CriticalAlert {
  id: string;
  findingText: string;
  anatomy: string;
  urgency: 'stat' | 'urgent'; // STAT = Category 1 (< 60 min), Urgent = Category 2
  categoryName: string;
  notified: boolean;
  physicianName?: string;
  readbackConfirmed?: boolean;
  timestamp?: string;
  contactMethod?: string;
}

export interface StructuredReport {
  id: string;
  title: string;
  modality: string;
  findings: ReportSentence[];
  impression: ReportSentence[];
  rawDictation: string;
  generationTimeMs: number;
  warnings: ValidationWarning[];
  templateUsed?: string;
  timestamp: string;
  llmModelUsed?: string;
  criticalAlert?: CriticalAlert | null;
}

export interface TestCasePreset {
  id: string;
  name: string;
  badge: string;
  dictation: string;
  expectedBehavior: string;
  templateId?: string;
  deliberateErrors?: string[];
}

export interface RadiologyTemplate {
  id: string;
  name: string;
  modality: string;
  macroShortcut?: string;
  organSections: {
    name: string;
    normalText: string;
    keywords: string[];
    surgicalKeywords?: string[];
  }[];
}

export type LLMProvider = 'groq' | 'openai' | 'custom';

export interface GenerationSettings {
  mode: 'rule_based' | 'hybrid' | 'live_llm';
  provider: LLMProvider;
  apiKey?: string;
  modelName: string;
  customEndpoint?: string;
  temperature?: number;
}
