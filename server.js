const express = require('express');
const cors = require('cors');
const JiraClient = require('./jira-client-clean');
const ConfluenceClient = require('./confluence-client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// Load port from config or environment variable
function getPort() {
  // Try environment variable first
  if (process.env.PORT) {
    return parseInt(process.env.PORT);
  }
  
  // Try to load from config.json
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.server?.port || 3001;
  } catch (error) {
    // Default to 3001 if config not found
    return 3001;
  }
}

const port = getPort();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Jira client
let jiraClient;
try {
  console.log('🔧 [Server] Initializing Jira client...');
  jiraClient = new JiraClient();
  console.log('✅ [Server] Jira client initialized successfully');
} catch (error) {
  console.error('❌ [Server] Failed to initialize Jira client:', {
    message: error.message,
    stack: error.stack
  });
  console.error('❌ [Server] Please check your configuration files (config.json, jira-key-private.txt)');
  process.exit(1);
}

// Initialize Confluence client
let confluenceClient;
try {
  console.log('🔧 [Server] Initializing Confluence client...');
  confluenceClient = new ConfluenceClient();
  console.log('✅ [Server] Confluence client initialized successfully');
} catch (error) {
  console.warn('⚠️ [Server] Confluence client initialization failed (will use token from request):', error.message);
  confluenceClient = new ConfluenceClient(); // Create anyway, will use token from request
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Fetch all data (expensive operation)
app.get('/api/fetch-all-data', async (req, res) => {
  const startTime = Date.now();
  try {
    const jql = req.query.jql; // Optional custom JQL query
    const userToken = req.headers['x-jira-token']; // Token from frontend
    
    if (!userToken) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided. Please authenticate first using the Authenticate button.'
      });
    }
    
    console.log(`📥 [API] /api/fetch-all-data - JQL: ${jql || 'default'}`);
    console.log(`📥 [API] /api/fetch-all-data - Using user-provided token`);
    
    const data = await jiraClient.fetchAllData(jql, userToken);
    const formattedIssues = jiraClient.formatIssues(data.issues, true);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] /api/fetch-all-data - Success in ${duration}ms - ${formattedIssues.length} issues`);
    
    res.json({
      success: true,
      total: data.total,
      issues: formattedIssues,
      message: 'All data fetched successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API] /api/fetch-all-data - Failed after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Refresh columns (uses configured columns only)
app.get('/api/refresh-columns', async (req, res) => {
  const startTime = Date.now();
  try {
    const jql = req.query.jql; // Optional custom JQL query
    const userToken = req.headers['x-jira-token']; // Token from frontend
    
    if (!userToken) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided. Please authenticate first using the Authenticate button.'
      });
    }
    
    console.log(`📥 [API] /api/refresh-columns - JQL: ${jql || 'default'}`);
    console.log(`📥 [API] /api/refresh-columns - Using user-provided token`);
    
    const data = await jiraClient.refreshColumns(jql, userToken);
    const formattedIssues = jiraClient.formatIssues(data.issues, false);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [API] /api/refresh-columns - Success in ${duration}ms - ${formattedIssues.length} issues`);
    
    res.json({
      success: true,
      total: data.total,
      issues: formattedIssues,
      message: 'Columns refreshed successfully'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API] /api/refresh-columns - Failed after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/issues', async (req, res) => {
  try {
    const jql = req.query.jql; // Optional custom JQL query
    const data = await jiraClient.refreshColumns(jql);
    const formattedIssues = jiraClient.formatIssues(data.issues, false);
    
    res.json({
      success: true,
      total: data.total,
      issues: formattedIssues
    });
  } catch (error) {
    console.error('Error fetching issues:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/issue/:key', async (req, res) => {
  try {
    const issueKey = req.params.key;
    const issue = await jiraClient.getIssueDetails(issueKey);
    
    res.json({
      success: true,
      issue: issue
    });
  } catch (error) {
    console.error('Error fetching issue details:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/table-config', (req, res) => {
  try {
    const tableConfig = jiraClient.getTableConfig();
    res.json({
      success: true,
      config: tableConfig
    });
  } catch (error) {
    console.error('Error fetching table config:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/backend-config', (req, res) => {
  try {
    const backendConfig = jiraClient.getBackendConfig();
    res.json({
      success: true,
      config: backendConfig
    });
  } catch (error) {
    console.error('Error fetching backend config:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/save-column-config', express.json(), (req, res) => {
  try {
    const { userColumns } = req.body;
    
    if (!Array.isArray(userColumns)) {
      return res.status(400).json({
        success: false,
        error: 'userColumns must be an array'
      });
    }
    
    const success = jiraClient.saveUserConfig(userColumns);
    
    if (success) {
      res.json({
        success: true,
        message: 'Column configuration saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save column configuration'
      });
    }
  } catch (error) {
    console.error('Error saving column config:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/test-token', express.json(), async (req, res) => {
  const startTime = Date.now();
  try {
    const { token, email } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    console.log(`🔐 [API] /api/test-token - Testing token authentication...`);
    
    // Test the token with PAT endpoint
    const axios = require('axios');
    const ConfigManager = require('./config');
    const configManager = new ConfigManager();
    const jiraConfig = configManager.getJiraConfig();
    const baseUrl = jiraConfig.baseUrl || 'https://jira.nutanix.com';
    const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    
    try {
      const testResponse = await axios.get(
        `${cleanBaseUrl}/rest/pat/latest/tokens`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token.trim()}`
          },
          timeout: 10000
        }
      );
      
      if (testResponse.status === 200 && Array.isArray(testResponse.data)) {
        console.log(`✅ [API] /api/test-token - Token is valid, found ${testResponse.data.length} tokens`);
        res.json({
          success: true,
          message: 'Token is valid',
          tokenCount: testResponse.data.length
        });
      } else {
        throw new Error('Invalid response from token endpoint');
      }
    } catch (error) {
      console.error('❌ [API] /api/test-token - Token test failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please check your Bearer token (PAT).'
        });
      }
      
      throw error;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API] /api/test-token - Failed after ${duration}ms:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test token'
    });
  }
});

// Fetch Confluence summary for a single page
app.get('/api/confluence/summary', async (req, res) => {
  const startTime = Date.now();
  try {
    const { url } = req.query;
    const userToken = req.headers['x-confluence-token'] || req.headers['x-jira-token'];
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Confluence URL is required'
      });
    }
    
    console.log(`📄 [API] /api/confluence/summary - Fetching summary for: ${url}`);
    
    const result = await confluenceClient.getSummary(url, userToken);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ [API] /api/confluence/summary - Success in ${duration}ms`);
    } else {
      console.log(`⚠️ [API] /api/confluence/summary - Failed in ${duration}ms: ${result.error}`);
    }
    
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API] /api/confluence/summary - Failed after ${duration}ms:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Confluence summary'
    });
  }
});

// Batch fetch Confluence summaries
app.post('/api/confluence/summaries', express.json(), async (req, res) => {
  const startTime = Date.now();
  try {
    const { urls } = req.body;
    const userToken = req.headers['x-confluence-token'] || req.headers['x-jira-token'];
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }
    
    console.log(`📄 [API] /api/confluence/summaries - Fetching ${urls.length} summaries`);
    
    const results = await confluenceClient.getSummaries(urls, userToken);
    const duration = Date.now() - startTime;
    
    console.log(`✅ [API] /api/confluence/summaries - Completed in ${duration}ms`);
    
    res.json({
      success: true,
      summaries: results
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [API] /api/confluence/summaries - Failed after ${duration}ms:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Confluence summaries'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`🚀 NDB Weekly Status app running at http://localhost:${port}`);
  console.log(`📊 Jira integration ready`);
});
