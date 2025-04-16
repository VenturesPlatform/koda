// data-processor.js
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * VP Insight Engine - Data Processing Utility
 * 
 * This module handles fetching, parsing, and processing data from various sources
 * for the VP Insight Engine.
 */

class DataProcessor {
  constructor() {
    this.sources = {
      economic: [
        { name: 'IMF', url: 'https://www.imf.org/en/Countries/AFR', type: 'webpage' },
        { name: 'World Bank', url: 'https://data.worldbank.org/region/sub-saharan-africa', type: 'api', 
          apiKey: process.env.WORLD_BANK_API_KEY },
        { name: 'AfDB', url: 'https://www.afdb.org/en/knowledge/statistics', type: 'webpage' }
      ],
      funding: [
        { name: 'Africa: The Big Deal', url: 'https://thebigdeal.substack.com/', type: 'newsletter' },
        { name: 'Crunchbase', url: 'https://www.crunchbase.com/discover/organization.companies/field/organizations/location_identifiers/africa', 
          type: 'api', apiKey: process.env.CRUNCHBASE_API_KEY }
      ],
      news: [
        { name: 'TechCabal', url: 'https://techcabal.com/', type: 'rss', feed: 'https://techcabal.com/feed/' },
        { name: 'Rest of World', url: 'https://restofworld.org/region/africa/', type: 'webpage' }
      ],
      regulatory: [
        { name: 'Central Bank of Nigeria', url: 'https://www.cbn.gov.ng/', type: 'webpage' },
        { name: 'Kenya Central Bank', url: 'https://www.centralbank.go.ke/', type: 'webpage' }
      ],
      reports: [
        { name: 'LinkedIn', url: 'https://www.linkedin.com/feed/', type: 'api', 
          apiKey: process.env.LINKEDIN_API_KEY },
        { name: 'Medium', url: 'https://medium.com/tag/african-startup', type: 'rss', 
          feed: 'https://medium.com/feed/tag/african-startup' }
      ]
    };
    
    this.documents = [];
  }

  /**
   * Fetch and process data from all configured sources
   */
  async fetchAllSources() {
    console.log('Starting data collection from all sources...');
    
    // Process each category of sources
    for (const [category, sourceList] of Object.entries(this.sources)) {
      console.log(`Processing ${category} sources...`);
      
      for (const source of sourceList) {
        try {
          const data = await this.fetchSource(source);
          const processedDocs = this.processSourceData(source, data, category);
          this.documents.push(...processedDocs);
          console.log(`Processed ${processedDocs.length} documents from ${source.name}`);
        } catch (error) {
          console.error(`Error processing ${source.name}:`, error.message);
        }
      }
    }
    
    console.log(`Data collection complete. Total documents: ${this.documents.length}`);
    return this.documents;
  }

  /**
   * Fetch data from a specific source
   */
  async fetchSource(source) {
    console.log(`Fetching data from ${source.name} (${source.type})...`);
    
    switch (source.type) {
      case 'webpage':
        return this.scrapeWebpage(source.url);
      
      case 'api':
        return this.fetchAPI(source);
      
      case 'rss':
        return this.fetchRSS(source.feed);
      
      case 'newsletter':
        return this.scrapeWebpage(source.url); // For MVP, handle newsletters like webpages
      
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Scrape content from a webpage
   */
  async scrapeWebpage(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract text content from main content areas (this would need to be customized per site)
      const content = $('main, article, .content, #content').text() || $('body').text();
      
      // Extract headlines
      const headlines = [];
      $('h1, h2, h3').each((i, el) => {
        headlines.push($(el).text().trim());
      });
      
      // Extract links
      const links = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.push({
            text: $(el).text().trim(),
            url: href.startsWith('http') ? href : new URL(href, url).toString()
          });
        }
      });
      
      return {
        pageContent: content,
        headlines,
        links,
        fetchDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Fetch data from an API
   */
  async fetchAPI(source) {
    // This is a simplified implementation for the MVP
    // In a real implementation, each API would have its own adapter
    try {
      const response = await axios.get(source.url, {
        headers: source.apiKey ? { 'Authorization': `Bearer ${source.apiKey}` } : {}
      });
      
      return {
        apiData: response.data,
        fetchDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error calling API ${source.url}:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Fetch and parse an RSS feed
   */
  async fetchRSS(feedUrl) {
    // Simple RSS parsing for MVP
    try {
      const response = await axios.get(feedUrl);
      const items = [];
      
      // Very basic XML parsing (would use a proper RSS parser in production)
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      $('item').each((i, item) => {
        items.push({
          title: $(item).find('title').text(),
          description: $(item).find('description').text(),
          link: $(item).find('link').text(),
          pubDate: $(item).find('pubDate').text()
        });
      });
      
      return {
        feedItems: items,
        fetchDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching RSS ${feedUrl}:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Process raw data from a source into structured documents
   */
  processSourceData(source, data, category) {
    const documents = [];
    
    // Skip processing if there was an error
    if (data.error) {
      return documents;
    }
    
    switch (source.type) {
      case 'webpage':
        // Create a document from webpage content
        if (data.pageContent) {
          documents.push({
            id: uuidv4(),
            title: `${source.name} - Web Content`,
            content: data.pageContent,
            source: source.name,
            sourceUrl: source.url,
            category,
            timestamp: data.fetchDate,
            headlines: data.headlines,
            metadata: { type: 'webpage' }
          });
        }
        
        // Create documents from important links
        if (data.links && data.links.length > 0) {
          // Just use the first 5 links for the MVP
          data.links.slice(0, 5).forEach(link => {
            documents.push({
              id: uuidv4(),
              title: link.text || `Link from ${source.name}`,
              content: `Link: ${link.text} - URL: ${link.url}`,
              source: source.name,
              sourceUrl: link.url,
              category,
              timestamp: data.fetchDate,
              metadata: { type: 'link' }
            });
          });
        }
        break;
      
      case 'api':
        // For the MVP, create a single document from API data
        documents.push({
          id: uuidv4(),
          title: `${source.name} - API Data`,
          content: JSON.stringify(data.apiData, null, 2),
          source: source.name,
          sourceUrl: source.url,
          category,
          timestamp: data.fetchDate,
          metadata: { type: 'api' }
        });
        break;
      
      case 'rss':
        // Create a document for each RSS item
        if (data.feedItems && data.feedItems.length > 0) {
          data.feedItems.forEach(item => {
            documents.push({
              id: uuidv4(),
              title: item.title || `Article from ${source.name}`,
              content: item.description || '',
              source: source.name,
              sourceUrl: item.link,
              category,
              timestamp: item.pubDate || data.fetchDate,
              metadata: { type: 'article' }
            });
          });
        }
        break;
      
      case 'newsletter':
        // Handle newsletter content (similar to webpage for MVP)
        documents.push({
          id: uuidv4(),
          title: `${source.name} - Newsletter`,
          content: data.pageContent,
          source: source.name,
          sourceUrl: source.url,
          category,
          timestamp: data.fetchDate,
          metadata: { type: 'newsletter' }
        });
        break;
    }
    
    return documents;
  }

  /**
   * Run daily crawl to update data
   */
  async runDailyCrawl() {
    console.log('Starting daily data crawl...');
    const newDocuments = await this.fetchAllSources();
    return newDocuments;
  }

  /**
   * Generate a weekly summary from collected data
   */
  async generateWeeklySummary() {
    // In a real implementation, this would send the documents to the Intelligence Layer
    // For the MVP, we'll just return the collected documents organized by category
    console.log('Generating weekly summary...');
    
    const summary = {};
    for (const category of Object.keys(this.sources)) {
      summary[category] = this.documents.filter(doc => doc.category === category);
    }
    
    return summary;
  }
}

module.exports = DataProcessor;
