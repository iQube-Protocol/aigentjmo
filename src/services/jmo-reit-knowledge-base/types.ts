
export interface JMOREITKnowledgeItem {
  id: string;
  title: string;
  content: string;
  section: string;
  category: 'reit-basics' | 'reit-structure' | 'operator-iqubes' | 'shareholder-iqubes' | 'lender-iqubes' | 'reitqube-architecture' | 'defi-integration' | 'token-economics' | 'compliance' | 'strategic-positioning';
  keywords: string[];
  timestamp: string;
  source: string;
  connections?: string[]; // Links to related KB cards from other knowledge bases
  crossTags?: string[]; // Tags for cross-filtering (e.g., 'iqubes', 'coyn')
}
