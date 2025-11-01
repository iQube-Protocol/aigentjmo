import { COYNKnowledgeBase } from '@/services/coyn-knowledge-base';
import { iQubesKnowledgeBase } from '@/services/iqubes-knowledge-base';
import { QryptoKnowledgeBase } from '@/services/qrypto-knowledge-base';
import { MetaKnytsKnowledgeBase } from '@/services/metaknyts-knowledge-base';
import { JMOREITKnowledgeBase } from '@/services/jmo-reit-knowledge-base';
import { TENANT_CONFIG } from '@/config/tenant';

interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  section: string;
  category: string;
  keywords: string[];
  timestamp: string;
  source: string;
}

interface KnowledgeSearchResult {
  results: KnowledgeResult[];
  sources: string[];
  totalItems: number;
  shouldUseLLMFallback?: boolean;
}

/**
 * Smart Knowledge Base Router
 * Routes queries to appropriate knowledge bases and combines results intelligently
 */
export class AigentKnowledgeRouter {
  private static instance: AigentKnowledgeRouter;
  private coynKB: COYNKnowledgeBase;
  private iQubesKB: iQubesKnowledgeBase;
  private qryptoKB: QryptoKnowledgeBase;
  private metaKnytsKB: MetaKnytsKnowledgeBase;
  private jmoReitKB: JMOREITKnowledgeBase | null;

  private constructor() {
    this.coynKB = COYNKnowledgeBase.getInstance();
    this.iQubesKB = iQubesKnowledgeBase.getInstance();
    this.qryptoKB = QryptoKnowledgeBase.getInstance();
    this.metaKnytsKB = MetaKnytsKnowledgeBase.getInstance();
    this.jmoReitKB = TENANT_CONFIG.tenantId === 'aigent-jmo' ? JMOREITKnowledgeBase.getInstance() : null;
  }

  public static getInstance(): AigentKnowledgeRouter {
    if (!AigentKnowledgeRouter.instance) {
      AigentKnowledgeRouter.instance = new AigentKnowledgeRouter();
    }
    return AigentKnowledgeRouter.instance;
  }

  /**
   * Detect query intent and route to appropriate knowledge bases
   */
  private detectQueryIntent(message: string): {
    iqube: boolean;
    coyn: boolean;
    qrypto: boolean;
    metaknyts: boolean;
    reit: boolean;
    priority: 'iqube' | 'coyn' | 'qrypto' | 'metaknyts' | 'reit' | 'general';
  } {
    const lowerMessage = message.toLowerCase();
    
    // iQube-specific terms
    const iQubeTerms = [
      'proof of state', 'proof-of-state', 'iqube', 'metaqube', 'blakqube', 'tokenqube',
      'cryptographic entanglement', 'dual-network', 'agentic ai', 'didqube',
      'proof-of-risk', 'risk scoring', 'data primitive', 'aigent protocol',
      'contentqube', 'contentqubes', 'dataqube', 'dataqubes', 'toolqube', 'toolqubes',
      'modelqube', 'modelqubes', 'agentqube', 'agentqubes', 'aigent'
    ];
    
    // COYN-specific terms
    const coynTerms = [
      'coyn', 'wallet', 'metamask', 'add token', 'contract address',
      'micro-stable', 'stablecoin', 'ethereum', 'evm'
    ];
    
    // Qrypto-specific terms  
    const qryptoTerms = [
      'consensus', 'blockchain', 'mining', 'proof of work', 'proof of stake',
      'tokenomics', 'defi', 'smart contract', 'gas fees'
    ];
    
    // metaKnyts-specific terms
    const metaKnytsTerms = [
      'bitcoin', 'btc', 'satoshi', 'nakamoto', 'ordinals', 'runes', 'inscriptions',
      'mythology', 'lore', 'metaknyts', 'knyt', 'folklore', 'legend', 'tale',
      'story', 'narrative', 'character', 'myth'
    ];
    
    // REIT-specific terms (JMO tenant only)
    const reitTerms = [
      'reit', 'real estate', 'property', 'commercial real estate', 'reitqube',
      'dvn oracle', 'nav', 'ffo', 'funds from operations', 'dividend yield',
      'rent roll', 'tenant', 'occupancy', 'vacancy', 'cap rate',
      'shareholder iqube', 'operator iqube', 'lender iqube', 'reit coyn',
      'vaulted rent', 'cash flow', 'collateral', 'defi lending', 'rwa',
      'real world asset', 'accredited investor', 'qualified purchaser',
      'sec compliance', 'finra', '1120-reit', 'distribution requirement',
      'foreclosure', 'recovery waterfall', 'aigent jmo', 'jmo knyt', 'qlst'
    ];

    const hasIQubeTerms = iQubeTerms.some(term => lowerMessage.includes(term));
    const hasCoynTerms = coynTerms.some(term => lowerMessage.includes(term));
    const hasQryptoTerms = qryptoTerms.some(term => lowerMessage.includes(term));
    const hasMetaKnytsTerms = metaKnytsTerms.some(term => lowerMessage.includes(term));
    const hasREITTerms = TENANT_CONFIG.tenantId === 'aigent-jmo' && reitTerms.some(term => lowerMessage.includes(term));

    // Determine priority based on specificity
    let priority: 'iqube' | 'coyn' | 'qrypto' | 'metaknyts' | 'reit' | 'general' = 'general';
    if (hasREITTerms) priority = 'reit';
    else if (hasIQubeTerms) priority = 'iqube';
    else if (hasCoynTerms) priority = 'coyn';
    else if (hasQryptoTerms) priority = 'qrypto';
    else if (hasMetaKnytsTerms) priority = 'metaknyts';

    console.log(`🎯 Knowledge Router: Query intent detected - iQube: ${hasIQubeTerms}, COYN: ${hasCoynTerms}, Qrypto: ${hasQryptoTerms}, metaKnyts: ${hasMetaKnytsTerms}, REIT: ${hasREITTerms}, Priority: ${priority}`);

    return {
      iqube: hasIQubeTerms,
      coyn: hasCoynTerms || priority === 'general', // Always search COYN as fallback
      qrypto: hasQryptoTerms,
      metaknyts: hasMetaKnytsTerms,
      reit: hasREITTerms,
      priority
    };
  }

  /**
   * Search knowledge bases based on query intent
   */
  public searchKnowledge(message: string, conversationThemes: string[] = []): KnowledgeSearchResult {
    console.log(`🔍 Knowledge Router: Searching for "${message}" with themes: [${conversationThemes.join(', ')}]`);
    
    const intent = this.detectQueryIntent(message);
    const allResults: KnowledgeResult[] = [];
    const sources: string[] = [];

    // Enhanced search terms
    const searchTerms = this.enhanceSearchQuery(message, conversationThemes);
    
    // Search iQube KB if relevant
    if (intent.iqube || intent.priority === 'iqube') {
      console.log(`📚 Knowledge Router: Searching iQube KB`);
      for (const term of searchTerms) {
        const results = this.iQubesKB.searchKnowledge(term);
        allResults.push(...results);
      }
      if (allResults.length > 0) sources.push('iQube Knowledge Base');
    }

    // Search COYN KB if relevant or as fallback
    if (intent.coyn || intent.priority === 'coyn' || allResults.length === 0) {
      console.log(`📚 Knowledge Router: Searching COYN KB`);
      for (const term of searchTerms) {
        const results = this.coynKB.searchKnowledge(term);
        allResults.push(...results);
      }
      if (allResults.some(r => r.source.includes('COYN'))) sources.push('COYN Knowledge Base');
    }

    // Search Qrypto KB if relevant
    if (intent.qrypto || intent.priority === 'qrypto') {
      console.log(`📚 Knowledge Router: Searching Qrypto KB`);
      for (const term of searchTerms) {
        const results = this.qryptoKB.searchKnowledge(term);
        allResults.push(...results);
      }
      if (allResults.some(r => r.source.includes('Qrypto'))) sources.push('Qrypto Knowledge Base');
    }

    // Search metaKnyts KB if relevant or as tertiary fallback
    if (intent.metaknyts || intent.priority === 'metaknyts' || allResults.length === 0) {
      console.log(`📚 Knowledge Router: Searching metaKnyts KB`);
      for (const term of searchTerms) {
        const metaKnytsResults = this.metaKnytsKB.searchKnowledge(term);
        allResults.push(...metaKnytsResults.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          section: item.section,
          category: item.category,
          keywords: item.keywords,
          timestamp: item.timestamp,
          source: 'metaKnyts Knowledge Base'
        })));
      }
      if (allResults.some(r => r.source.includes('metaKnyts'))) sources.push('metaKnyts Knowledge Base');
    }

    // Search JMO REIT KB if relevant (JMO tenant only)
    if (this.jmoReitKB && (intent.reit || intent.priority === 'reit')) {
      console.log(`📚 Knowledge Router: Searching JMO REIT KB`);
      for (const term of searchTerms) {
        const reitResults = this.jmoReitKB.searchKnowledge(term);
        allResults.push(...reitResults.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          section: item.section,
          category: item.category,
          keywords: item.keywords,
          timestamp: item.timestamp,
          source: 'JMO REIT Knowledge Base'
        })));
      }
      if (allResults.some(r => r.source.includes('JMO REIT'))) sources.push('JMO REIT Knowledge Base');
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = this.deduplicateAndRank(allResults, searchTerms);
    
    // Determine if LLM fallback should be used (no relevant results found)
    const shouldUseLLMFallback = uniqueResults.length === 0;
    
    console.log(`✅ Knowledge Router: Found ${uniqueResults.length} items from sources: ${sources.join(', ')}`);
    if (shouldUseLLMFallback) {
      console.log(`🤖 Knowledge Router: No KB results found - LLM fallback recommended`);
    }
    
    return {
      results: uniqueResults,
      sources,
      totalItems: uniqueResults.length,
      shouldUseLLMFallback
    };
  }

  /**
   * Enhanced search query with conversation context
   */
  private enhanceSearchQuery(message: string, conversationThemes: string[] = []): string[] {
    const baseTerm = message.toLowerCase();
    const enhancedTerms = [baseTerm];
    
    // Context-aware enhancement
    const isMetaKnytsContext = conversationThemes.includes('metaKnyts') || 
                               conversationThemes.includes('KNYT COYN') ||
                               baseTerm.includes('metaknyts') || 
                               baseTerm.includes('knyt');
    
    // Add specific enhancements based on content
    if (baseTerm.includes('proof of state') || baseTerm.includes('proof-of-state')) {
      enhancedTerms.push('iqube protocol', 'cryptographic entanglement', 'data primitives');
    }
    
    if (baseTerm.includes('wallet') || baseTerm.includes('add') || baseTerm.includes('token')) {
      if (isMetaKnytsContext) {
        enhancedTerms.push('knyt coyn', 'wallet setup', 'contract address', 'metamask');
      } else {
        enhancedTerms.push('wallet setup', 'metamask', 'contract address');
      }
    }
    
    console.log(`🔍 Knowledge Router: Enhanced terms: [${enhancedTerms.join(', ')}]`);
    return enhancedTerms;
  }

  /**
   * Remove duplicates and rank by relevance
   */
  private deduplicateAndRank(results: KnowledgeResult[], searchTerms: string[]): KnowledgeResult[] {
    // Remove duplicates based on ID
    const uniqueResults = results.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    // Sort by relevance - items with more search term matches first
    return uniqueResults.sort((a, b) => {
      const aMatches = searchTerms.filter(term => 
        `${a.title} ${a.content} ${a.keywords.join(' ')}`.toLowerCase().includes(term)
      ).length;
      const bMatches = searchTerms.filter(term => 
        `${b.title} ${b.content} ${b.keywords.join(' ')}`.toLowerCase().includes(term)
      ).length;
      return bMatches - aMatches;
    });
  }
}