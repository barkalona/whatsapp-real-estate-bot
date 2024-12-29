class ConversationContext {
    constructor() {
        this.userContexts = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    }

    getUserContext(userId) {
        const context = this.userContexts.get(userId);
        if (!context) return this.initializeUserContext(userId);
    
        const now = new Date();
        if (now - context.lastInteraction > this.sessionTimeout) {
            const { preferences } = context;
            const newContext = this.initializeUserContext(userId);
            newContext.preferences = preferences;
            return newContext;
        }
    
        return context;
    }

    initializeUserContext(userId) {
        if (!this.userContexts.has(userId)) {
            this.userContexts.set(userId, {
                preferences: {
                    language: null,
                    interestedInVilla: null,
                    priceRange: null,
                    preferredContactTime: null
                },
                lastInteraction: new Date(),
                conversationState: 'initial',
                interactionHistory: [],
                lastQuestion: null,
                viewedLayouts: new Set(),
                viewedPhotos: false,
                lastMessageType: null,
                priceNegotiation: {
                    discussed: false,
                    completed: false,
                    agreedPrice: null
                }
            });
        }
        return this.userContexts.get(userId);
    }

    updateContext(userId, updates) {
        const context = this.getUserContext(userId);
        if (context) {
            Object.assign(context, {
                ...updates,
                lastInteraction: new Date()
            });
            this.userContexts.set(userId, context);
        }
    }

    getNextRecommendation(userId) {
        const context = this.getUserContext(userId);
        if (context.lastMessageType === 'layouts') {
            return null;
        }
        if (!context.viewedLayouts.size) {
            return 'layouts';
        } else if (!context.viewedPhotos) {
            return 'photos';
        } else if (!context.priceNegotiation.discussed && !context.priceNegotiation.completed) {
            return 'price';
        }
        return null;
    }

    updatePriceNegotiation(userId, status, price = null) {
        const context = this.getUserContext(userId);
        context.priceNegotiation = {
            ...context.priceNegotiation,
            discussed: true,
            completed: status === 'completed',
            agreedPrice: price
        };
        this.userContexts.set(userId, context);
    }

    suggestNextStep(userId) {
    // Implement logic to determine and return the next step
    // For example, you might return a string indicating the next action
    return 'nextStep';
}
    
    addToHistory(userId, message, isUser = true) {
        const context = this.getUserContext(userId);
        context.interactionHistory.push({
            timestamp: new Date(),
            message,
            isUser
        });
        context.lastInteraction = new Date();
    }
}

module.exports = ConversationContext;
