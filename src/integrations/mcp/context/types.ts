
import { MCPContext } from '../types';

export interface StorageOptions {
  storage?: Storage;
  keyPrefix?: string;
  chunkSize?: number;
}

export interface ContextStorageService {
  saveContext(conversationId: string, context: MCPContext): void;
  loadContext(conversationId: string): MCPContext | null;
  removeContext(conversationId: string): boolean;
}
