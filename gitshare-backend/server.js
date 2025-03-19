const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Request body:', req.body);
    next();
});

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Log environment variables (without exposing secrets)
console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    GITHUB_CLIENT_ID: GITHUB_CLIENT_ID ? 'Set' : 'Not set',
    GITHUB_CLIENT_SECRET: GITHUB_CLIENT_SECRET ? 'Set' : 'Not set'
});

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
        console.log('Received token exchange request');
        const { code, client_id, redirect_uri } = req.body;
        console.log('Request data:', { code, client_id, redirect_uri });

        // Verify client ID matches
        if (client_id !== GITHUB_CLIENT_ID) {
            console.error('Client ID mismatch:', { received: client_id, expected: GITHUB_CLIENT_ID });
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
            console.error('GitHub API error:', { status: response.status, body: errorText });
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Token exchange successful');
        res.json(data);
    } catch (error) {
        console.error('Token exchange error:', error);
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
    console.log(`Server is running on port ${server.address().port}`);
}); 