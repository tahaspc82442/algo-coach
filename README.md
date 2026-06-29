# Algo Coach Bot 🧠

A personal, private Telegram bot designed to help you prepare for technical software engineering interviews by providing daily algorithm and data structure scenarios.

## Features
- **On-Demand Challenges:** Send `/question` to instantly receive a unique, real-world engineering problem that requires a specific algorithmic approach.
- **AI-Powered Grading:** Reply with your solution, and the bot will use Google's Gemini models to grade your response, provide the optimal solution, detail time/space complexity, and show pseudo-code.
- **Multi-Model Fallback:** Automatically switches between Gemini 3.5 Flash, 2.5 Flash, and 2.0 Flash to ensure 100% uptime, even during rate limits or Google server outages.
- **Completely Private:** Validates all incoming messages against your specific Telegram Chat ID. Strangers who find the bot will be completely ignored.
- **Web Interface:** Includes a built-in Express server to view full, formatted markdown feedback for your graded answers in the browser.

## Tech Stack
- **Node.js**
- **node-telegram-bot-api** (Telegram integration)
- **@google/genai** (Google Gemini integration)
- **MongoDB + Mongoose** (Database storage)
- **Express** (Web view for evaluations)

## Local Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Environment Variables:**
   Create a `.env` file in the root directory (refer to `.env.example`) and add your keys:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_token
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   ALLOWED_CHAT_ID=your_telegram_chat_id
   ```
4. **Start the bot:**
   ```bash
   node index.js
   # OR
   npm start
   ```

## Usage
- Open Telegram and message your bot.
- Send `/start` to initialize.
- Send `/question` to get a new technical interview scenario.
- Reply to the bot with your proposed data structure/algorithm.
- Click the link provided by the bot to view your detailed evaluation in the browser!
