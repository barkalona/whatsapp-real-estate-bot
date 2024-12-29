const OpenAI = require('openai');
const NegotiationState = require('./NegotiationState');
const ConversationContext = require('./ConversationContext');
const ContactHandler = require('./ContactHandler');

class PropertyBot {
    constructor() {
        this.negotiationState = new NegotiationState();
        this.conversationContext = new ConversationContext();
        
        // OpenAI client setup
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
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
    }

    async logDebug(message, data) {
        console.log(`[DEBUG] ${message}:`, JSON.stringify(data, null, 2));
    }

    detectLanguage(message) {
        const arabicPattern = /[\u0600-\u06FF]/;
        return arabicPattern.test(message) ? 'arabic' : 'english';
    }

    async handleMessage(message, sender) {
        try {
            await this.logDebug('Received message', { message, sender });
            
            // Get or initialize user context
            const context = this.conversationContext.getUserContext(sender);
            
            // Detect language if not set
            if (!context.preferences.language) {
                context.preferences.language = this.detectLanguage(message);
            }
            const language = context.preferences.language;
            
            // Add message to conversation history
            this.conversationContext.addToHistory(sender, message, true);
            
            // Check for specific commands or keywords
            const lowerMessage = message.toLowerCase();
            
            // Handle layout requests
            if (lowerMessage.includes('layout') || lowerMessage.includes('floor') || 
                lowerMessage.includes('مخطط') || lowerMessage.includes('طابق')) {
                return await this.sendLayouts(null, language, sender);
            }
            
            // Handle photo requests
            if (lowerMessage.includes('photo') || lowerMessage.includes('picture') || 
                lowerMessage.includes('صور') || lowerMessage.includes('صورة')) {
                return await this.sendPhotos(null, language, sender);
            }
            
            // Handle contact information
            if (ContactHandler.isContactInfo(message)) {
                const contactInfo = ContactHandler.extractContactInfo(message);
                if (contactInfo.name || contactInfo.phone) {
                    // Store contact info in context
                    this.conversationContext.updateContext(sender, {
                        preferences: {
                            ...context.preferences,
                            contactName: contactInfo.name,
                            contactPhone: contactInfo.phone
                        }
                    });
                }
            }
            
            // Use ChatGPT for response
            const response = await this.useChatGPT(message, sender);
            
            // Add bot's response to conversation history
            this.conversationContext.addToHistory(sender, response, false);
            
            // Get next recommendation if price negotiation is not complete
            const suggestion = !context.priceNegotiation.completed ? 
                             this.conversationContext.suggestNextStep(sender, language) : 
                             null;
            
            // Combine response with suggestion if available
            const finalResponse = suggestion ? 
                `${response}\n\n${suggestion}` : 
                response;
                
            return { text: finalResponse };
            
        } catch (error) {
            console.error('Error in handleMessage:', error);
            return {
                text: language === 'arabic'
                    ? 'عذراً، حدث خطأ في معالجة رسالتك. هل يمكنك المحاولة مرة أخرى؟'
                    : 'Sorry, there was an error processing your message. Could you try again?'
            };
        }
    }

    async useChatGPT(message, sender) {
        try {
            const context = this.conversationContext.getUserContext(sender);
            const language = context.preferences.language;

            // Check for price agreement messages
            if (this.negotiationState.isNegotiationComplete && !context.priceNegotiation.completed) {
                this.conversationContext.updatePriceNegotiation(
                    sender, 
                    'completed', 
                    this.negotiationState.agreedPrice
                );
            }

            // Extract numbers for price negotiation
            const numbers = message.match(/\d+/g);
            const possibleOffer = numbers ? parseInt(numbers.join('')) : null;

            // Handle price negotiation if not completed
            if (possibleOffer && !context.priceNegotiation.completed) {
                const result = this.negotiationState.handleOffer(possibleOffer);
                if (result.complete) {
                    this.conversationContext.updatePriceNegotiation(
                        sender, 
                        'completed', 
                        result.price
                    );
                }
            }

            // Prepare ChatGPT prompt
            const prompt = `
You are a real estate agent in Oman, communicating in ${language === 'arabic' ? 'Omani Arabic dialect' : 'English'}.
You are selling a luxurious three-villa complex in Al Ansab, Muscat.

Current state:
${context.priceNegotiation.completed 
    ? `- Price has been agreed at OMR ${context.priceNegotiation.agreedPrice}
- Focus on viewing arrangements and next steps` 
    : `- Current asking price: OMR ${this.negotiationState.currentPrice}
- Previous offer: ${this.negotiationState.lastOffer ? `OMR ${this.negotiationState.lastOffer}` : 'None'}`}

Property Knowledge:
${this.knowledgeBase.general}

Guidelines:
- ${context.priceNegotiation.completed ? 'Price is already agreed, focus on next steps' : 'Maintain professional negotiation stance'}
- Be direct but courteous
- Focus on property value and features
- If client asks about one villa, explain benefits of whole complex
- Property age: Built 2011, recently renovated
- For owner contact, ask for client details
- Property is for sale only, not for rent

Previous messages:
${context.interactionHistory.slice(-3).map(h => `${h.isUser ? 'Client' : 'Agent'}: ${h.message}`).join('\n')}

User's message: "${message}"

Respond naturally while following the guidelines.
`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
            });

            return response.choices[0].message.content.trim();

        } catch (error) {
            console.error('Error communicating with ChatGPT:', error);
            return language === 'arabic' 
                ? 'عذراً، حدث خطأ في معالجة طلبك. هل يمكنك المحاولة مرة أخرى؟'
                : 'Sorry, I could not process your request at the moment. Could you try again?';
        }
    }
}

module.exports = PropertyBot;