# NDB Weekly Status

A simple web application that connects to Jira and displays issue data based on configurable queries. Perfect for weekly status reports and project dashboards.

## Features

- 🔗 **Jira Integration**: Connect to any Jira instance using API tokens
- 📊 **Custom Queries**: Use JQL (Jira Query Language) to filter issues
- 🎨 **Modern UI**: Clean, responsive interface with real-time data
- ⚡ **Fast & Lightweight**: No Docker, no complications - just Node.js
- 🔄 **Auto-refresh**: Automatically updates every 5 minutes
- 📱 **Mobile Friendly**: Responsive design works on all devices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Jira Connection

#### Option A: Interactive Setup (Recommended)
Run the interactive setup script:

```bash
npm run setup
```

This will guide you through entering:
- Your Jira URL
- Your email address
- Your API token
- Your JQL query (defaults to `filter = 'NDB-StatusUpdates'`)
- Server port (defaults to 3000)

#### Option B: Manual Configuration
Copy the example config and create your private key file:

```bash
cp config.example.json config.json
cp jira-key-private.example.txt jira-key-private.txt
```

Then edit the files with your Jira details:

**1. Edit `config.json`:**
```json
{
  "jira": {
    "baseUrl": "https://your-domain.atlassian.net",
    "username": "your-email@example.com",
    "apiToken": "your-api-token-here",
    "jql": "filter = 'NDB-StatusUpdates'"
  },
  "server": {
    "port": 3000
  }
}
```

**2. Edit `jira-key-private.txt`:**
```
YOUR_ACTUAL_JIRA_API_TOKEN_HERE
```

**⚠️ Important**: Both `config.json` and `jira-key-private.txt` files are ignored by Git to protect your credentials.

#### Option C: Environment Variables
Create a `.env` file in the project root:

```bash
cp env.example .env
```

Then edit `.env` with your Jira details:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token-here
JIRA_JQL=filter = 'NDB-StatusUpdates'
PORT=3000
```

### 3. Get Your Jira API Token

1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "NDB Weekly Status")
4. Copy the generated token
5. Use this token as your `JIRA_API_TOKEN`

### 4. Start the Application

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### 5. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Default Query
The application will use the JQL query specified in your configuration to fetch issues.

### Custom Queries
You can enter custom JQL queries in the web interface to filter issues differently. Some examples:

- **All issues assigned to you**: `assignee = currentUser()`
- **Issues updated this week**: `updated >= -7d`
- **High priority issues**: `priority = High`
- **Issues in specific sprint**: `sprint in openSprints()`

### API Endpoints

- `GET /` - Main dashboard
- `GET /api/issues?jql=...` - Fetch issues (optional custom JQL)
- `GET /api/issue/:key` - Get specific issue details
- `GET /api/health` - Health check

## Configuration Options

### Jira Settings

| Setting | Description | Example |
|---------|-------------|---------|
| `baseUrl` | Your Jira instance URL | `https://company.atlassian.net` |
| `username` | Your Jira email address | `user@company.com` |
| `apiToken` | Your Jira API token | `ATATT3xFfGF0...` |
| `jql` | Default JQL query | `project = 'PROJ' AND status != Done` |

### Server Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `port` | Server port | `3000` |

## Troubleshooting

### Common Issues

**"Configuration not found"**
- Make sure you have either a `.env` file or `config.json` file
- Check that your configuration file is valid JSON

**"Failed to fetch Jira data"**
- Verify your Jira URL is correct
- Check that your API token is valid
- Ensure your JQL query is syntactically correct
- Make sure you have permission to access the specified project

**"Authentication failed"**
- Double-check your username and API token
- Ensure your API token hasn't expired
- Verify you're using the correct email address

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages:

```bash
NODE_ENV=development npm start
```

## Development

### Project Structure

```
ndb-weekly-status/
├── server.js                      # Express server
├── jira-client.js                 # Jira API client
├── setup-config.js                # Interactive setup script
├── config.example.json            # Example configuration (safe to commit)
├── config.json                    # Your configuration (ignored by Git)
├── jira-key-private.example.txt   # Example API key file (safe to commit)
├── jira-key-private.txt           # Your API key (ignored by Git)
├── .env                           # Environment variables (ignored by Git)
├── package.json                   # Dependencies
├── public/
│   └── index.html                 # Web interface
└── README.md                      # This file
```

### Adding Features

The codebase is intentionally simple and modular:

- **Backend**: Add new routes in `server.js`
- **Jira Integration**: Extend `jira-client.js`
- **Frontend**: Modify `public/index.html`

## License

MIT License - feel free to use this project for your team's weekly status reports!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
