
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define MCP context structure
interface MCPContext {
  conversationId: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  metadata: {
    userProfile: Record<string, any>;
    environment: string;
    modelPreference?: string;
    metisActive?: boolean;
  };
  documentContext?: Array<{
    documentId: string;
    documentName: string;
    documentType: string;
    content: string;
    summary?: string;
    lastModified?: string;
  }>;
}

// Initialize a conversation store (in-memory for now, would use a database in production)
const conversationStore = new Map<string, MCPContext>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      metaQube, 
      blakQube, 
      conversationId, 
      metisActive, 
      historicalContext,
      documentContext 
    } = await req.json();
    
    console.log(`Processing request for conversation ${conversationId} with historical context: ${historicalContext ? 'present' : 'none'}`);
    console.log(`Document context received: ${documentContext ? documentContext.length + ' documents' : 'none'}`);
    
    // Validate document context if provided
    let validatedDocumentContext = documentContext;
    let documentsWithContent = 0;
    let documentsIncluded = false;
    
    if (documentContext && Array.isArray(documentContext)) {
      // Validate document structure and content
      validatedDocumentContext = documentContext.filter(doc => {
        const isValid = doc && 
          typeof doc.documentId === 'string' && 
          typeof doc.documentName === 'string' && 
          typeof doc.documentType === 'string' && 
          typeof doc.content === 'string' &&
          doc.content.length > 0;
        
        if (!isValid) {
          console.log(`Filtering out invalid document: ${doc?.documentName || 'unknown'}`);
        }
        
        if (doc && doc.content && doc.content.length > 0) {
          documentsWithContent++;
        }
        
        return isValid;
      });
      
      if (validatedDocumentContext.length > 0) {
        documentsIncluded = true;
        console.log("Documents included in context with contents:", 
          validatedDocumentContext.map((doc: any) => ({
            name: doc.documentName,
            type: doc.documentType,
            contentLength: doc.content?.length || 0
          })));
      } else {
        console.log("No valid documents with content were found in the request");
      }
      
      console.log(`Documents with content: ${documentsWithContent} out of ${documentContext.length} received`);
      
      if (documentsWithContent === 0 && documentContext.length > 0) {
        console.log("⚠️ All documents are missing content! This will affect agent response.");
      }
    }
    
    // Initialize or retrieve MCP context
    let mcpContext: MCPContext;
    
    if (conversationId && conversationStore.has(conversationId)) {
      mcpContext = conversationStore.get(conversationId)!;
      // Add user message to context
      mcpContext.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      // Update Metis status if changed
      if (metisActive !== undefined) {
        mcpContext.metadata.metisActive = metisActive;
      }
      // Update document context if provided
      if (validatedDocumentContext && validatedDocumentContext.length > 0) {
        mcpContext.documentContext = validatedDocumentContext;
        console.log(`Updated document context for conversation ${conversationId}, now has ${validatedDocumentContext.length} documents with content`);
      }
    } else {
      // Create new conversation context
      const newConversationId = conversationId || crypto.randomUUID();
      mcpContext = {
        conversationId: newConversationId,
        messages: [{
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        }],
        metadata: {
          userProfile: {
            metaQube,
            blakQube
          },
          environment: "web3_education",
          modelPreference: "gpt-4o-mini",
          metisActive: metisActive || false
        },
        documentContext: validatedDocumentContext || []
      };
      
      if (validatedDocumentContext && validatedDocumentContext.length > 0) {
        console.log(`New conversation ${newConversationId} created with ${validatedDocumentContext.length} documents`);
      }
    }
    
    // Updated system prompt with formatting instructions including Mermaid, iQube data, and document context
    let systemPrompt = `## **Prompt: Learning Aigent Powered by iQubes with Document Analysis**

**<role-description>**  
You are a **Learning Aigent**, built to help people confidently explore and grow in the world of Web3 and blockchain. You specialize in turning content into a custom learning journey, powered by **iQubes** (smart information containers) and **Aigents** (intelligent assistants that know how to use them).

With your advanced capabilities, you can now analyze documents from Google Drive and incorporate them into your responses. When documents are provided, make sure to reference them directly and extract relevant information to answer the user's questions.  

---

**<response-formatting>**
Your responses MUST be:
1. Concise and user-friendly - focus on clarity over verbosity
2. Well-structured with appropriate spacing and paragraphs for readability
3. Direct and to-the-point, avoiding unnecessary text
4. Formatted to highlight key information, using bold or bullet points when appropriate
5. Focused on summarizing knowledge, not quoting it verbatim
6. Natural and conversational, not overly formal or robotic
7. Including whitespace between paragraphs for improved readability

---

**<mermaid-diagrams>**
When explaining complex processes or concepts, offer to create visual aids using Mermaid diagrams. You should proactively suggest this for topics related to:
- Blockchain architecture or processes
- Transaction flows
- Protocol operations
- Relationships between components
- System architectures

When creating Mermaid diagrams, use this format:
\`\`\`mermaid
diagram-code-here
\`\`\`

Use appropriate diagram types (flowchart, sequence, class, etc.) based on what you're explaining. Keep diagrams simple and focused on the key concepts.

---

**<document-analysis-capabilities>**
You have the ability to analyze documents shared by the user. When documents are referenced, you should:
1. Acknowledge the document content
2. Extract and reference relevant information
3. Connect the document content to the user's questions
4. Highlight key insights from the documents
5. Provide analysis and additional context beyond what's in the documents

**<how-it-works>**  
As a Learning Aigent, you work inside an **iQube**, a smart container that holds everything needed to learn: content, documents, tools, models, and learning checkpoints. iQubes are built to keep things private, secure, and flexible.

---

**<key-responsibilities>**
- Take any content (including shared documents) and turn it into a clear, personalized learning path.  
- Break complex topics into simple, manageable steps.  
- Recommend exercises, examples, and resources that match how the person learns best.  
- Adapt constantly — as the learner grows, so does the plan.

---

**<knowledge-base-usage>**
When using information from the knowledge base:
1. DO NOT quote knowledge base content verbatim
2. Synthesize and summarize the relevant information
3. Present insights in your own words, maintaining your conversational style
4. Provide contextually relevant responses that integrate the knowledge naturally
5. Use the knowledge as a foundation but add your own analysis and insights

---

**<conversation-style>**  
Be conversational and friendly. Welcome users and ask open-ended questions about their interests in web3, AI, and blockchain. Be responsive to whatever subject they wish to learn about.

Additionally, consider the following iQube data for personalization:
- MetaQube Information:
  - iQube Type: ${metaQube ? metaQube["iQube-Type"] : "DataQube"}
  - iQube Use: ${metaQube ? metaQube["iQube-Use"] : "For learning in web3 communities"}
  - Related iQubes: ${metaQube && metaQube["Related-iQubes"] ? metaQube["Related-iQubes"].join(", ") : "General web3 topics"}

- BlakQube Information (if available):
  - Profession: ${blakQube ? blakQube["Profession"] : "Web3 Professional"}
  - Web3 Interests: ${blakQube && blakQube["Web3-Interests"] ? blakQube["Web3-Interests"].join(", ") : "Blockchain, DeFi, NFTs"}
  - Tokens of Interest: ${blakQube && blakQube["Tokens-of-Interest"] ? blakQube["Tokens-of-Interest"].join(", ") : "General tokens"}
  - Chain IDs: ${blakQube && blakQube["Chain-IDs"] ? blakQube["Chain-IDs"].join(", ") : "Multiple chains"}`;

    // Add document context if available
    if (mcpContext.documentContext && mcpContext.documentContext.length > 0) {
      documentsIncluded = true;
      systemPrompt += `\n\n**<document-context>**\nThe following documents have been shared for analysis:\n`;
      
      mcpContext.documentContext.forEach((doc, index) => {
        if (doc.content && doc.content.length > 0) {
          const contentLength = doc.content.length;
          const previewLength = Math.min(contentLength, 2000);
          
          systemPrompt += `\nDocument ${index + 1}: ${doc.documentName} (Type: ${doc.documentType})\n`;
          systemPrompt += `Content: ${doc.content.substring(0, previewLength)}${contentLength > previewLength ? '...(content truncated)' : ''}\n`;
          
          console.log(`Including document ${index + 1}: ${doc.documentName}, content length: ${contentLength}`);
        } else {
          systemPrompt += `\nDocument ${index + 1}: ${doc.documentName} (Type: ${doc.documentType}) - NOTE: Document has no content\n`;
          console.log(`⚠️ Document ${index + 1}: ${doc.documentName} has no content to include`);
        }
      });
      
      systemPrompt += `\n\nWhen responding, refer to these documents when relevant and extract key information to help answer the user's questions. If the user asks about the documents, provide detailed information from them. If the user doesn't specifically mention the documents but they contain relevant information to the user's query, still incorporate that information in your response.`;
    }

    // Add historical context if provided
    if (historicalContext && historicalContext.length > 0) {
      console.log('Adding historical context to system prompt');
      systemPrompt += `\n\n${historicalContext}`;
    }

    // Add Metis capabilities if active
    if (mcpContext.metadata.metisActive) {
      systemPrompt += `\n\n**<metis-agent-capabilities>**
As an enhanced agent with Metis capabilities, you now have specialized expertise in:

1. **Crypto Risk Analysis**: You can analyze and explain security risks associated with specific tokens, cryptocurrencies, and wallets.

2. **Blockchain Security**: You can provide detailed explanations about blockchain security models, vulnerabilities, and best practices.

3. **Token Risk Assessment**: You can evaluate tokens based on their market behavior, smart contract implementations, and security history.

4. **Wallet Security Best Practices**: You can recommend specific security measures for different wallet types and use cases.

When the user asks about crypto risks, token security, or wallet protection, provide more detailed, technical and specific information than you normally would. Include specific security metrics and risk factors in your analysis.`;
    }

    // Convert MCP context to OpenAI message format
    const formattedMessages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add conversation history (limit to last 10 messages for token constraints)
    const recentMessages = mcpContext.messages.slice(-10);
    recentMessages.forEach(msg => {
      formattedMessages.push({ role: msg.role, content: msg.content });
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mcpContext.metadata.modelPreference || 'gpt-4o-mini',
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Add AI response to context
    mcpContext.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });
    
    // Store updated context
    conversationStore.set(mcpContext.conversationId, mcpContext);
    
    // Log context state (helpful for debugging)
    console.log(`Conversation ${mcpContext.conversationId} updated, now has ${mcpContext.messages.length} messages`);
    console.log(`Metis status: ${mcpContext.metadata.metisActive ? 'Active' : 'Inactive'}`);
    
    // Return the AI response with MCP metadata
    return new Response(JSON.stringify({ 
      id: crypto.randomUUID(),
      response: aiResponse,
      timestamp: new Date().toISOString(),
      conversationId: mcpContext.conversationId,
      contextSize: mcpContext.messages.length,
      documentsUsed: documentsIncluded,
      mcp: {
        version: "1.0",
        contextRetained: true,
        modelUsed: mcpContext.metadata.modelPreference,
        metisActive: mcpContext.metadata.metisActive,
        documentsAnalyzed: mcpContext.documentContext?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Error in learn-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      response: "I'm sorry, I couldn't process your request. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
