// vector-database.js
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { HNSWLib } = require('langchain/vectorstores/hnswlib');
const { Document } = require('langchain/document');
const fs = require('fs').promises;
const path = require('path');

/**
 * VP Insight Engine - Vector Database Module
 * 
 * This module handles document embeddings, storage, and retrieval for the RAG system.
 * It uses HNSWLib for the vector database (in-memory for MVP, but can be replaced with
 * a persistent solution like Pinecone, Milvus, or Qdrant for production).
 */
class VectorDatabase {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    this.vectorStore = null;
    this.dataDir = path.join(__dirname, 'data');
    this.vectorStoreFile = path.join(this.dataDir, 'vector_store.index');
    
    // Metadata about our stored documents
    this.documentMap = new Map();
  }

  /**
   * Initialize the vector database
   */
  async initialize() {
    console.log('Initializing vector database...');
    
    try {
      // Create the data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Try to load existing vector store
      try {
        this.vectorStore = await HNSWLib.load(
          this.vectorStoreFile,
          this.embeddings
        );
        console.log('Loaded existing vector store from disk');
        
        // Load document metadata
        const metadataFile = path.join(this.dataDir, 'document_metadata.json');
        const metadataJson = await fs.readFile(metadataFile, 'utf8');
        const metadata = JSON.parse(metadataJson);
        
        // Convert back to Map
        this.documentMap = new Map(Object.entries(metadata));
        console.log(`Loaded metadata for ${this.documentMap.size} documents`);
      } catch (error) {
        console.log('No existing vector store found, creating a new one');
        this.vectorStore = new HNSWLib(this.embeddings, {
          space: 'cosine',
          numDimensions: 1536  // OpenAI embeddings dimensions
        });
      }
    } catch (error) {
      console.error('Error initializing vector database:', error);
      throw error;
    }
  }

  /**
   * Add documents to the vector database
   * @param {Array} documents - Array of document objects to add
   */
  async addDocuments(documents) {
    if (!documents || documents.length === 0) {
      console.log('No documents to add');
      return;
    }
    
    console.log(`Adding ${documents.length} documents to vector database...`);
    
    // Convert to LangChain document format
    const langchainDocs = documents.map(doc => {
      // Store metadata for retrieval
      this.documentMap.set(doc.id, {
        id: doc.id,
        title: doc.title,
        source: doc.source,
        sourceUrl: doc.sourceUrl,
        category: doc.category,
        timestamp: doc.timestamp
      });
      
      // Create LangChain document
      return new Document({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          title: doc.title,
          source: doc.source,
          category: doc.category,
          timestamp: doc.timestamp
        }
      });
    });
    
    // Add to vector store
    if (this.vectorStore.addDocuments) {
      await this.vectorStore.addDocuments(langchainDocs);
    } else {
      // If we created a new vector store
      this.vectorStore = await HNSWLib.fromDocuments(
        langchainDocs,
        this.embeddings
      );
    }
    
    // Save vector store to disk
    await this.saveVectorStore();
    
    console.log(`Added ${documents.length} documents to vector database`);
  }

  /**
   * Save the vector store and metadata to disk
   */
  async saveVectorStore() {
    console.log('Saving vector store to disk...');
    
    try {
      await this.vectorStore.save(this.vectorStoreFile);
      
      // Save document metadata
      const metadataObj = Object.fromEntries(this.documentMap);
      await fs.writeFile(
        path.join(this.dataDir, 'document_metadata.json'),
        JSON.stringify(metadataObj, null, 2)
      );
      
      console.log('Vector store saved successfully');
    } catch (error) {
      console.error('Error saving vector store:', error);
      throw error;
    }
  }

  /**
   * Query the vector database for relevant documents
   * @param {string} query - The query text
   * @param {Object} filters - Optional filters for the search
   * @param {number} k - Number of results to return
   */
  async queryDocuments(query, filters = {}, k = 5) {
    console.log(`Querying vector database for: "${query}"`);
    
    try {
      // Apply filters if provided
      let filterFunc = null;
      if (Object.keys(filters).length > 0) {
        filterFunc = (doc) => {
          for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
              if (!value.includes(doc.metadata[key])) {
                return false;
              }
            } else if (doc.metadata[key] !== value) {
              return false;
            }
          }
          return true;
        };
      }
      
      // Search for similar documents
      const results = await this.vectorStore.similaritySearch(
        query,
        k,
        filterFunc
      );
      
      // Enhance results with full metadata
      const enhancedResults = results.map(doc => {
        const metadata = this.documentMap.get(doc.metadata.id) || doc.metadata;
        return {
          content: doc.pageContent,
          metadata
        };
      });
      
      console.log(`Found ${enhancedResults.length} relevant documents`);
      return enhancedResults;
    } catch (error) {
      console.error('Error querying vector database:', error);
      throw error;
    }
  }

  /**
   * Get document statistics for the dashboard
   */
  getStats() {
    const categories = {};
    const sources = {};
    
    // Compile statistics
    for (const doc of this.documentMap.values()) {
      // Count by category
      categories[doc.category] = (categories[doc.category] || 0) + 1;
      
      // Count by source
      sources[doc.source] = (sources[doc.source] || 0) + 1;
    }
    
    return {
      totalDocuments: this.documentMap.size,
      categoryCounts: categories,
      sourceCounts: sources
    };
  }
}

module.exports = VectorDatabase;
