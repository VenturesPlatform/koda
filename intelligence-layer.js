// intelligence-layer.js
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('langchain/schema');
const axios = require('axios');

/**
 * VP Insight Engine - Intelligence Layer
 * 
 * This module handles all interactions with the LLM, including:
 * - Generating summaries and reports
 * - Answering custom queries with RAG
 * - Analyzing trends and extracting insights
 */
class IntelligenceLayer {
  constructor(vectorDb) {
    this.vectorDb = vectorDb;
    
    // Use Claude 3 Opus by default
    this.chatModel = process.env.LLM_PROVIDER === 'openai' 
      ? new ChatOpenAI({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: 'gpt-4-turbo',
          temperature: 0.3
        })
      : null; // We'll use Anthropic API directly
      
    this.useAnthropicApi = process.env.LLM_PROVIDER !== 'openai';
  }

  /**
   * Generate a consistent system prompt for the LLM
   */
  getSystemPrompt(task) {
    const basePrompt = `You are an investment research assistant for Ventures Platform, a VC firm focused on African startups. 
Your job is to provide accurate, insightful analysis to help the investment team make better decisions.

Guidelines:
- Be concise but comprehensive
- Focus on data-driven insights rather than opinions
- Cite sources for all claims when possible
- Organize information clearly with headings and bullet points
- Highlight key metrics and trends
- For financial data, make sure to specify currency (USD, NGN, KES, etc.)
- Always mention data collection dates to provide temporal context
`;

    const taskSpecificPrompts = {
      macroeconomic: `${basePrompt}
You are generating a macroeconomic summary for African markets.
Focus on:
- GDP growth rates and projections
- Inflation rates and trends
- Currency valuation and forex policy
- Central bank policies and interest rates
- Government fiscal policies and budgets
- Key regulatory developments affecting business and investment
- Major economic news and events
`,
      sector: `${basePrompt}
You are generating a sector trend report.
Focus on:
- Recent funding activity in the sector
- Key player movements (new entrants, exits, pivots)
- Regulatory changes affecting the sector
- Market size and growth projections
- Emerging business models and innovations
- Challenges and opportunities in the sector
- Comparison with global trends when relevant
`,
      company: `${basePrompt}
You are analyzing a specific company.
Focus on:
- Business model and value proposition
- Founding team background and experience
- Funding history and valuation progression
- Key metrics (users, revenue, growth rate, etc.)
- Competitive landscape
- Strengths, weaknesses, opportunities and threats
- Regulatory considerations
`,
      query: `${basePrompt}
You are answering a specific research question.
- Provide a direct answer to the question first
- Then offer supporting evidence and context
- Include multiple perspectives when appropriate
- Highlight any contradictions or uncertainties in the data
- Suggest follow-up questions or areas for deeper investigation
`
    };

    return taskSpecificPrompts[task] || basePrompt;
  }

  /**
   * Call the LLM with a specific prompt
   */
  async callLLM(messages, temperature = 0.3) {
    if (this.useAnthropicApi) {
      return this.callAnthropicAPI(messages, temperature);
    } else {
      return this.callLangChainLLM(messages, temperature);
    }
  }

  /**
   * Call the LLM using LangChain (for OpenAI)
   */
  async callLangChainLLM(messages, temperature) {
    try {
      // Convert to LangChain message format
      const langChainMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        } else if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        }
        return new HumanMessage(msg.content);
      });
      
      // Set temperature
      this.chatModel.temperature = temperature;
      
      // Call the model
      const response = await this.chatModel.call(langChainMessages);
      
      return response.content;
    } catch (error) {
      console.error('Error calling LLM via LangChain:', error);
      throw error;
    }
  }

  /**
   * Call the Anthropic Claude API directly
   */
  async callAnthropicAPI(messages, temperature) {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-opus-20240229',
          messages,
          max_tokens: 4000,
          temperature
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw error;
    }
  }

  /**
   * Generate a weekly macroeconomic summary
   */
  async generateMacroeconomicSummary(countries = ['Nigeria', 'Kenya', 'Egypt', 'South Africa']) {
    console.log('Generating macroeconomic summary...');
    
    // Build context for each country
    let context = '';
    for (const country of countries) {
      // Get relevant documents for this country
      const countryDocs = await this.vectorDb.queryDocuments(
        `${country} economy GDP inflation interest rates forex central bank`,
        { category: 'economic' },
        5
      );
      
      // Add country context
      context += `\n=== INFORMATION ABOUT ${country.toUpperCase()} ===\n`;
      countryDocs.forEach((doc, i) => {
        context += `Source: ${doc.metadata.source} (${doc.metadata.timestamp})\n`;
        context += `${doc.content.substring(0, 1000)}...\n\n`;
      });
    }
    
    // Prepare messages for the LLM
    const messages = [
      { role: 'system', content: this.getSystemPrompt('macroeconomic') },
      { role: 'user', content: `Generate a weekly macroeconomic summary for the following African countries: ${countries.join(', ')}. 
Include key indicators like GDP growth, inflation rates, currency performance, and central bank policies.
Use only the information provided in the context, and cite sources.

CONTEXT:
${context}`
      }
    ];
    
    // Generate the summary
    const summary = await this.callLLM(messages);
    
    return {
      title: `Weekly Macroeconomic Summary: ${countries.join(', ')}`,
      content: summary,
      countries,
      date: new Date().toISOString(),
      sources: context.match(/Source: (.*?) \(/g)?.map(s => s.replace('Source: ', '').replace(' (', '')) || []
    };
  }

  /**
   * Generate a sector trend report
   */
  async generateSectorReport(sector) {
    console.log(`Generating sector report for: ${sector}`);
    
    // Get relevant documents about this sector
    const sectorDocs = await this.vectorDb.queryDocuments(
      `${sector} Africa startups funding trends innovation`,
      {},
      10
    );
    
    // Build context from relevant documents
    let context = `\n=== INFORMATION ABOUT ${sector.toUpperCase()} SECTOR ===\n`;
    sectorDocs.forEach((doc, i) => {
      context += `Source: ${doc.metadata.source} (${doc.metadata.timestamp})\n`;
      context += `${doc.content.substring(0, 1000)}...\n\n`;
    });
    
    // Prepare messages for the LLM
    const messages = [
      { role: 'system', content: this.getSystemPrompt('sector') },
      { role: 'user', content: `Generate a comprehensive sector trend report for the ${sector} sector in Africa.
Focus on recent funding activities, market trends, key players, and emerging opportunities.
Use only the information provided in the context, and cite sources.

CONTEXT:
${context}`
      }
    ];
    
    // Generate the report
    const report = await this.callLLM(messages);
    
    return {
      title: `${sector} Sector Trend Report`,
      content: report,
      sector,
      date: new Date().toISOString(),
      sources: context.match(/Source: (.*?) \(/g)?.map(s => s.replace('Source: ', '').replace(' (', '')) || []
    };
  }

  /**
   * Generate a company analysis
   */
  async generateCompanyAnalysis(companyName) {
    console.log(`Generating company analysis for: ${companyName}`);
    
    // Get relevant documents about this company
    const companyD
