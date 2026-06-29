# Algo Coach Bot 🧠

A personal, private Telegram bot designed to help you prepare for technical software engineering interviews by acting as an **Adaptive FAANG Mentor**. It tracks your progress, scales in difficulty, and scouts the live internet for the newest interview meta.

## Features
- **Live Internet Scouting:** Uses Google Search Grounding to scour the internet for the most recent interview questions (past 6 months) from companies like Meta, Google, and Amazon to generate your scenarios.
- **Adaptive Leveling (RPG System):** The AI tracks your mastery. When you successfully complete a question, you earn XP and add the core concept to your "Wisdom Map". When you gain enough XP, you Level Up, and the bot begins throwing harder, combination-style problems at you.
- **Dual Modes (Algo vs. System Design):** 
  - Send `/question` for a Data Structures & Algorithms problem.
  - Send `/design` for a System Architecture problem. The AI grading engine dynamically switches to evaluate your API design, database choices, and trade-offs.
- **AI-Powered Grading:** Reply with your solution, and the bot uses Gemini models to provide structured JSON feedback, awarding you XP based on your time/space complexity or architectural constraints.
- **Multi-Model Fallback:** Automatically switches between `gemini-3.5-flash`, `gemini-2.5-flash`, and `gemini-2.0-flash` to ensure 100% uptime, even during rate limits or Google server outages.
- **Completely Private:** Validates all incoming messages against your specific Telegram Chat ID. Strangers who find the bot will be completely ignored.
- **Web Interface:** Includes a built-in Express server to view full, formatted markdown feedback for your graded answers in the browser.

## Tech Stack
- **Node.js**
- **node-telegram-bot-api** (Telegram integration)
- **@google/genai** (Google Gemini integration with Search Grounding & Structured Outputs)
- **MongoDB + Mongoose** (Database storage for User State & Evaluations)
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

## Usage Commands
Open Telegram and message your bot:
- `/start` - Initialize the bot and reset your session.
- `/question` - Scout the web and generate a Data Structures/Algorithms scenario tailored to your current Level.
- `/design` - Scout the web and generate a System Design scenario.
- `/progress` - View your Wisdom Map, current Level, XP, and mastered topics.

*To answer a scenario, simply reply to the bot with your proposed algorithm or architecture! Click the link provided by the bot to view your detailed evaluation in your browser.*
