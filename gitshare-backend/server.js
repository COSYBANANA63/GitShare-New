const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Enhanced debug logging middleware
app.use((req, res, next) => {
    console.log('\n=== New Request ===');
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('==================\n');
    next();
});

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Log environment variables (without exposing secrets)
console.log('\n=== Server Configuration ===');
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    GITHUB_CLIENT_ID: GITHUB_CLIENT_ID ? 'Set' : 'Not set',
    GITHUB_CLIENT_SECRET: GITHUB_CLIENT_SECRET ? 'Set' : 'Not set'
});
console.log('===========================\n');

// Root route handler
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        endpoints: {
            health: '/health',
            exchange: '/exchange-code'
        },
        config: {
            clientId: GITHUB_CLIENT_ID ? 'Set' : 'Not set',
            clientSecret: GITHUB_CLIENT_SECRET ? 'Set' : 'Not set'
        }
    });
});

// Token exchange endpoint
app.post('/exchange-code', async (req, res) => {
    try {
        console.log('\n=== Token Exchange Request ===');
        console.log('Received token exchange request');
        const { code, client_id, redirect_uri } = req.body;
        console.log('Request data:', { 
            code: code ? 'Present' : 'Missing',
            client_id: client_id ? 'Present' : 'Missing',
            redirect_uri: redirect_uri ? 'Present' : 'Missing'
        });

        if (!code || !client_id || !redirect_uri) {
            console.error('Missing required parameters');
            return res.status(400).json({ 
                error: 'Missing required parameters',
                received: { code: !!code, client_id: !!client_id, redirect_uri: !!redirect_uri }
            });
        }

        // Verify client ID matches
        if (client_id !== GITHUB_CLIENT_ID) {
            console.error('Client ID mismatch:', { 
                received: client_id, 
                expected: GITHUB_CLIENT_ID 
            });
            return res.status(401).json({ error: 'Invalid client ID' });
        }

        // Exchange code for access token
        console.log('Exchanging code for token with GitHub...');
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: redirect_uri
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GitHub API error:', { 
                status: response.status, 
                body: errorText 
            });
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Token exchange successful');
        console.log('===========================\n');
        res.json(data);
    } catch (error) {
        console.error('Token exchange error:', error);
        console.log('===========================\n');
        res.status(500).json({ error: 'Failed to exchange code for token' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        config: {
            clientId: GITHUB_CLIENT_ID ? 'Set' : 'Not set',
            clientSecret: GITHUB_CLIENT_SECRET ? 'Set' : 'Not set'
        }
    });
});

// Start server
const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`\n=== Server Started ===`);
    console.log(`Server is running on port ${server.address().port}`);
    console.log(`=====================\n`);
}); 