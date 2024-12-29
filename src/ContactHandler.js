class ContactHandler {
    static isContactInfo(message) {
        return /(?:contact|name|number|mobile|phone|details).*:|.*(?:my name|my number|my mobile|my phone|my contact).*\d+/i.test(message) ||
               message.includes(',') && /\d{9,}/.test(message);
    }

    static extractContactInfo(message) {
        const nameMatch = message.match(/(?:name(?:\s+is)?:?\s*)([\w\s]+)(?:,|and|mobile|phone|number)/i);
        const phoneMatch = message.match(/(?:\d{9,})/);
        
        return {
            name: nameMatch ? nameMatch[1].trim() : null,
            phone: phoneMatch ? phoneMatch[0] : null
        };
    }
}

module.exports = ContactHandler;