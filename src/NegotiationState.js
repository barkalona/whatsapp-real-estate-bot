class NegotiationState {
    constructor(initialPrice = 550000) {
        this.initialPrice = initialPrice;
        this.currentPrice = initialPrice;
        this.lastOffer = null;
        this.offerHistory = [];
        this.minAcceptablePrice = initialPrice * 0.9; // 10% below asking price
        this.maxNegotiationRounds = 5;
        this.isNegotiationComplete = false;
        this.agreedPrice = null;
    }

    handleOffer(offerAmount) {
        // Record the offer
        this.lastOffer = offerAmount;
        this.offerHistory.push({
            amount: offerAmount,
            timestamp: Date.now()
        });

        // Check if offer is acceptable
        if (offerAmount >= this.minAcceptablePrice) {
            this.isNegotiationComplete = true;
            this.agreedPrice = offerAmount;
            return {
                complete: true,
                accepted: true,
                price: offerAmount,
                message: 'Offer accepted'
            };
        }

        // Calculate counter offer if needed
        if (this.offerHistory.length >= this.maxNegotiationRounds) {
            return {
                complete: false,
                accepted: false,
                suggestedCounter: this.minAcceptablePrice,
                message: 'Final counter offer'
            };
        }

        // Calculate a counter offer
        const counterOffer = this.calculateCounterOffer(offerAmount);
        this.currentPrice = counterOffer;

        return {
            complete: false,
            accepted: false,
            suggestedCounter: counterOffer,
            message: 'Counter offer suggested'
        };
    }

    calculateCounterOffer(offerAmount) {
        // Get percentage difference from asking price
        const percentageDiff = (this.initialPrice - offerAmount) / this.initialPrice;
        
        // If offer is very low (more than 15% below asking)
        if (percentageDiff > 0.15) {
            return Math.round(this.initialPrice * 0.95); // Counter with 5% below asking
        }
        
        // If offer is low (10-15% below asking)
        if (percentageDiff > 0.10) {
            return Math.round(this.initialPrice * 0.97); // Counter with 3% below asking
        }
        
        // If offer is close (5-10% below asking)
        if (percentageDiff > 0.05) {
            return Math.round(this.initialPrice * 0.98); // Counter with 2% below asking
        }
        
        // If offer is very close (less than 5% below asking)
        return Math.round(this.initialPrice * 0.99); // Counter with 1% below asking
    }

    getStatus() {
        return {
            initialPrice: this.initialPrice,
            currentPrice: this.currentPrice,
            lastOffer: this.lastOffer,
            offerCount: this.offerHistory.length,
            isComplete: this.isNegotiationComplete,
            agreedPrice: this.agreedPrice
        };
    }

    reset() {
        this.currentPrice = this.initialPrice;
        this.lastOffer = null;
        this.offerHistory = [];
        this.isNegotiationComplete = false;
        this.agreedPrice = null;
    }
}

module.exports = NegotiationState;