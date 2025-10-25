
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Inline CORS headers to avoid shared module import errors
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { OpenAI } from 'https://esm.sh/openai@4.0.0';

// Interface for the response
interface AigentResponse {
  conversationId: string;
  message: string;
  timestamp: string;
  metadata: {
    version: string;
    modelUsed: string;
    knowledgeSource: string;
    itemsFound: number;
    visualsProvided?: boolean;
    mermaidDiagramIncluded?: boolean;
    conversationMemoryUsed?: boolean;
    memoryThemes?: string[];
    [key: string]: any;
  };
}

// Interface for knowledge items
interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}


/**
 * Default JMO KNYT system prompt for non-personalized interactions
 */
const DEFAULT_AIGENT_NAKAMOTO_SYSTEM_PROMPT = `
## **JMO KNYT: Qripto-AgentiQ AI for the REIT Community**

**<role-description>**
You are **JMO KNYT** (never refer to yourself as Aigent Nakamoto), a friendly and intelligent AI agent designed to serve the global Qripto community through the JMO KNYT Aigent. You are a REIT Master. Your mission is to help users learn, earn, and connect around the themes of blockchain, Web3, decentralized AI, with a primary focus on REITs and decentralized REIT assets in a way that is welcoming, clear, and empowering — especially for newcomers.

You are not a typical AI assistant. You are a Qripto-agentic AI, meaning you prioritize user sovereignty, privacy, and contextual intelligence. You do not rely on centralized data extraction models. Instead, you use a privacy-preserving and decentralized technology called iQubes. These are secure, modular information containers that allow you to deliver personalized, context-aware support while protecting the user's data rights.

**<coyn-protocol-understanding>**
The COYN protocol is a framework for a new class of data-as-asset backed cryptocurrencies that enable data to be priced as quantifiable assets. iQube provides the core infrastructure through Proof-of-Risk and Proof-of-Price consensus systems. QryptoCOYN and KNYT COYN are specific implementations of COYN protocol currencies, each with their unique characteristics within this broader framework.

**<knowledge-base-hierarchy>**
Your knowledge resources are prioritized as follows:
1. **Primary**: JMO REIT knowledge base (REIT operations, tokenization, economics - 50% priority)
2. **Secondary**: iQube knowledge base (core technology and infrastructure - 20% priority)
3. **Secondary**: COYN knowledge base (protocol framework and implementations - 20% priority)
4. **Tertiary**: metaKnyts knowledge base (for mythology, lore, bitcoin folklore, and fictional narratives - 10% priority)
5. **Fallback**: LLM general knowledge when no relevant KB content is found

**CRITICAL**: Always consult the relevant knowledge bases for your responses first. When no relevant knowledge base content is found, you may use your general knowledge while clearly indicating the source of information.

For COYN-related queries:
- Always reference the COYN KB for accurate information
- Emphasize that COYN is an anagram for "Currency of Your Network" when appropriate
- Draw from the comprehensive COYN knowledge base rather than making assumptions

For metaKnyts-related queries:
- Use the metaKnyts KB as your PRIMARY resource
- Reference actual characters, concepts, and themes from the knowledge base
- Do not fabricate metaKnyts content - always ground responses in the KB
- You may embellish and expand on KB content naturally, but remain rooted in the source material

Use metaKnyts KB when users ask about:
- Bitcoin mythology and lore
- Fictional tales and narratives
- metaKnyts characters, concepts, or themes
- Mystical or storytelling aspects of the ecosystem

**<logos-and-mythos-integration>**
iQube and COYN represent the logos (real-world implementations), while metaKnyts represents the mythos (mythological framework). When drawing from metaKnyts content, naturally connect it to iQube and COYN concepts where appropriate, but avoid forced connections. The metaKnyts franchise explores themes that are implemented in the real world through iQube and COYN technologies.

**<language-usage>**
While your identity focuses on "iQube and COYN" (singular), use natural language in responses. This means using plurals (iQubes, COYNs) when contextually appropriate while maintaining your core specialization identity.

**<conversation-memory>**
You have access to conversation history that helps you:
- Maintain context continuity throughout the session
- Reference previous exchanges naturally
- Build upon concepts previously discussed
- Avoid repeating information unnecessarily
- Maintain consistent persona and expertise

**<personality>**
* **Knowledgeable** – You have deep understanding of the iQube and COYN ecosystem, tokenomics, and crypto-agentic concepts.
* **Approachable** – You speak in simple, clear, and encouraging language.
* **Precise** – You provide accurate information with proper citations when referencing knowledge base content.
* **Action-oriented** – You help users understand and engage with the iQube and COYN ecosystem effectively.
* **Memory-consistent** – You build upon previous conversation context naturally.

**<response-formatting>**
Your responses MUST be:
1. Concise and user-friendly - focus on clarity over verbosity
2. Well-structured with appropriate spacing and paragraphs for readability
3. Direct and to-the-point, avoiding unnecessary text
4. Include proper citations when referencing knowledge base content
5. Natural and conversational, not overly formal or robotic
6. Contextually aware of previous exchanges when memory is available

**<mermaid-diagrams>**
When explaining complex iQube and COYN processes, offer to create visual aids using Mermaid diagrams:

\`\`\`mermaid
diagram-code-here
\`\`\`

**<tone-guidance>**
Your tone is conversational, upbeat, and encouraging - like a knowledgeable friend who understands Web3 and iQube and COYN but explains things clearly. Reference previous conversation context naturally when available.
`;

/**
 * Create ChainGPT API response using direct API calls
 */
async function createChainGPTResponse(
  message: string,
  systemPrompt: string,
  conversationId: string
): Promise<string> {
  const chainGPTApiKey = Deno.env.get('CHAINGPT_API_KEY');
  if (!chainGPTApiKey) {
    throw new Error('ChainGPT API key not configured');
  }

  console.log('🔧 ChainGPT: Using direct API call');
  
  try {
    // Call ChainGPT API directly
    const response = await fetch('https://api.chaingpt.org/chat/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chainGPTApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'general_assistant',
        question: `${systemPrompt}\n\nUser: ${message}`,
        chatHistory: 'on',
        sdkUniqueId: conversationId,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    if (!response.ok) {
      console.error('❌ ChainGPT: API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: raw
      });
      throw new Error(`ChainGPT API error: ${response.status} ${response.statusText} - ${raw?.slice(0,200)}`);
    }

    // Try to parse JSON first; if not JSON, fall back to raw text
    let data: any = null;
    try {
      data = contentType.includes('application/json') ? JSON.parse(raw) : JSON.parse(raw);
    } catch (_) {
      data = null;
    }

    console.log('✅ ChainGPT: Response received successfully');

    if (data) {
      return data.data?.bot || data.bot || '';
    }

    // Fallback: return raw text (some environments may return non-JSON full answers)
    return raw || '';
    
  } catch (error: any) {
    console.error('❌ ChainGPT: Error:', {
      message: error?.message || 'Unknown error',
    });
    throw new Error(`ChainGPT error: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Create AI client with proper Venice configuration (OpenAI client for Venice and OpenAI only)
 */
function createAIClient(useVenice: boolean = false, useChainGPT: boolean = false) {
  // Trim to avoid leading/trailing spaces accidentally breaking auth
  const openAIApiKey = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
  const veniceApiKey = (Deno.env.get('VENICE_API_KEY') ?? '').trim();
  
  // ChainGPT uses direct API calls, handled separately
  if (useChainGPT) {
    console.log('🔧 ChainGPT: Will use ChainGPT direct API (not OpenAI client)');
    return null; // Return null to indicate ChainGPT uses different approach
  } else if (useVenice) {
    if (!veniceApiKey) {
      throw new Error('Venice AI API key not configured');
    }
    
    console.log('🔧 Venice: Creating Venice AI client with proper configuration');
    
    return new OpenAI({
      apiKey: veniceApiKey,
      baseURL: 'https://api.venice.ai/api/v1',
    });
  } else {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    return new OpenAI({
      apiKey: openAIApiKey,
    });
  }
}

// Call Lovable AI Gateway (no external API keys needed)
async function callLovableAI(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, model: string = "google/gemini-2.5-flash"): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limits exceeded, please try again later.");
    if (resp.status === 402) throw new Error("Payment required, please add funds to your Lovable AI workspace.");
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    throw new Error("AI gateway error");
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Select appropriate Venice model based on query type
 */
function selectVeniceModel(message: string): string {
  const messageLower = message.toLowerCase();
  
  // For creative, roleplay, or unrestricted content
  if (messageLower.includes('creative') || messageLower.includes('story') || 
      messageLower.includes('roleplay') || messageLower.includes('uncensored')) {
    return "venice-uncensored";
  }
  
  // For complex reasoning, research, or analytical tasks
  if (messageLower.includes('analyze') || messageLower.includes('research') || 
      messageLower.includes('logic') || messageLower.includes('reasoning')) {
    return "venice-reasoning";
  }
  
  // For technical or complex tasks
  if (messageLower.includes('technical') || messageLower.includes('code') || 
      messageLower.includes('complex') || messageLower.includes('detailed')) {
    return "venice-large";
  }
  
  // Default to venice-uncensored for general use
  return "venice-uncensored";
}

function selectChainGPTModel(message: string): string {
  const messageLower = message.toLowerCase();
  
  // ChainGPT uses a single Web3-specialized model according to their docs
  // All requests go to the same model with Web3/crypto expertise built-in
  return 'ChainGPT Web3 LLM';
}

/**
 * Process the user's query with enhanced persona context, metaKnyts knowledge, and conversation memory
 */
async function processWithOpenAI(
  message: string,
  knowledgeItems: KnowledgeItem[] = [],
  conversationId: string,
  historicalContext?: string,
  systemPrompt?: string,
  qryptoKnowledgeContext?: string,
  conversationMemory?: string,
  useVenice: boolean = false,
  useChainGPT: boolean = false,
  personaContext?: any,
  contextualPrompt?: string
): Promise<string> {
  // Handle ChainGPT separately since it uses different API format
  if (useChainGPT) {
    console.log('🚀 ChainGPT: Processing with native ChainGPT API');
    
    // Build the complete system prompt for ChainGPT
    let finalSystemPrompt = systemPrompt || DEFAULT_AIGENT_NAKAMOTO_SYSTEM_PROMPT;
    finalSystemPrompt = DEFAULT_AIGENT_NAKAMOTO_SYSTEM_PROMPT;
    console.log('🧠 Using Aigent Nakamoto system prompt');

    // Add all context to system prompt for ChainGPT
    const contextParts = [finalSystemPrompt];
    
    if (qryptoKnowledgeContext) {
      contextParts.push(`\n### MetaKnyts Knowledge Context\n${qryptoKnowledgeContext}`);
    }
    
    if (conversationMemory && conversationMemory.trim()) {
      contextParts.push(`\n### Conversation Memory\n${conversationMemory}`);
      console.log('🧠 Added conversation memory to system prompt');
    }
    
    if (contextualPrompt && !personaContext?.isAnonymous) {
      contextParts.push(`\n### User Context\n${contextualPrompt}`);
      console.log('🔧 Added persona context to system prompt');
    }
    
    const fullSystemPrompt = contextParts.join('\n\n');
    
    return await createChainGPTResponse(message, fullSystemPrompt, conversationId);
  }

  // Using Lovable AI Gateway (no provider-specific client needed)

  // Use provided system prompt or default based on persona context
  let finalSystemPrompt = systemPrompt || DEFAULT_AIGENT_NAKAMOTO_SYSTEM_PROMPT;
  
  // Always use Aigent Nakamoto system prompt
  finalSystemPrompt = DEFAULT_AIGENT_NAKAMOTO_SYSTEM_PROMPT;
  console.log('🧠 Using Aigent Nakamoto system prompt');

  // Format general knowledge items for the AI prompt
  let generalKnowledgeContext = '';
  if (knowledgeItems && knowledgeItems.length > 0) {
    generalKnowledgeContext = `
### Additional Knowledge Base Entries
${knowledgeItems.map((item, index) => 
    `
[Entry ${index + 1}]
Title: ${item.title || 'Untitled'}
Content: ${item.content}
Type: ${item.type || 'General'}
`
).join('\n')}
`;
  }

  // Include historical context if available
  const contextPrompt = historicalContext ? 
    `Previous conversation context:\n${historicalContext}\n\nContinue the conversation based on this history.` : 
    'This is a new conversation.';

  // Enhanced context combining with explicit visual content preservation and conversation memory
  const contextParts = [
    finalSystemPrompt,
    contextPrompt,
    qryptoKnowledgeContext || '',
    generalKnowledgeContext
  ];

  // Add conversation memory if available
  if (conversationMemory && conversationMemory.trim()) {
    contextParts.push(`\n### Conversation Memory\n${conversationMemory}`);
    console.log('🧠 Added conversation memory to system prompt');
  }

  // Add persona context if available
  if (contextualPrompt && !personaContext?.isAnonymous) {
    contextParts.push(`\n### User Context\n${contextualPrompt}`);
    console.log('🔧 Added persona context to system prompt');
  }

  // Add final reminder for visual content
  if (qryptoKnowledgeContext && (qryptoKnowledgeContext.includes('mermaid') || qryptoKnowledgeContext.includes('![') || qryptoKnowledgeContext.includes('MERMAID'))) {
    contextParts.push(`
### FINAL REMINDER
The knowledge base contains visual content (mermaid diagrams and/or images). You MUST include ALL visual content in your response exactly as provided in the knowledge base. Do not summarize or omit any mermaid diagrams, images, or visual guides.
`);
    console.log('🎨 Added visual content preservation reminder to system prompt');
  }

  const fullContext = contextParts.filter(Boolean).join('\n\n');

  // Use Lovable AI Gateway for completions
  const modelName = 'google/gemini-2.5-flash';
  console.log(`🚀 Lovable AI Gateway: Making API call with model: ${modelName}`);
  
  try {
    const content = await callLovableAI([
      { role: "system", content: fullContext },
      { role: "user", content: message }
    ], modelName);

    console.log(`✅ Lovable AI Gateway: Response received successfully`);
    return content || "I apologize, I wasn't able to process your request.";
  } catch (error: any) {
    console.error('❌ Lovable AI Gateway: API Error:', {
      message: error?.message || 'Unknown error'
    });

    // Keep previous fallback behavior if needed in the future
    throw error;
  }
}

/**
 * Enhanced detection for mermaid diagrams and visual content
 */
function detectMermaidDiagram(content: string): boolean {
  return content.includes("```mermaid");
}

function detectVisualContent(content: string): boolean {
  return content.includes("```mermaid") || content.includes("![") || content.includes("<img");
}

/**
 * Process a user message and generate a response with persona context, metaKnyts knowledge, and conversation memory
 */
async function processAigentInteraction(
  message: string, 
  conversationId: string | null,
  knowledgeItems: KnowledgeItem[] = [],
  historicalContext?: string,
  systemPrompt?: string,
  qryptoKnowledgeContext?: string,
  conversationMemory?: string,
  useVenice: boolean = false,
  useChainGPT: boolean = false,
  personaContext?: any,
  contextualPrompt?: string
): Promise<AigentResponse> {
  // Generate a new conversation ID if none provided
  if (!conversationId) {
    conversationId = crypto.randomUUID();
  }
  
  const aiProvider = useChainGPT ? 'ChainGPT' : useVenice ? 'Venice AI (uncensored)' : 'OpenAI';
  console.log(`🔄 Aigent Edge Function: Processing with ${aiProvider}`);
  if (personaContext && !personaContext.isAnonymous) {
    console.log(`🧠 Aigent Edge Function: Using persona context for ${personaContext.preferredName || 'user'}`);
  }
  
  if (qryptoKnowledgeContext) {
    console.log(`📚 Aigent Edge Function: Using metaKnyts knowledge context`);
  }

  if (conversationMemory) {
    console.log(`🧠 Aigent Edge Function: Using conversation memory`);
  }
  
  // Process with the AI API (OpenAI, Venice, or ChainGPT) including persona context, metaKnyts knowledge, and conversation memory
  const aiResponse = await processWithOpenAI(
    message, 
    knowledgeItems, 
    conversationId, 
    historicalContext,
    systemPrompt,
    qryptoKnowledgeContext,
    conversationMemory,
    useVenice,
    useChainGPT,
    personaContext,
    contextualPrompt
  );
  
  // Detect if response contains a mermaid diagram
  const mermaidDiagramIncluded = detectMermaidDiagram(aiResponse);
  
  // Determine if response might benefit from visuals
  const visualsProvided = mermaidDiagramIncluded || message.toLowerCase().includes('diagram');
  
  const modelUsed = useChainGPT ? selectChainGPTModel(message) : useVenice ? selectVeniceModel(message) : "gpt-4o-mini";
  const finalAiProvider = useChainGPT ? "ChainGPT" : useVenice ? "Venice AI (Uncensored)" : "OpenAI";
  
  // Determine knowledge source
  let knowledgeSource = "LLM General Knowledge";
  if (qryptoKnowledgeContext && knowledgeItems.length > 0) {
    knowledgeSource = "metaKnyts KB + Aigent Knowledge Router";
  } else if (qryptoKnowledgeContext) {
    knowledgeSource = "metaKnyts Knowledge Base";
  } else if (knowledgeItems.length > 0) {
    knowledgeSource = "Aigent Knowledge Router";
  }

  // Add conversation memory to knowledge source if used
  if (conversationMemory) {
    knowledgeSource += " + Conversation Memory";
  }
  
  return {
    conversationId,
    message: aiResponse,
    timestamp: new Date().toISOString(),
    metadata: {
      version: "1.0",
      modelUsed,
      knowledgeSource,
      itemsFound: knowledgeItems.length,
      visualsProvided,
      mermaidDiagramIncluded,
      conversationMemoryUsed: !!conversationMemory,
      isOffline: false,
      aiProvider: finalAiProvider,
      personaContextUsed: personaContext && !personaContext.isAnonymous,
      preferredName: personaContext?.preferredName,
      metaKnytsContextUsed: !!qryptoKnowledgeContext
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  
  try {
    const { 
      message, 
      conversationId, 
      knowledgeItems, 
      historicalContext,
      systemPrompt,
      qryptoKnowledgeContext,
      conversationMemory,
      useVenice = false,
      useChainGPT = false,
      personaContext,
      contextualPrompt
    } = await req.json();

    console.log(`🚀 Aigent Edge Function: Received request with Venice: ${useVenice}, ChainGPT: ${useChainGPT}`);
    console.log(`🔧 Aigent Edge Function: useVenice parameter type:`, typeof useVenice, 'value:', useVenice);
    console.log(`🔧 Aigent Edge Function: useChainGPT parameter type:`, typeof useChainGPT, 'value:', useChainGPT);

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'No message provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Specific provider pre-checks (return helpful 400s instead of generic 500s)
    if (useChainGPT && !Deno.env.get('CHAINGPT_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'ChainGPT API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the message with enhanced context and AI provider selection
    const response = await processAigentInteraction(
      message, 
      conversationId, 
      knowledgeItems || [],
      historicalContext,
      systemPrompt,
      qryptoKnowledgeContext,
      conversationMemory,
      useVenice,
      useChainGPT,
      personaContext,
      contextualPrompt
    );

    console.log(`✅ Aigent Edge Function: Response generated using ${response.metadata.aiProvider}`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in aigent-ai function:', error);

    const message = error instanceof Error ? error.message : String(error);
    // Map known configuration errors to 400 so the client can surface actionable guidance
    if (message.includes('ChainGPT API key not configured')) {
      return new Response(
        JSON.stringify({ error: 'ChainGPT API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Propagate ChainGPT HTTP errors with appropriate status codes when possible
    const httpMatch = message.match(/ChainGPT API error: (\d{3})/);
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Error processing request',
        message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
