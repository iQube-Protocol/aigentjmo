
import { JMOREITKnowledgeItem } from './types';
import { JMO_REIT_KNOWLEDGE_DATA } from './knowledge-data';

export class JMOREITKnowledgeBase {
  private static instance: JMOREITKnowledgeBase;
  private knowledgeItems: JMOREITKnowledgeItem[] = [];

  private constructor() {
    this.initializeKnowledgeBase();
  }

  public static getInstance(): JMOREITKnowledgeBase {
    if (!JMOREITKnowledgeBase.instance) {
      JMOREITKnowledgeBase.instance = new JMOREITKnowledgeBase();
    }
    return JMOREITKnowledgeBase.instance;
  }

  private initializeKnowledgeBase() {
    this.addKnowledgeItems(JMO_REIT_KNOWLEDGE_DATA);
  }

  public addKnowledgeItems(items: JMOREITKnowledgeItem[]) {
    this.knowledgeItems.push(...items);
  }

  public searchKnowledge(query: string): JMOREITKnowledgeItem[] {
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(' ');
    
    return this.knowledgeItems.filter(item => {
      const searchableText = `${item.title} ${item.content} ${item.keywords.join(' ')} ${item.crossTags?.join(' ') || ''}`.toLowerCase();
      return searchTerms.some(term => 
        searchableText.includes(term) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(term)) ||
        item.crossTags?.some(tag => tag.toLowerCase().includes(term))
      );
    }).sort((a, b) => {
      // Sort by relevance - items with more keyword matches first
      const aMatches = searchTerms.filter(term => 
        `${a.title} ${a.content} ${a.keywords.join(' ')} ${a.crossTags?.join(' ') || ''}`.toLowerCase().includes(term)
      ).length;
      const bMatches = searchTerms.filter(term => 
        `${b.title} ${b.content} ${b.keywords.join(' ')} ${b.crossTags?.join(' ') || ''}`.toLowerCase().includes(term)
      ).length;
      return bMatches - aMatches;
    });
  }

  public getAllKnowledge(): JMOREITKnowledgeItem[] {
    return this.knowledgeItems;
  }

  public getKnowledgeByCategory(category: JMOREITKnowledgeItem['category']): JMOREITKnowledgeItem[] {
    return this.knowledgeItems.filter(item => item.category === category);
  }

  /**
   * Get knowledge items that should appear in other knowledge base tabs based on crossTags
   */
  public getKnowledgeByCrossTag(tag: string): JMOREITKnowledgeItem[] {
    return this.knowledgeItems.filter(item => 
      item.crossTags?.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }
}
