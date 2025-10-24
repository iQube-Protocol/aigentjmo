
export interface JMOREITKnowledgeItem {
  id: string;
  title: string;
  content: string;
  section: string;
  category: 'reit-structure' | 'operator-iqubes' | 'shareholder-iqubes' | 'lender-iqubes' | 'quartz-architecture' | 'defi-integration' | 'collateral-lending' | 'recovery-waterfall' | 'token-economics' | 'compliance';
  keywords: string[];
  timestamp: string;
  source: string;
  connections?: string[]; // Links to related KB cards from other knowledge bases
  crossTags?: string[]; // Tags for cross-filtering (e.g., 'iqubes', 'coyn')
}
