
import { EventSourcePolyfill } from 'event-source-polyfill';
import { KBAIKnowledgeItem } from '../index';
import { toast } from 'sonner';

/**
 * Connect to the KBAI server using Server-Sent Events
 */
export interface SSEConnectionOptions {
  endpoint: string;
  headers: Record<string, string>;
  query?: string;
  limit?: number;
  category?: string;
  timeout?: number;
}

/**
 * Connect to an SSE endpoint and handle incoming knowledge items
 */
export async function connectToSSE(options: SSEConnectionOptions): Promise<KBAIKnowledgeItem[]> {
  return new Promise((resolve, reject) => {
    const { 
      endpoint, 
      headers, 
      query = '', 
      limit = 10, 
      category = '',
      timeout = 20000 // 20 seconds timeout
    } = options;
    
    // Construct query string with parameters
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (limit) params.append('limit', limit.toString());
    if (category) params.append('category', category);
    
    const fullEndpoint = `${endpoint}?${params.toString()}`;
    console.log('Connecting to SSE endpoint:', fullEndpoint);
    
    // Debug header info
    console.log('Connection headers:', JSON.stringify({
      'x-auth-token': headers['x-auth-token'] ? '[PRESENT]' : '[MISSING]',
      'x-kb-token': headers['x-kb-token'] ? '[PRESENT]' : '[MISSING]'
    }));
    
    // Set up EventSource with minimal headers
    const eventSource = new EventSourcePolyfill(fullEndpoint, {
      headers,
      withCredentials: false, // Explicitly false for CORS
      heartbeatTimeout: 15000 // 15 seconds heartbeat timeout
    });
    
    const knowledgeItems: KBAIKnowledgeItem[] = [];
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (eventSource.readyState !== eventSource.CLOSED) {
        console.log(`SSE connection timed out after ${timeout/1000}s, closing connection`);
        eventSource.close();
        
        // If we have at least some items, consider it a partial success
        if (knowledgeItems.length > 0) {
          console.log(`Returning ${knowledgeItems.length} partial results due to timeout`);
          resolve(knowledgeItems);
        } else {
          reject(new Error('SSE connection timed out without receiving any data'));
        }
      }
    }, timeout);
    
    // Set a shorter "initial data" timeout
    const initialDataTimeout = setTimeout(() => {
      if (knowledgeItems.length === 0 && eventSource.readyState !== eventSource.CLOSED) {
        console.log('No initial data received within 8s, closing connection');
        eventSource.close();
        reject(new Error('No initial data received'));
      }
    }, 8000);
    
    // Event handlers
    eventSource.onopen = (event) => {
      console.log('SSE connection opened successfully', event);
    };
    
    eventSource.onmessage = (event) => {
      try {
        // Clear the initial data timeout as soon as we get a message
        clearTimeout(initialDataTimeout);
        console.log('Received SSE event data:', event.data);
        
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.warn('Failed to parse SSE event as JSON, trying alternative formats', parseError);
          
          // Try alternative format - some SSE servers send data differently
          // Check if it's a string that needs further processing
          if (typeof event.data === 'string' && event.data.includes('{')) {
            const jsonStr = event.data.substring(event.data.indexOf('{'));
            try {
              data = JSON.parse(jsonStr);
            } catch (e) {
              console.error('Alternative parsing failed too:', e);
              // Continue with event loop, don't add this item
              return;
            }
          } else {
            // If we can't parse it at all, just continue
            return;
          }
        }
        
        // Transform raw data into KBAIKnowledgeItem
        const item = transformKnowledgeItem(data);
        knowledgeItems.push(item);
        
        // If we've reached the limit, close connection and resolve
        if (knowledgeItems.length >= limit) {
          console.log(`Received target number of items (${limit}), closing connection`);
          clearTimeout(connectionTimeout);
          clearTimeout(initialDataTimeout);
          eventSource.close();
          resolve(knowledgeItems);
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      clearTimeout(connectionTimeout);
      clearTimeout(initialDataTimeout);
      eventSource.close();
      
      // Always resolve with error to ensure the app continues to function
      reject(new Error('SSE connection failed - possible CORS or network issue'));
    };
  });
}

/**
 * Transform raw knowledge item from KBAI format
 */
export function transformKnowledgeItem(item: any): KBAIKnowledgeItem {
  return {
    id: item.id || `kb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: item.title || item.name || 'Untitled Knowledge Item',
    content: item.content || item.text || item.description || '',
    type: item.type || 'general',
    source: item.source || 'KBAI',
    relevance: item.relevance || item.score || 0.5,
    timestamp: item.timestamp || new Date().toISOString()
  };
}

/**
 * Check the health of an API endpoint
 */
export async function checkApiHealth(
  endpoint: string, 
  headers: Record<string, string>
): Promise<boolean> {
  try {
    console.log('Checking API health for endpoint:', endpoint);
    
    // First try a simple fetch with no-cors mode and minimal headers
    try {
      console.log('Attempting fetch with no-cors mode...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'HEAD',
        headers: {
          'x-auth-token': headers['x-auth-token'],
          'x-kb-token': headers['x-kb-token']
        },
        signal: controller.signal,
        mode: 'no-cors', // Try no-cors mode first
      });
      
      clearTimeout(timeoutId);
      console.log('No-cors request completed without error');
      return true; // If no exception is thrown with no-cors, consider it a success
    } catch (fetchError) {
      console.error('No-cors fetch failed:', fetchError);
      
      // If the fetch failed, try WebSocket
      if (window.WebSocket) {
        try {
          // Create a web socket URL by replacing http with ws
          const wsEndpoint = endpoint.replace(/^http/, 'ws');
          console.log('Attempting WebSocket connection to:', wsEndpoint);
          
          return new Promise((resolve) => {
            const socket = new WebSocket(wsEndpoint);
            
            // Set a timeout for the WebSocket connection attempt
            const timeout = setTimeout(() => {
              console.log('WebSocket connection timeout');
              socket.close();
              resolve(false);
            }, 5000);
            
            socket.onopen = () => {
              console.log('WebSocket connection successful');
              clearTimeout(timeout);
              socket.close();
              resolve(true);
            };
            
            socket.onerror = (wsError) => {
              console.log('WebSocket connection failed:', wsError);
              clearTimeout(timeout);
              resolve(false);
            };
          });
        } catch (wsError) {
          console.log('WebSocket connection setup failed:', wsError);
          return false;
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
