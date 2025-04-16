# koda
An AI-powered market research tool for Ventures Platform Fund.

## Overview

VP Insight Engine autonomously gathers, analyzes, and delivers insights on African macroeconomic trends, market activity, and sector-specific developments. It helps the investment team make faster and higher-quality investment decisions while enabling output that positions VP as a thought leader in the African investment ecosystem.

## Features

- **Content Aggregation**: Pulls data from trusted sources including economic databases, startup/VC funding data, news outlets, government portals, and analyst reports.
- **AI-Powered Analysis**: Utilizes Claude 3 Opus or GPT-4 with Retrieval-Augmented Generation (RAG) to provide context-aware insights.
- **Output Formats**:
  - Weekly Macroeconomic Summaries (country-level economic insights)
  - Weekly Sector Trend Reports (focused on VP's key sectors)
  - Custom Natural Language Querying
- **Delivery Channels**:
  - Web Dashboard
  - Slack Integration
  - Email Digests
  - Notion Integration

## Architecture

![Architecture Diagram](architecture-diagram.png)

The system consists of several key components:

1. **Data Pipeline**: Collects data from various sources through web crawlers and API connectors
2. **Storage Layer**: Stores documents and their vector embeddings for semantic search
3. **Intelligence Layer**: Processes queries and generates insights using LLMs and RAG
4. **Delivery Channels**: Distributes insights through various platforms

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- An OpenAI API key or Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ventures-platform/vp-insight-engine.git
   cd vp-insight-engine
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. Set up environment variables:
   ```bash
   cp .env.template .env
   ```
   Edit the `.env` file and add your API keys.

### Running the System

#### Development Mode

1. Start the backend:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start the frontend:
   ```bash
   npm run client
   ```

3. Visit `http://localhost:3000` in your browser.

#### Production Mode

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Visit `http://localhost:5000` in your browser.

## Usage

### Web Dashboard

The web dashboard provides access to all features:

- **Macroeconomic Dashboard**: View country-level economic data
- **Sector Analysis**: Explore trends in key sectors
- **Company Research**: Get detailed analysis of specific startups
- **Query Interface**: Ask natural language questions about markets
- **Weekly Digest**: Access all weekly reports in one place

### Slack Integration

Use the `/vpinsight` command in Slack:

- `/vpinsight query [your question]` - Ask a custom question
- `/vpinsight company [company name]` - Research a specific company
- `/vpinsight sector [sector name]` - Get sector analysis
- `/vpinsight macro [country1,country2]` - Get macroeconomic summary

### Email Digests

The system automatically sends weekly digests to subscribed team members every Monday morning.

### Notion Integration

Weekly reports are automatically synced to the configured Notion workspace.

## Customization

### Adding New Data Sources

Edit the `sources` object in `data-processor.js` to add new data sources.

### Configuring Output Formats

Modify the relevant generator functions in `intelligence-layer.js` to customize report formats.

### Tuning the LLM

Adjust the system prompts and parameters in `intelligence-layer.js` to change the style and focus of the generated content.

## Roadmap

- **Data Sources**: Add more specialized sources for startup metrics
- **Analysis**: Incorporate sentiment analysis of news coverage
- **Visualization**: Add more interactive data visualizations
- **Integration**: Add more delivery channels (Teams, Telegram)
- **Customization**: Allow users to create custom report templates

## License

This project is licensed under the MIT License - see the LICENSE file for details.
