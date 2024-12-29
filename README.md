# WhatsApp Real Estate Bot

A WhatsApp chatbot for real estate property inquiries and price negotiations.

## Features

- Property information display
- Automated price negotiation (OMR 550,000 - 500,000)
- Conversation context management
- Contact handling

## Setup

1. Clone the repository:
\`\`\`bash
git clone https://github.com/barkalona/whatsapp-real-estate-bot.git
cd whatsapp-real-estate-bot
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment variables:
- Copy \`.env.example\` to \`.env\`
- Fill in your WhatsApp API credentials

4. Start the bot:
\`\`\`bash
npm start
\`\`\`

## Project Structure

- \`src/PropertyBot.js\` - Main bot logic
- \`src/NegotiationState.js\` - Price negotiation handling
- \`src/ConversationContext.js\` - Conversation state management
- \`src/ContactHandler.js\` - User contact management

## Configuration

- Starting price: OMR 550,000
- Minimum price: OMR 500,000
- Price decrement: OMR 10,000

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT