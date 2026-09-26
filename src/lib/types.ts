export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ClauseCategory = 'Obligation' | 'Risk' | 'Right' | 'Deadline' | 'Neutral';

export interface RulePreCheckResult {
  isFlagged: boolean;
  hasPenalties: boolean;
  hasDeadlines: boolean;
  hasStrongObligations: boolean;
  hasTerminationOrLiability: boolean;
  flaggedReasons: string[];
}

export interface Clause {
  id: string;
  index: number;
  title: string;
  text: string;
  ruleCheck: RulePreCheckResult;
  classification?: ClassificationResult;
  simplifiedText?: string;
}

export interface ClassificationResult {
  clauseId: string;
  category: ClauseCategory;
  riskLevel: RiskLevel;
  reason: string;
  summary: string;
}

export interface KeyMetadata {
  overview: string;
  parties: string[];
  importantDates: string[];
  financialAmounts: string[];
  keyRights: string[];
  keyObligations: string[];
  languageDetected?: string;
}

export interface SimplificationResult {
  sectionIndex: number;
  originalText: string;
  simplifiedText: string;
  headline: string;
}

export interface SimplifyResponsePayload {
  keyMetadata: KeyMetadata;
  sections: SimplificationResult[];
}

export interface ComparisonDiffItem {
  id: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  title: string;
  originalText?: string;
  compareText?: string;
  practicalImplication: string;
  riskLevel: RiskLevel;
}

export interface ComparisonResult {
  summary: string;
  keyDifferences: string[];
  diffs: ComparisonDiffItem[];
}

export interface ChatCitation {
  clauseTitle: string;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isGrounded?: boolean;
  citations?: ChatCitation[];
}

export interface ActionableChecklist {
  summary: string;
  nextSteps: Array<{
    task: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    relatedClause?: string;
  }>;
  lawyerQuestions: Array<{
    question: string;
    context: string;
  }>;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}
