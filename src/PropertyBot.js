const OpenAI = require('openai');
const NegotiationState = require('./NegotiationState');
const ConversationContext = require('./ConversationContext');
const ContactHandler = require('./ContactHandler');

class PropertyBot {
    constructor(twilioClient, openaiClient) {
        this.client = twilioClient;
        this.openai = openaiClient;
        this.negotiationState = new NegotiationState();
        this.conversationContext = new ConversationContext();
        
        // Base URL setup
        const ngrokUrl = process.env.NGROK_URL;
        this.baseUrl = ngrokUrl || process.env.PUBLIC_URL || 'http://localhost:3000';
        
        // Property Knowledge Base
        this.knowledgeBase = {
            general: `
It's a complex of three unfurnished villas in Al Ansab 3, next to the small roundabout. 
The land area is 950 square meters while the built-up area for the full complex is 1040 square meters. 
The asking price is OMR 550,000, negotiable. The complex has recently been renovated and is suitable for three families or staff accommodation.
`,
            villas: {
                one: `
Villa One:
- Built-up area: 424 sqm
- Ground floor: 183 sqm (lobby, family area, men's and women's majlis, 2 toilets, dining, kitchen)
- First floor: 181 sqm (sitting area, 2 bedrooms, master bedroom with en-suite and wardrobes)
- Penthouse: 60 sqm (storage, laundry, maid's room with en-suite).
`,
                two: `
Villa Two:
- Built-up area: 308 sqm
- Ground floor: 133 sqm (lobby, family area, majlis, toilet, dining, kitchen)
- First floor: 126 sqm (master bedroom, 2 bedrooms, sitting area, all en-suite with wardrobes)
- Penthouse: 48 sqm (hall, maid's room with en-suite, laundry room).
`,
                three: `
Villa Three:
- Built-up area: 308 sqm
- Ground floor: 133 sqm (lobby, family area, majlis, toilet, dining, kitchen)
- First floor: 126 sqm (master bedroom, 2 bedrooms, sitting area, all en-suite with wardrobes)
- Penthouse: 48 sqm (hall, maid's room with en-suite, laundry room).
`
            },
            location: 'https://maps.app.goo.gl/SC6Ko1GifWqkSE6W7'
        };

        // Available photos
        this.photos = {
            general: [
                'exterior_front.jpg',
                'aerial_view.jpg',
                'entrance_gate.jpg'
            ],
            interior: [
                'living_room.jpg',
                'kitchen.jpg',
                'master_bedroom.jpg',
                'bathroom.jpg'
            ],
            layouts: [
                'ground_floor.jpg',
                'first_floor.jpg',
                'penthouse.jpg'
            ]
        };
    }
