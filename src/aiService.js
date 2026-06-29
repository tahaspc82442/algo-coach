const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
];

async function generateWithFallback(prompt) {
    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting generation with ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
            });
            return response.text;
        } catch (error) {
            console.warn(`Model ${modelName} failed: ${error.message}`);
            // If this is the last model, throw the error
            if (modelName === modelsToTry[modelsToTry.length - 1]) {
                throw error;
            }
        }
    }
}

async function generateMorningScenario(historyContext = "") {
    const prompt = `You are a strict, senior software engineer preparing a candidate for a technical interview. 
Generate a short, real-world engineering problem that requires a specific data structure or algorithm to solve optimally.
Make sure it is different from typical common examples if possible, or give a unique twist.

Output your response EXACTLY in this format:

**Scenario:** 
(2-3 sentences describing the real-world engineering problem)

**Topic to Research:**
(Name of the optimal data structure or algorithm)

**Resources to Study:**
- (Link or search term to learn about this concept)
- (Link or search term for system design applications of this concept)`;

    return await generateWithFallback(prompt);
}

async function gradeResponse(scenario, userResponse) {
    const prompt = `You are a strict, senior software engineer evaluating a candidate's response to an interview question.
Scenario given to candidate: ${scenario}
Candidate Response: ${userResponse}

Evaluate their response. Tell them if they are right, what they missed, and what the optimal algorithm/data structure is. 
IMPORTANT: Keep your total response under 3500 characters so it fits in a single Telegram message.

Then, provide a detailed breakdown formatted exactly like this:

**Verdict:** (Briefly explain if their approach works and its flaws)
**The Optimal Solution:** (Name the algorithm/data structure and explain why)
**Complexity:** (Time and Space)
**Real-World Use Cases:** (List 2-3 places this is used in production)

**Pseudo-code:**
\`\`\`text
(pseudo-code here)
\`\`\`

**Implementation (Python or JS):**
\`\`\`javascript
(real code here)
\`\`\`
`;

    return await generateWithFallback(prompt);
}

module.exports = {
    generateMorningScenario,
    gradeResponse
};
