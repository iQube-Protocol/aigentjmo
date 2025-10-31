/**
 * QubeBase KB Export Service
 * Extracts knowledge base content from code files and formats for QubeBase migration
 */

import { COYN_KNOWLEDGE_DATA } from './coyn-knowledge-base/knowledge-data';
import { knytKnowledgeData } from './knyt-knowledge-base/knowledge-data';
import { IQUBES_KNOWLEDGE_DATA } from './iqubes-knowledge-base/knowledge-data';
import { JMO_REIT_KNOWLEDGE_DATA } from './jmo-reit-knowledge-base/knowledge-data';
import { METAKNYTS_KNOWLEDGE_DATA } from './metaknyts-knowledge-base/knowledge-data';
import { QRIPTO_KNOWLEDGE_DATA } from './qrypto-knowledge-base/knowledge-data';
import { NAKAMOTO_SYSTEM_PROMPT } from './mondai-service';

export interface QubeBaseDocument {
  slug: string;
  title: string;
  content_text: string;
  lang: string;
  tags: string[];
  domain?: string;
  topic?: string;
  source_uri?: string;
  metadata?: Record<string, any>;
}

/**
 * Export COYN KB to QubeBase document format
 */
export function exportCOYNKnowledge(): QubeBaseDocument[] {
  return COYN_KNOWLEDGE_DATA.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'qryptocoyn',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      timestamp: item.timestamp,
      connections: item.connections || []
    }
  }));
}

/**
 * Export KNYT KB to QubeBase document format
 */
export function exportKNYTKnowledge(): QubeBaseDocument[] {
  return knytKnowledgeData.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'knyt',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      type: item.type,
      connections: item.connections || []
    }
  }));
}

/**
 * Export iQubes KB to QubeBase document format
 */
export function exportiQubesKnowledge(): QubeBaseDocument[] {
  return IQUBES_KNOWLEDGE_DATA.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'iqubes',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      timestamp: item.timestamp
    }
  }));
}

/**
 * Export REIT KB to QubeBase document format
 */
export function exportREITKnowledge(): QubeBaseDocument[] {
  return JMO_REIT_KNOWLEDGE_DATA.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'aigent-jmo',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      timestamp: item.timestamp,
      connections: item.connections || [],
      crossTags: item.crossTags || []
    }
  }));
}

/**
 * Export metaKnyts KB to QubeBase document format
 */
export function exportMetaKnytsKnowledge(): QubeBaseDocument[] {
  return METAKNYTS_KNOWLEDGE_DATA.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'metaknyts',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      timestamp: item.timestamp
    }
  }));
}

/**
 * Export Qrypto KB to QubeBase document format
 */
export function exportQryptoKnowledge(): QubeBaseDocument[] {
  return QRIPTO_KNOWLEDGE_DATA.map(item => ({
    slug: item.id,
    title: item.title,
    content_text: item.content,
    lang: 'en',
    tags: item.keywords,
    domain: 'qrypto',
    topic: item.section,
    metadata: {
      category: item.category,
      section: item.section,
      source: item.source,
      timestamp: item.timestamp
    }
  }));
}

/**
 * Export all Nakamoto KB (COYN + KNYT + iQubes + REIT + metaKnyts + Qrypto) as root corpus
 */
export function exportNakamotoRootKB(): QubeBaseDocument[] {
  return [
    ...exportCOYNKnowledge(),
    ...exportKNYTKnowledge(),
    ...exportiQubesKnowledge(),
    ...exportREITKnowledge(),
    ...exportMetaKnytsKnowledge(),
    ...exportQryptoKnowledge()
  ];
}

/**
 * Export Nakamoto root system prompt
 */
export function exportNakamotoRootPrompt() {
  return {
    app: 'nakamoto',
    scope: 'root',
    prompt_text: NAKAMOTO_SYSTEM_PROMPT,
    version: 1,
    status: 'active',
    metadata: {
      exported_at: new Date().toISOString(),
      source: 'Aigent Nakamoto v1'
    }
  };
}

/**
 * Get migration statistics
 */
export function getMigrationStats() {
  const coynDocs = exportCOYNKnowledge();
  const knytDocs = exportKNYTKnowledge();
  const iQubesDocs = exportiQubesKnowledge();
  const reitDocs = exportREITKnowledge();
  const metaKnytsDocs = exportMetaKnytsKnowledge();
  const qryptoDocs = exportQryptoKnowledge();
  
  return {
    totalDocuments: coynDocs.length + knytDocs.length + iQubesDocs.length + reitDocs.length + metaKnytsDocs.length + qryptoDocs.length,
    byDomain: {
      qryptocoyn: coynDocs.length,
      knyt: knytDocs.length,
      iqubes: iQubesDocs.length,
      'aigent-jmo': reitDocs.length,
      metaknyts: metaKnytsDocs.length,
      qrypto: qryptoDocs.length
    },
    hasSystemPrompt: !!NAKAMOTO_SYSTEM_PROMPT,
    promptLength: NAKAMOTO_SYSTEM_PROMPT.length
  };
}
