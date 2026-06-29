require('dotenv').config();
const _TelegramBot = require('node-telegram-bot-api');
const TelegramBot = _TelegramBot.default || _TelegramBot;
const { v4: uuidv4 } = require('uuid');
const { startServer } = require('./src/server');
const { upsertUserState, getUserState, getAllUsers, saveEvaluation } = require('./src/database');
const { generateMorningScenario, gradeResponse } = require('./src/aiService');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing in .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Start the web server
startServer();

console.log('Bot is running...');

// Cron jobs have been removed in favor of on-demand questions


// Handle incoming messages
bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    const allowedChatId = process.env.ALLOWED_CHAT_ID;
    if (allowedChatId && chatId !== allowedChatId) {
        console.warn(`Blocked unauthorized message from chat ID: ${chatId}`);
        return;
    }

    if (!text) return;

    if (text === '/start') {
        await upsertUserState(chatId, {
            current_topic: '',
            last_prompt_date: '',
            status: 'idle'
        });
        await bot.sendMessage(chatId, "Welcome to your Daily Algorithm Coach! 🧠\n\nWhenever you are ready for a challenge, just type /question to get a real-world engineering problem. Reply to the problem with your solution to get graded!");
        return;
    }

    if (text === '/question') {
        bot.sendMessage(chatId, "Generating your scenario...");
        try {
            const scenario = await generateMorningScenario();
            const date = new Date().toISOString().split('T')[0];
            await upsertUserState(chatId, {
                current_topic: scenario,
                last_prompt_date: date,
                status: 'grilling'
            });
            await bot.sendMessage(chatId, `🧠 Here is your challenge:\n\n${scenario}\n\nReply with your answer whenever you are ready!`);
        } catch (err) {
            console.error(err);
            await bot.sendMessage(chatId, "Error generating scenario. Check API keys.");
        }
        return;
    }

    const state = await getUserState(chatId);
    
    if (!state) {
        await bot.sendMessage(chatId, "Please type /start to initialize the bot.");
        return;
    }

    if (state.status === 'grilling' && state.current_topic) {
        // Evaluate the response
        await bot.sendMessage(chatId, "Evaluating your response... 🤔");
        try {
            const feedback = await gradeResponse(state.current_topic, text);
            
            // Save to database and generate link
            const evalId = uuidv4();
            await saveEvaluation(evalId, chatId, state.current_topic, text, feedback);
            
            const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
            const evalUrl = `${baseUrl}/eval/${evalId}`;
            await bot.sendMessage(chatId, `✅ Evaluation Complete!\n\nI've generated a detailed breakdown of your approach, complete with time complexity and formatted code.\n\n👉 Open this link in your browser to view your feedback:\n\n${evalUrl}`);
            
            // Mark as completed
            await upsertUserState(chatId, {
                ...state,
                status: 'completed'
            });
        } catch (error) {
            console.error("Error grading response:", error);
            await bot.sendMessage(chatId, "Sorry, I encountered an error evaluating your response. Please try again.");
        }
    } else if (state.status === 'completed') {
        await bot.sendMessage(chatId, "You've already completed a challenge recently! Type /question when you are ready for a new one. 👋");
    }
});
