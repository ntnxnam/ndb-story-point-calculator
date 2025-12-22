/**
 * Test suite for data rendering - Assignee, Components, Priority
 * Tests that standard Jira fields are correctly extracted and displayed
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.JIRA_BASE_URL || 'https://jira.nutanix.com';
const PORT = process.env.PORT || 7842;
const API_BASE = `http://localhost:${PORT}`;

// Test token - should be set in .env or passed as argument
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_TOKEN) {
  console.error('❌ JIRA_API_TOKEN not found in .env');
  process.exit(1);
}

// Test issue key - use a known issue for testing
const TEST_ISSUE_KEY = process.argv[2] || 'FEAT-16361';

console.log('🧪 Testing Data Rendering - Assignee, Components, Priority\n');
console.log(`📋 Test Issue: ${TEST_ISSUE_KEY}`);
console.log(`🔗 API Base: ${API_BASE}\n`);

async function testFeatureMetrics() {
  try {
    console.log('📊 Test 1: Fetching feature metrics...');
    const response = await axios.get(`${API_BASE}/api/feature-metrics/${TEST_ISSUE_KEY}`, {
      headers: {
        'x-jira-token': JIRA_TOKEN
      },
      timeout: 30000
    });

    if (response.data.success) {
      console.log('✅ Feature metrics fetched successfully\n');
      
      const metrics = response.data.metrics;
      
      // Test timeline data
      console.log('📋 Test 2: Checking timeline data...');
      if (metrics.timeline && metrics.timeline.length > 0) {
        console.log(`✅ Timeline has ${metrics.timeline.length} items\n`);
        
        // Check first few timeline items
        const sampleItems = metrics.timeline.slice(0, 5);
        console.log('📝 Sample timeline items:');
        sampleItems.forEach((item, idx) => {
          console.log(`\n  Item ${idx + 1}:`);
          console.log(`    Key: ${item.key}`);
          console.log(`    Summary: ${item.summary?.substring(0, 50) || 'N/A'}...`);
          console.log(`    Status: ${item.status || 'N/A'}`);
          console.log(`    Assignee: ${item.assignee || 'N/A'} ${item.assignee ? '✅' : '❌'}`);
          console.log(`    Story Points: ${item.storyPoints || 0} ${item.storyPoints > 0 ? '✅' : '❌'}`);
          console.log(`    Due Date: ${item.dueDate || 'N/A'}`);
        });
        
        // Count issues with missing data
        const missingAssignee = metrics.timeline.filter(item => !item.assignee || item.assignee === 'Unassigned').length;
        const missingSP = metrics.timeline.filter(item => !item.storyPoints || item.storyPoints === 0).length;
        const missingSummary = metrics.timeline.filter(item => !item.summary || item.summary === 'N/A').length;
        
        console.log(`\n📊 Data Completeness:`);
        console.log(`  Total items: ${metrics.timeline.length}`);
        console.log(`  Missing assignee: ${missingAssignee} (${Math.round(missingAssignee/metrics.timeline.length*100)}%)`);
        console.log(`  Missing story points: ${missingSP} (${Math.round(missingSP/metrics.timeline.length*100)}%)`);
        console.log(`  Missing summary: ${missingSummary} (${Math.round(missingSummary/metrics.timeline.length*100)}%)`);
      } else {
        console.log('❌ Timeline is empty\n');
      }
      
      // Test kick-off epic tasks
      console.log('\n📅 Test 3: Checking kick-off epic tasks...');
      if (metrics.kickOffEpicDueDates && metrics.kickOffEpicDueDates.tasks) {
        const tasks = metrics.kickOffEpicDueDates.tasks;
        console.log(`✅ Found ${tasks.length} kick-off epic tasks\n`);
        
        if (tasks.length > 0) {
          const sampleTasks = tasks.slice(0, 3);
          console.log('📝 Sample kick-off epic tasks:');
          sampleTasks.forEach((task, idx) => {
            console.log(`\n  Task ${idx + 1}:`);
            console.log(`    Key: ${task.key}`);
            console.log(`    Summary: ${task.summary?.substring(0, 50) || 'N/A'}...`);
            console.log(`    Status: ${task.status || 'N/A'}`);
            console.log(`    Assignee: ${task.assignee || 'N/A'} ${task.assignee ? '✅' : '❌'}`);
            console.log(`    Due Date: ${task.dueDate || 'N/A'}`);
          });
        }
      } else {
        console.log('⚠️ No kick-off epic tasks found\n');
      }
      
    } else {
      console.log('❌ Failed to fetch feature metrics:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testDirectJiraAPI() {
  try {
    console.log('\n🔍 Test 4: Direct Jira API call to verify field structure...');
    
    const response = await axios.post(
      `${BASE_URL}/rest/api/2/search`,
      {
        jql: `key = ${TEST_ISSUE_KEY}`,
        fields: ['key', 'summary', 'status', 'assignee', 'components', 'priority', 'customfield_10002', 'duedate', 'created', 'resolutiondate'],
        maxResults: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${JIRA_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (response.data.issues && response.data.issues.length > 0) {
      const issue = response.data.issues[0];
      console.log('✅ Direct API call successful\n');
      
      console.log('📋 Raw issue structure:');
      console.log(`  Key: ${issue.key}`);
      console.log(`  Has fields: ${!!issue.fields}`);
      
      if (issue.fields) {
        console.log(`\n  Field values:`);
        console.log(`    summary: ${issue.fields.summary ? '✅' : '❌'} ${issue.fields.summary || 'N/A'}`);
        console.log(`    status: ${issue.fields.status ? '✅' : '❌'} ${issue.fields.status?.name || 'N/A'}`);
        console.log(`    assignee: ${issue.fields.assignee ? '✅' : '❌'} ${issue.fields.assignee?.displayName || issue.fields.assignee || 'N/A'}`);
        console.log(`    components: ${issue.fields.components ? '✅' : '❌'} ${issue.fields.components?.length || 0} component(s)`);
        if (issue.fields.components && issue.fields.components.length > 0) {
          issue.fields.components.forEach((comp, idx) => {
            console.log(`      - ${comp.name || comp.id || 'Unknown'}`);
          });
        }
        console.log(`    priority: ${issue.fields.priority ? '✅' : '❌'} ${issue.fields.priority?.name || issue.fields.priority || 'N/A'}`);
        console.log(`    customfield_10002 (SP): ${issue.fields.customfield_10002 ? '✅' : '❌'} ${issue.fields.customfield_10002 || 'N/A'}`);
        console.log(`    duedate: ${issue.fields.duedate ? '✅' : '❌'} ${issue.fields.duedate || 'N/A'}`);
        console.log(`    created: ${issue.fields.created ? '✅' : '❌'} ${issue.fields.created || 'N/A'}`);
        console.log(`    resolutiondate: ${issue.fields.resolutiondate ? '✅' : '❌'} ${issue.fields.resolutiondate || 'N/A'}`);
        
        console.log(`\n  All available fields: ${Object.keys(issue.fields).length} fields`);
        console.log(`  Sample fields: ${Object.keys(issue.fields).slice(0, 10).join(', ')}...`);
      }
    } else {
      console.log('❌ No issues returned from direct API call');
    }
  } catch (error) {
    console.error('❌ Direct API test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testRelatedIssues() {
  try {
    console.log('\n🔍 Test 5: Fetching related issues to check field extraction...');
    
    const baseJQL = `(
      key = ${TEST_ISSUE_KEY} OR
      "Parent Link" = ${TEST_ISSUE_KEY} OR
      "FEAT ID" ~ ${TEST_ISSUE_KEY} OR
      "FEAT Number" = ${TEST_ISSUE_KEY} OR
      parent = ${TEST_ISSUE_KEY} OR
      "Epic Link" = ${TEST_ISSUE_KEY}
    )`;
    
    const response = await axios.post(
      `${BASE_URL}/rest/api/2/search`,
      {
        jql: baseJQL,
        fields: ['key', 'summary', 'status', 'assignee', 'components', 'priority', 'customfield_10002', 'duedate', 'created', 'resolutiondate', 'issuetype'],
        maxResults: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${JIRA_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (response.data.issues && response.data.issues.length > 0) {
      console.log(`✅ Found ${response.data.issues.length} related issues\n`);
      
      const issues = response.data.issues;
      let hasAssignee = 0;
      let hasComponents = 0;
      let hasPriority = 0;
      let hasStoryPoints = 0;
      
      issues.forEach((issue, idx) => {
        if (issue.fields?.assignee) hasAssignee++;
        if (issue.fields?.components && issue.fields.components.length > 0) hasComponents++;
        if (issue.fields?.priority) hasPriority++;
        if (issue.fields?.customfield_10002) hasStoryPoints++;
        
        if (idx < 3) {
          console.log(`\n  Issue ${idx + 1}: ${issue.key}`);
          console.log(`    Assignee: ${issue.fields?.assignee?.displayName || 'N/A'} ${issue.fields?.assignee ? '✅' : '❌'}`);
          console.log(`    Components: ${issue.fields?.components?.length || 0} ${issue.fields?.components?.length > 0 ? '✅' : '❌'}`);
          console.log(`    Priority: ${issue.fields?.priority?.name || 'N/A'} ${issue.fields?.priority ? '✅' : '❌'}`);
          console.log(`    Story Points: ${issue.fields?.customfield_10002 || 0} ${issue.fields?.customfield_10002 ? '✅' : '❌'}`);
        }
      });
      
      console.log(`\n📊 Field Availability:`);
      console.log(`  Total issues: ${issues.length}`);
      console.log(`  Has assignee: ${hasAssignee} (${Math.round(hasAssignee/issues.length*100)}%)`);
      console.log(`  Has components: ${hasComponents} (${Math.round(hasComponents/issues.length*100)}%)`);
      console.log(`  Has priority: ${hasPriority} (${Math.round(hasPriority/issues.length*100)}%)`);
      console.log(`  Has story points: ${hasStoryPoints} (${Math.round(hasStoryPoints/issues.length*100)}%)`);
    } else {
      console.log('❌ No related issues found');
    }
  } catch (error) {
    console.error('❌ Related issues test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run all tests
async function runTests() {
  await testFeatureMetrics();
  await testDirectJiraAPI();
  await testRelatedIssues();
  
  console.log('\n✅ All tests completed\n');
}

runTests().catch(console.error);

