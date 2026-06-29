require('dotenv').config();
const _TelegramBot = require('node-telegram-bot-api');
const TelegramBot = _TelegramBot.default || _TelegramBot;
const { v4: uuidv4 } = require('uuid');
const { startServer } = require('./src/server');
const { upsertUserState, getUserState, getAllUsers, saveEvaluation } = require('./src/database');
const { generateMorningScenario, gradeResponse } = require('./src/aiService');
const cron = require('node-cron');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing in .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Start the web server
startServer();

console.log('Bot is running...');

// Setup Cron Jobs
// Morning prompt: 9:00 AM every day
cron.schedule('0 9 * * *', async () => {
    console.log('Running morning cron...');
    const users = await getAllUsers();
    for (const user of users) {
        try {
            const scenario = await generateMorningScenario();
            const date = new Date().toISOString().split('T')[0];
            await upsertUserState(user.chat_id, {
                current_topic: scenario,
                last_prompt_date: date,
                status: 'waiting_for_evening'
            });
            await bot.sendMessage(user.chat_id, `🌅 Morning Challenge:\n\n${scenario}\n\nThink about this today. I'll check in tonight!`);
        } catch (error) {
            console.error(`Error sending morning prompt to ${user.chat_id}:`, error);
        }
    }
});

// Evening check-in: 8:00 PM every day
cron.schedule('0 20 * * *', async () => {
    console.log('Running evening cron...');
    const users = await getAllUsers();
    const date = new Date().toISOString().split('T')[0];
    for (const user of users) {
        if (user.last_prompt_date === date && user.status === 'waiting_for_evening') {
            try {
                await upsertUserState(user.chat_id, {
                    ...user,
                    status: 'grilling'
                });
                await bot.sendMessage(user.chat_id, `🌙 Evening Check-in:\n\nAre you ready to answer today's question?\n\nQuestion: ${user.current_topic}\n\nReply with your proposed algorithm/data structure and a brief explanation of why!`);
            } catch (error) {
                console.error(`Error sending evening prompt to ${user.chat_id}:`, error);
            }
        }
    }
});


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
        await bot.sendMessage(chatId, "Welcome to your Daily Algorithm Coach! 🧠\n\nI will send you a real-world engineering problem every morning at 9 AM, and 'grill' you on your solution every evening at 8 PM.\n\nType /testmorning to trigger a morning prompt right now.");
        return;
    }

    if (text === '/testmorning') {
        bot.sendMessage(chatId, "Generating your scenario...");
        try {
            const scenario = await generateMorningScenario();
            const date = new Date().toISOString().split('T')[0];
            await upsertUserState(chatId, {
                current_topic: scenario,
                last_prompt_date: date,
                status: 'grilling' // set to grilling immediately for testing
            });
            await bot.sendMessage(chatId, `🌅 Test Challenge:\n\n${scenario}\n\nReply with your answer to get graded!`);
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
        await bot.sendMessage(chatId, "You've already completed today's challenge! See you tomorrow. 👋");
    } else if (state.status === 'waiting_for_evening') {
        await bot.sendMessage(chatId, "I'm waiting until evening to grill you! (Type /testmorning if you want a new problem now).");
    }
});
