class NegotiationState {
    constructor() {
        this.currentPrice = 550000;
        this.minPrice = 500000;
        this.increment = 10000;
        this.negotiationAttempts = 0;
        this.lastOffer = null;
        this.isNegotiationComplete = false;
        this.agreedPrice = null;
    }

    handleOffer(offer) {
        this.lastOffer = offer;
        
        if (offer >= this.currentPrice) {
            this.isNegotiationComplete = true;
            this.agreedPrice = offer;
            return {
                type: 'accept',
                price: offer,
                complete: true
            };
        }

        if (offer < this.minPrice) {
            this.negotiationAttempts++;
            if (this.negotiationAttempts >= 3) {
                return {
                    type: 'refer_to_owner',
                    price: this.currentPrice
                };
            }
            return {
                type: 'counter',
                price: this.currentPrice - this.increment
            };
        }

        if (this.currentPrice - this.increment >= this.minPrice) {
            this.currentPrice -= this.increment;
            return {
                type: 'counter',
                price: this.currentPrice
            };
        }

        return {
            type: 'final_offer',
            price: this.minPrice
        };
    }

    reset() {
        this.currentPrice = 550000;
        this.negotiationAttempts = 0;
        this.lastOffer = null;
        this.isNegotiationComplete = false;
        this.agreedPrice = null;
    }
}

module.exports = NegotiationState;