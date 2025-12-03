const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ConfluenceClient {
  constructor() {
    this.baseUrl = 'https://nutanix.atlassian.net/wiki'; // Adjust if different
    this.token = this.loadToken();
  }

  loadToken() {
    try {
      const tokenPath = path.join(__dirname, 'confluence-key-private.txt');
      if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf8').trim().replace(/\r?\n/g, '');
        return token;
      }
    } catch (error) {
      console.error('Error loading Confluence token:', error);
    }
    return null;
  }

  // Extract Confluence page ID from URL
  extractPageId(confluenceUrl) {
    if (!confluenceUrl) return null;
    
    // Handle string URLs
    let urlString = confluenceUrl;
    if (typeof confluenceUrl === 'object') {
      // If it's an object, try to extract URL from common fields
      urlString = confluenceUrl.url || confluenceUrl.value || confluenceUrl.toString();
    }
    
    if (!urlString) return null;
    
    // Handle different Confluence URL formats
    // https://nutanix.atlassian.net/wiki/spaces/.../pages/123456789/Page+Title
    // https://nutanix.atlassian.net/wiki/pages/viewpage.action?pageId=123456789
    const pageIdMatch = urlString.match(/pageId=(\d+)|pages\/(\d+)/);
    if (pageIdMatch) {
      return pageIdMatch[1] || pageIdMatch[2];
    }
    
    // Try to extract from path
    const pathMatch = urlString.match(/\/pages\/(\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    return null;
  }
  
  // Extract URL from Jira field value (handles different formats)
  extractUrl(fieldValue) {
    if (!fieldValue) return null;
    
    // If it's already a string URL, return it
    if (typeof fieldValue === 'string' && fieldValue.startsWith('http')) {
      return fieldValue;
    }
    
    // If it's an object, try common fields
    if (typeof fieldValue === 'object') {
      return fieldValue.url || fieldValue.value || fieldValue.href || null;
    }
    
    return null;
  }

  // Extract space key from URL
  extractSpaceKey(confluenceUrl) {
    if (!confluenceUrl) return null;
    
    // Extract from /spaces/SPACEKEY/
    const spaceMatch = confluenceUrl.match(/\/spaces\/([^\/]+)/);
    if (spaceMatch) {
      return spaceMatch[1];
    }
    
    return null;
  }

  // Fetch Confluence page content
  async fetchPageContent(confluenceUrl, userToken = null) {
    try {
      // Extract URL first
      const url = this.extractUrl(confluenceUrl);
      if (!url) {
        throw new Error('Invalid Confluence URL format');
      }
      
      const pageId = this.extractPageId(url);
      if (!pageId) {
        throw new Error('Could not extract page ID from Confluence URL');
      }

      const token = userToken || this.token;
      if (!token) {
        throw new Error('Confluence token not available. Please provide token.');
      }

      // Use Confluence REST API v2
      const apiUrl = `${this.baseUrl}/rest/api/content/${pageId}?expand=body.storage,version`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        title: response.data.title,
        body: response.data.body?.storage?.value || '',
        version: response.data.version?.number || 1
      };
    } catch (error) {
      console.error('Error fetching Confluence page:', error.message);
      return {
        success: false,
        error: error.message,
        title: null,
        body: null
      };
    }
  }

  // Extract summary section from Confluence page
  extractSummary(htmlContent) {
    if (!htmlContent) return null;

    try {
      // Look for common summary section patterns
      // Pattern 1: <h2>Summary</h2> or <h3>Summary</h3>
      const summaryRegex = /<h[23][^>]*>Summary<\/h[23]>(.*?)(?=<h[123]|$)/is;
      let match = htmlContent.match(summaryRegex);
      
      if (match) {
        return this.cleanHtml(match[1]);
      }

      // Pattern 2: <p><strong>Summary:</strong>...</p>
      const summaryStrongRegex = /<p[^>]*><strong[^>]*>Summary:?<\/strong>(.*?)<\/p>/is;
      match = htmlContent.match(summaryStrongRegex);
      
      if (match) {
        return this.cleanHtml(match[1]);
      }

      // Pattern 3: Look for first paragraph after title
      const firstParaRegex = /<p[^>]*>(.*?)<\/p>/is;
      match = htmlContent.match(firstParaRegex);
      
      if (match) {
        return this.cleanHtml(match[1]);
      }

      // If no specific summary found, return first 500 chars of content
      return this.cleanHtml(htmlContent).substring(0, 500);
    } catch (error) {
      console.error('Error extracting summary:', error);
      return null;
    }
  }

  // Clean HTML and extract text
  cleanHtml(html) {
    if (!html) return '';
    
    // Remove HTML tags
    let text = html.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  // Fetch and extract summary from Confluence page
  async getSummary(confluenceUrl, userToken = null) {
    try {
      const url = this.extractUrl(confluenceUrl);
      if (!url) {
        return {
          success: false,
          summary: null,
          error: 'No valid Confluence URL provided'
        };
      }

      const pageContent = await this.fetchPageContent(url, userToken);
      
      if (!pageContent.success) {
        return {
          success: false,
          summary: null,
          error: pageContent.error || 'Failed to fetch page'
        };
      }

      const summary = this.extractSummary(pageContent.body);
      
      return {
        success: true,
        summary: summary,
        title: pageContent.title,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        summary: null,
        error: error.message
      };
    }
  }

  // Batch fetch summaries for multiple URLs
  async getSummaries(confluenceUrls, userToken = null) {
    const results = {};
    
    // Process in parallel with rate limiting
    const promises = confluenceUrls.map(async (url, index) => {
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));
      return this.getSummary(url, userToken);
    });

    const summaries = await Promise.all(promises);
    
    confluenceUrls.forEach((url, index) => {
      results[url] = summaries[index];
    });

    return results;
  }
}

module.exports = ConfluenceClient;

