class ConversationContext {
    constructor() {
        this.contexts = new Map();
    }

    getUserContext(userId) {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, {
                preferences: {
                    language: null,
                    contactName: null,
                    contactPhone: null
                },
                interactionHistory: [],
                priceNegotiation: {
                    completed: false,
                    agreedPrice: null,
                    lastOffer: null
                },
                lastInteraction: Date.now()
            });
        }
        return this.contexts.get(userId);
    }

    addToHistory(userId, message, isUser) {
        const context = this.getUserContext(userId);
        context.interactionHistory.push({
            timestamp: Date.now(),
            message,
            isUser
        });
        
        // Keep only last 10 messages for memory efficiency
        if (context.interactionHistory.length > 10) {
            context.interactionHistory.shift();
        }
    }

    updateContext(userId, updates) {
        const context = this.getUserContext(userId);
        Object.assign(context, updates);
    }

    updatePriceNegotiation(userId, status, price) {
        const context = this.getUserContext(userId);
        context.priceNegotiation = {
            ...context.priceNegotiation,
            completed: status === 'completed',
            agreedPrice: price || context.priceNegotiation.agreedPrice,
            lastOffer: price || context.priceNegotiation.lastOffer
        };
    }

    suggestNextStep(userId, language) {
        const context = this.getUserContext(userId);
        const { priceNegotiation, preferences } = context;

        if (!preferences.contactName && !preferences.contactPhone) {
            return language === 'arabic' 
                ? 'لتسهيل التواصل، هل يمكنك مشاركة اسمك ورقم هاتفك؟'
                : 'To facilitate communication, could you share your name and contact number?';
        }

        if (!priceNegotiation.lastOffer) {
            return language === 'arabic'
                ? 'هل لديك سعر معين في ذهنك للعقار؟'
                : 'Do you have a specific price in mind for the property?';
        }

        if (!priceNegotiation.completed) {
            return language === 'arabic'
                ? 'هل ترغب في مناقشة السعر أكثر أو ترتيب موعد لمعاينة العقار؟'
                : 'Would you like to discuss the price further or arrange a viewing?';
        }

        return null;
    }

    // Clean up old contexts (older than 24 hours)
    cleanupOldContexts() {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        for (const [userId, context] of this.contexts.entries()) {
            if (context.lastInteraction < oneDayAgo) {
                this.contexts.delete(userId);
            }
        }
    }
}

module.exports = ConversationContext;