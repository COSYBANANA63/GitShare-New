const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = 'Ov23liXAudE8sQqd8pjF';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET; // Set this in Render environment variables

// Token exchange endpoint
app.post('/exchange-code', async (req, res) => {
    try {
        const { code, client_id, redirect_uri } = req.body;

        // Verify client ID matches
        if (client_id !== GITHUB_CLIENT_ID) {
            return res.status(401).json({ error: 'Invalid client ID' });
        }

        // Exchange code for access token
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
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange code for token' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 