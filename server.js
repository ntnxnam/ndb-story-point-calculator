const express = require('express');
const cors = require('cors');
const JiraClient = require('./jira-client');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Jira client
let jiraClient;
try {
  jiraClient = new JiraClient();
} catch (error) {
  console.error('Failed to initialize Jira client:', error.message);
  process.exit(1);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/issues', async (req, res) => {
  try {
    const jql = req.query.jql; // Optional custom JQL query
    const data = await jiraClient.searchIssues(jql);
    const formattedIssues = jiraClient.formatIssues(data.issues);
    
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
