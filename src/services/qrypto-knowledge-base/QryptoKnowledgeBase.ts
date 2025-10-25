
import { QriptoKnowledgeItem } from './types';
import { QRIPTO_KNOWLEDGE_DATA } from './knowledge-data';

export class QryptoKnowledgeBase {
  private static instance: QryptoKnowledgeBase;
  private knowledgeItems: QriptoKnowledgeItem[] = [];

  private constructor() {
    this.initializeKnowledgeBase();
  }

  public static getInstance(): QryptoKnowledgeBase {
    if (!QryptoKnowledgeBase.instance) {
      QryptoKnowledgeBase.instance = new QryptoKnowledgeBase();
    }
    return QryptoKnowledgeBase.instance;
  }

  private initializeKnowledgeBase() {
    this.addKnowledgeItems(QRIPTO_KNOWLEDGE_DATA);
  }

  public addKnowledgeItems(items: QriptoKnowledgeItem[]) {
    this.knowledgeItems.push(...items);
  }

  public searchKnowledge(query: string): QriptoKnowledgeItem[] {
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(' ');
    
    return this.knowledgeItems.filter(item => {
      const searchableText = `${item.title} ${item.content} ${item.keywords.join(' ')}`.toLowerCase();
      return searchTerms.some(term => 
        searchableText.includes(term) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(term))
      );
    }).sort((a, b) => {
      // Sort by relevance - items with more keyword matches first
      const aMatches = searchTerms.filter(term => 
        `${a.title} ${a.content} ${a.keywords.join(' ')}`.toLowerCase().includes(term)
      ).length;
      const bMatches = searchTerms.filter(term => 
        `${b.title} ${b.content} ${b.keywords.join(' ')}`.toLowerCase().includes(term)
      ).length;
      return bMatches - aMatches;
    });
  }

  public getAllKnowledge(): QriptoKnowledgeItem[] {
    return this.knowledgeItems;
  }

  public getKnowledgeByCategory(category: QriptoKnowledgeItem['category']): QriptoKnowledgeItem[] {
    return this.knowledgeItems.filter(item => item.category === category);
  }
}
