const axios = require('axios');
const fs = require('fs');
const path = require('path');

class JiraClient {
  constructor() {
    this.config = this.loadConfig();
    this.baseUrl = this.config.jira.baseUrl;
    this.auth = {
      username: this.config.jira.username,
      password: this.config.jira.apiToken
    };
  }

  loadConfig() {
    // Try to load from environment variables first
    if (process.env.JIRA_BASE_URL) {
      return {
        jira: {
          baseUrl: process.env.JIRA_BASE_URL,
          username: process.env.JIRA_USERNAME,
          apiToken: process.env.JIRA_API_TOKEN,
          jql: process.env.JIRA_JQL
        },
        server: {
          port: process.env.PORT || 3000
        }
      };
    }

    // Try to load from config.json
    try {
      const configPath = path.join(__dirname, 'config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Try to load API token from private key file
      try {
        const keyPath = path.join(__dirname, 'jira-key-private.txt');
        const apiToken = fs.readFileSync(keyPath, 'utf8').trim();
        
        // Replace placeholder or use the token from file
        if (apiToken && !apiToken.includes('YOUR_JIRA_API_TOKEN_HERE')) {
          config.jira.apiToken = apiToken;
        }
      } catch (keyError) {
        console.log('No jira-key-private.txt found, using token from config.json');
      }
      
      return config;
    } catch (error) {
      console.error('Error loading config:', error.message);
      throw new Error('Configuration not found. Please set up config.json or environment variables.');
    }
  }

  async searchIssues(jql = null) {
    try {
      const query = jql || this.config.jira.jql;
      
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/search`,
        {
          jql: query,
          maxResults: 100,
          fields: [
            'summary',
            'status',
            'assignee',
            'priority',
            'created',
            'updated',
            'issuetype',
            'project'
          ]
        },
        {
          auth: this.auth,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching Jira data:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Jira data: ${error.response?.data?.errorMessages?.[0] || error.message}`);
    }
  }

  async getIssueDetails(issueKey) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          auth: this.auth,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching issue ${issueKey}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch issue details: ${error.message}`);
    }
  }

  formatIssues(issues) {
    return issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: issue.fields.priority?.name || 'No Priority',
      issueType: issue.fields.issuetype.name,
      project: issue.fields.project.name,
      created: new Date(issue.fields.created).toLocaleDateString(),
      updated: new Date(issue.fields.updated).toLocaleDateString(),
      url: `${this.baseUrl}/browse/${issue.key}`
    }));
  }
}

module.exports = JiraClient;
