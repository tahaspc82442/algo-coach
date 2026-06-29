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

    let state = await getUserState(chatId);
    if (!state) {
        state = { chat_id: chatId, current_topic: '', last_prompt_date: '', status: 'idle', level: 1, xp: 0, mastered_topics: [] };
    } else {
        state.level = state.level || 1;
        state.xp = state.xp || 0;
        state.mastered_topics = state.mastered_topics || [];
    }

    if (text === '/start') {
        await upsertUserState(chatId, { ...state, current_topic: '', status: 'idle', current_type: 'algorithm' });
        await bot.sendMessage(chatId, "Welcome to your Daily Algorithm Coach! 🧠\n\nType /question to get a real-world FAANG engineering problem pulled directly from recent interviews.\nType /design to practice System Design questions!\n\nType /progress to see your Mastery Skill Tree and Level!");
        return;
    }

    if (text === '/progress') {
        const xpRequired = state.level * 50;
        const topics = state.mastered_topics.length > 0 ? state.mastered_topics.join(', ') : 'None yet';
        await bot.sendMessage(chatId, `📊 **Your Wisdom Map**\n\n🏆 Level: ${state.level}\n⚡ XP: ${state.xp} / ${xpRequired}\n\n🧠 Mastered Concepts:\n${topics}`);
        return;
    }

    if (text === '/question' || text === '/design') {
        const type = text === '/design' ? 'design' : 'algorithm';
        const msgText = type === 'design' ? "Scouting the web for recent FAANG System Design questions..." : "Scouting the web for recent FAANG algorithm questions...";
        bot.sendMessage(chatId, msgText);
        
        try {
            const scenario = await generateMorningScenario(state, type);
            const date = new Date().toISOString().split('T')[0];
            await upsertUserState(chatId, {
                ...state,
                current_topic: scenario,
                current_type: type,
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

    if (state.status === 'grilling' && state.current_topic) {
        // Evaluate the response
        await bot.sendMessage(chatId, "Evaluating your response and assigning XP... 🤔");
        try {
            const result = await gradeResponse(state.current_topic, text, state.current_type || 'algorithm');
            
            // Save to database and generate link
            const evalId = uuidv4();
            await saveEvaluation(evalId, chatId, state.current_topic, text, result.feedback_markdown);
            
            const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
            const evalUrl = `${baseUrl}/eval/${evalId}`;
            
            // Handle Leveling Up
            let newXp = (state.xp || 0) + result.xp_awarded;
            let newLevel = state.level || 1;
            let leveledUp = false;
            if (newXp >= newLevel * 50) {
                newXp -= newLevel * 50;
                newLevel += 1;
                leveledUp = true;
            }
            
            let newTopics = state.mastered_topics || [];
            if (result.primary_topic && result.primary_topic !== "Unknown" && !newTopics.includes(result.primary_topic)) {
                newTopics.push(result.primary_topic);
            }

            await upsertUserState(chatId, {
                ...state,
                xp: newXp,
                level: newLevel,
                mastered_topics: newTopics,
                status: 'completed'
            });

            await bot.sendMessage(chatId, `✅ Evaluation Complete!\n\nEarned: +${result.xp_awarded} XP\nTested Concept: ${result.primary_topic}\n\n👉 View your full feedback here: ${evalUrl}`);
            if (leveledUp) {
                await bot.sendMessage(chatId, `🎉 LEVEL UP! You are now Level ${newLevel}! Questions will now adapt to your higher skill level.`);
            }
        } catch (error) {
            console.error("Error grading response:", error);
            await bot.sendMessage(chatId, "Sorry, I encountered an error evaluating your response. Please try again.");
        }
    } else if (state.status === 'completed') {
        await bot.sendMessage(chatId, "You've already completed a challenge recently! Type /question when you are ready for a new one, or /progress to check your stats. 👋");
    }
});
