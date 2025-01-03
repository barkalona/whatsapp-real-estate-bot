const OpenAI = require('openai');
const NegotiationState = require('./NegotiationState');
const ConversationContext = require('./ConversationContext');
const ContactHandler = require('./ContactHandler');
const twilio = require('twilio');
const { MessagingResponse } = require('twilio').twiml;
const path = require('path');
const fs = require('fs').promises;

class PropertyBot {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.imageBaseUrl = process.env.IMAGE_BASE_URL || 'https://your-ngrok-url/images';

        // Define image categories and their paths with keywords for natural language matching
        this.imageCategories = {
            exterior: [
                { path: '/images/photos/exterior/exterior_view1.jpg', caption: 'Full view of the complex', keywords: ['front', 'complex', 'building', 'outside'] },
                { path: '/images/photos/exterior/exterior_view2.jpg', caption: 'Another perspective of the building', keywords: ['outside', 'exterior'] }
            ],
            interior: [
                { path: '/images/photos/interior/Lobby.JPG', caption: 'Welcome to the elegant lobby', keywords: ['lobby', 'entrance', 'hall'] },
                { path: '/images/photos/interior/interior.JPG', caption: 'Modern interior', keywords: ['inside', 'living'] },
                { path: '/images/photos/interior/Bedroom.JPG', caption: 'Comfortable bedroom', keywords: ['bed', 'bedroom', 'sleep'] }
            ],
            amenities: [
                { path: '/images/photos/amenities/Kitchen.JPG', caption: 'Modern kitchen', keywords: ['kitchen', 'cooking'] },
                { path: '/images/photos/amenities/Shower.JPG', caption: 'Well-appointed washroom', keywords: ['bathroom', 'shower', 'washroom'] }
            ],
            layouts: [
                { path: '/images/layouts/complex_ground.jpg', caption: 'Ground floor layout', keywords: ['ground', 'floor', 'plan'] },
                { path: '/images/layouts/complex_first.jpg', caption: 'First floor layout', keywords: ['first', 'floor', 'plan'] },
                { path: '/images/layouts/complex_penthouse.jpg', caption: 'Penthouse layout', keywords: ['penthouse', 'top', 'floor'] },
                { path: '/images/layouts/crooky.jpg', caption: 'Crooky View', keywords: ['crooky'] }
            ]
        };
    }

    getRelativePath(absolutePath) {
        const relativePath = path.relative(path.join(__dirname, '..'), absolutePath)
            .split(path.sep)
            .slice(1)
            .join('/');
        return relativePath;
    }

    static async handleIncomingMessage(message) {
        try {
            console.log('Processing message:', message.Body);
            
            const bot = new PropertyBot();
            const context = new ConversationContext();
            const negotiation = new NegotiationState();
            const contact = new ContactHandler();

            const messageBody = message.Body?.toLowerCase() || '';
            
            // Enhanced message handling
            if (bot.isMenuRequest(messageBody)) {
                await bot.sendCategoryMenu(message.From);
            } else if (bot.isSpecificCategoryRequest(messageBody)) {
                await bot.handleSpecificCategoryRequest(message);
            } else if (bot.isSpecificFeatureRequest(messageBody)) {
                await bot.handleSpecificFeatureRequest(message);
            } else if (messageBody.includes('photo') || messageBody.includes('picture') || 
                      messageBody.includes('image') || messageBody.includes('layout')) {
                await bot.sendCategoryMenu(message.From);
            } else {
                await bot.twilioClient.messages.create({
                    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                    to: message.From,
                    body: `Thank you for your message. Would you like to see our property photos? Just say what you'd like to see:
• Exterior views
• Interior spaces
• Amenities
• Floor Plans
Or ask for specific features like "show kitchen" or "bedroom photos"!`
                });
            }

            return true;
        } catch (error) {
            console.error('Error in handleIncomingMessage:', error);
            throw error;
        }
    }

    isMenuRequest(text) {
        const menuTerms = ['menu', 'options', 'what can i see', 'what do you have'];
        return menuTerms.some(term => text.includes(term));
    }

    isSpecificCategoryRequest(text) {
        const categories = {
            exterior: ['exterior', 'outside', 'building'],
            interior: ['interior', 'inside', 'indoors'],
            amenities: ['amenities', 'facilities', 'features'],
            layouts: ['layout', 'plan', 'plans', 'crooky']
        };

        return Object.keys(categories).some(category => 
            categories[category].some(keyword => text.includes(keyword))
        );
    }

    isSpecificFeatureRequest(text) {
        const features = ['kitchen', 'bedroom', 'bathroom', 'shower', 'lobby', 'dining', 'crooky'];
        return features.some(feature => text.includes(feature));
    }

    async sendCategoryMenu(to) {
        const menuMessage = `What would you like to see? Choose a category:

• Exterior Views - See the building from outside
• Interior Spaces - Explore the rooms inside
• Amenities - Check out the facilities
• Floor Plans - View property layouts

You can also ask for specific features like "show me the kitchen" or "bedroom photos"!`;

        await this.twilioClient.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: to,
            body: menuMessage
        });
    }

    async handleSpecificCategoryRequest(message) {
        const text = message.Body.toLowerCase();
        let category;
        
        if (text.includes('exterior') || text.includes('outside')) {
            category = 'exterior';
        } else if (text.includes('interior') || text.includes('inside')) {
            category = 'interior';
        } else if (text.includes('amenities') || text.includes('facilities')) {
            category = 'amenities';
        } else if (text.includes('layout') || text.includes('plan') || text.includes('crooky')) {
            category = 'layouts';
        }

        if (category) {
            await this.sendCategoryPhotos(message.From, category);
        }
    }

    async handleSpecificFeatureRequest(message) {
        const text = message.Body.toLowerCase();
        let matchingPhotos = [];

        // Search through all categories for matching photos
        Object.values(this.imageCategories).forEach(category => {
            category.forEach(photo => {
                if (photo.keywords.some(keyword => text.includes(keyword))) {
                    matchingPhotos.push(photo);
                }
            });
        });

        if (matchingPhotos.length > 0) {
            await this.twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: message.From,
                body: `Here are the photos you requested...`
            });

            for (const photo of matchingPhotos) {
                await this.sendSingleImage(message.From, photo.path, photo.caption);
            }

            await this.twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: message.From,
                body: "Would you like to see other areas? Just ask!"
            });
        }
    }

    async sendCategoryPhotos(to, category) {
        try {
            const photos = this.imageCategories[category];
            
            await this.twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: to,
                body: `Here are the ${category} photos...`
            });

            for (const photo of photos) {
                await this.sendSingleImage(to, photo.path, photo.caption);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            await this.twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: to,
                body: "Would you like to see another category? Just ask!"
            });

        } catch (error) {
            console.error('Error in sendCategoryPhotos:', error);
            throw error;
        }
    }

    async sendSingleImage(to, imagePath, caption) {
        const imageUrl = `${this.imageBaseUrl}${imagePath}`;
        console.log('Sending image:', imageUrl);

        try {
            const fetch = await import('node-fetch');
            const response = await fetch.default(imageUrl);
            
            if (!response.ok) {
                throw new Error(`Image not accessible: ${imagePath}`);
            }

            const twilioResponse = await this.twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: to,
                mediaUrl: [imageUrl],
                body: caption
            });

            await new Promise(resolve => setTimeout(resolve, 2000));
            const messageCheck = await this.twilioClient.messages(twilioResponse.sid).fetch();
            console.log(`Status for ${imagePath}:`, messageCheck.status);
            
            return messageCheck.status;
        } catch (error) {
            console.error('Error sending image:', error);
            throw error;
        }
    }

    // Keep backward compatibility methods
    async sendLayouts(phone) {
        try {
            const message = {
                From: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                To: `whatsapp:${phone}`,
                Body: 'show layout'
            };
            await this.handleImageRequest(message);
        } catch (error) {
            console.error('Error sending layouts:', error);
            throw error;
        }
    }

    async sendPhotos(phone) {
        try {
            const message = {
                From: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                To: `whatsapp:${phone}`,
                Body: 'show photos'
            };
            await this.handleImageRequest(message);
        } catch (error) {
            console.error('Error sending photos:', error);
            throw error;
        }
    }
}

module.exports = PropertyBot;