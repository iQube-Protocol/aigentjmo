
export type { JMOREITKnowledgeItem } from './types';
export { JMOREITKnowledgeBase } from './JMOREITKnowledgeBase';
export { JMO_REIT_KNOWLEDGE_DATA } from './knowledge-data';

// Create and export the singleton instance
import { JMOREITKnowledgeBase } from './JMOREITKnowledgeBase';
export const jmoReitKB = JMOREITKnowledgeBase.getInstance();
