const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set in .env. Bot will not be able to save data if this is running in production.');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch(err => console.error('Error connecting to MongoDB:', err));
}

// Schemas
const userStateSchema = new mongoose.Schema({
    chat_id: { type: String, required: true, unique: true },
    current_topic: String,
    last_prompt_date: String,
    status: String // 'waiting_for_evening', 'grilling', 'completed'
});

const evaluationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    chat_id: String,
    topic: String,
    user_answer: String,
    feedback: String,
    created_at: { type: Date, default: Date.now }
});

const UserState = mongoose.model('UserState', userStateSchema);
const Evaluation = mongoose.model('Evaluation', evaluationSchema);

const getUserState = async (chatId) => {
    return await UserState.findOne({ chat_id: chatId }).lean();
};

const upsertUserState = async (chatId, state) => {
    return await UserState.findOneAndUpdate(
        { chat_id: chatId },
        { ...state, chat_id: chatId },
        { upsert: true, returnDocument: 'after' }
    ).lean();
};

const getAllUsers = async () => {
    return await UserState.find({}).lean();
};

const saveEvaluation = async (id, chatId, topic, userAnswer, feedback) => {
    const evalDoc = new Evaluation({
        id,
        chat_id: chatId,
        topic,
        user_answer: userAnswer,
        feedback
    });
    await evalDoc.save();
    return id;
};

const getEvaluation = async (id) => {
    return await Evaluation.findOne({ id }).lean();
};

module.exports = {
    getUserState,
    upsertUserState,
    getAllUsers,
    saveEvaluation,
    getEvaluation
};
