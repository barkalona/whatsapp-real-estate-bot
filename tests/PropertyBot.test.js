const PropertyBot = require('../src/PropertyBot');

// Mock dependencies
jest.mock('openai');
jest.mock('./NegotiationState');
jest.mock('./ConversationContext');
jest.mock('./ContactHandler');

describe('PropertyBot', () => {
    let propertyBot;
    let mockTwilioClient;
    let mockOpenAIClient;
    let mockLogger;

    beforeEach(() => {
        // Setup mock clients
        mockTwilioClient = {
            messages: {
                create: jest.fn().mockResolvedValue({ sid: 'test-sid' })
            }
        };

        mockOpenAIClient = {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [{ message: { content: 'Test response' } }]
                    })
                }
            }
        };

        mockLogger = {
            logDebug: jest.fn(),
            logError: jest.fn()
        };

        // Initialize PropertyBot with mock clients
        propertyBot = new PropertyBot({
            twilioClient: mockTwilioClient,
            openaiClient: mockOpenAIClient,
            logger: mockLogger
        });
    });

    describe('Constructor', () => {
        test('should initialize with required clients', () => {
            expect(propertyBot.twilioClient).toBeDefined();
            expect(propertyBot.openai).toBeDefined();
            expect(propertyBot.logger).toBeDefined();
        });

        test('should throw error if required clients are not provided', () => {
            expect(() => new PropertyBot({})).toThrow('Required clients not provided');
        });
    });

    describe('Language Detection', () => {
        test('should detect Arabic text', () => {
            const result = propertyBot.detectLanguage('مرحبا');
            expect(result).toBe('arabic');
        });

        test('should detect English text', () => {
            const result = propertyBot.detectLanguage('Hello');
            expect(result).toBe('english');
        });
    });

    describe('sendLayouts', () => {
        test('should send all available layouts', async () => {
            const phoneNumber = '+1234567890';
            await propertyBot.sendLayouts(phoneNumber, 'en');
            
            expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(
                propertyBot.photos.layouts.length
            );
        });

        test('should handle no layouts available', async () => {
            propertyBot.photos.layouts = [];
            const phoneNumber = '+1234567890';
            await propertyBot.sendLayouts(phoneNumber, 'en');
            
            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER,
                body: 'Sorry, no floor plans are currently available'
            });
        });
    });

    describe('sendPhotos', () => {
        test('should send all general and interior photos', async () => {
            const phoneNumber = '+1234567890';
            await propertyBot.sendPhotos(phoneNumber, 'en');
            
            const totalPhotos = propertyBot.photos.general.length + 
                              propertyBot.photos.interior.length;
            expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(totalPhotos);
        });

        test('should handle errors gracefully', async () => {
            mockTwilioClient.messages.create.mockRejectedValue(new Error('Test error'));
            const phoneNumber = '+1234567890';
            await propertyBot.sendPhotos(phoneNumber, 'en');
            
            expect(mockLogger.logError).toHaveBeenCalled();
        });
    });

    describe('handleMessage', () => {
        test('should handle layout request', async () => {
            const message = 'Can I see the floor layout?';
            const sender = '+1234567890';
            
            await propertyBot.handleMessage(message, sender);
            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
        });

        test('should handle photo request', async () => {
            const message = 'Please send some photos';
            const sender = '+1234567890';
            
            await propertyBot.handleMessage(message, sender);
            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
        });

        test('should handle Arabic messages', async () => {
            const message = 'مرحبا';
            const sender = '+1234567890';
            
            const response = await propertyBot.handleMessage(message, sender);
            expect(response).toBeDefined();
        });
    });

    describe('Price Negotiation', () => {
        test('should handle price offers', async () => {
            const message = 'I offer 500000 OMR';
            const sender = '+1234567890';
            
            await propertyBot.handleMessage(message, sender);
            expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
        });
    });
});