require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const OpenAI = require('openai');
const path = require('path');

// Import our modular classes
const PropertyBot = require('./src/PropertyBot');
const NegotiationState = require('./src/NegotiationState');
const ConversationContext = require('./src/ConversationContext');
const ContactHandler = require('./src/ContactHandler');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Enhanced CORS and logging middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Enhanced static file serving with logging
app.use('/images', (req, res, next) => {
    console.log(`[DEBUG] Serving static file request:`, {
        url: req.url,
        method: req.method,
        headers: req.headers
    });
    next();
}, express.static(path.join(__dirname, 'images'), {
    maxAge: '1h',
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg')) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create PropertyBot instance
const propertyBot = new PropertyBot(client, openai);

// Health check endpoint
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        status: 'OK',
        timestamp: Date.now()
    };
    res.status(200).json(healthcheck);
});

app.post('/webhook', async (req, res) => {
    try {
        const incomingMsg = req.body.Body;
        const sender = req.body.From;

        const response = await propertyBot.handleMessage(incomingMsg, sender);

        if (!response.text && !response.media) {
            res.status(200).send('OK');
            return;
        }

        if (response.media) {
            await client.messages.create({
                from: 'whatsapp:+14155238886',
                to: sender,
                body: response.text,
                mediaUrl: response.media,
            });
        } else {
            await client.messages.create({
                from: 'whatsapp:+14155238886',
                to: sender,
                body: response.text,
            });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Environment validation
function validateEnvironment() {
    const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Start server with validation
validateEnvironment();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});