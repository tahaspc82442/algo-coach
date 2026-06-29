const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
];

async function generateWithFallback(prompt, config = {}) {
    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting generation with ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: config
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

async function generateMorningScenario(userState, type = 'algorithm') {
    const level = userState?.level || 1;
    const mastered = (userState?.mastered_topics || []).join(', ');

    let prompt = "";
    if (type === 'design') {
        prompt = `You are a strict, senior software engineer preparing a candidate for a System Design interview.
The candidate is currently at Level ${level}.
They have already mastered the following concepts: ${mastered ? mastered : "None yet"}.

Search Google for the latest System Design interview questions from top tech companies (Meta, Google, Amazon, etc.) posted in the last 6 months.
Based on a recent real-world interview question, create a System Design scenario that is appropriate for their current level.

Output your response EXACTLY in this format:

**System Design Scenario:** 
(3-4 sentences describing the system to design, key constraints, and expected scale)

**Core Components to Consider:**
(List 2-3 key system components they must include, e.g. Load Balancer, Cache, specific Database type)

**Resources to Study:**
- (Link or search term to learn about this architecture)
- (Link or search term for case studies)`;
    } else {
        prompt = `You are a strict, senior software engineer preparing a candidate for a technical algorithm interview.
The candidate is currently at Level ${level}.
They have already mastered the following concepts: ${mastered ? mastered : "None yet"}.

Search Google for the latest software engineering interview questions from top tech companies (Meta, Google, Amazon, etc.) posted in the last 6 months on blogs, Reddit, and interview prep sites.
Based on a recent real-world interview question, create a scenario that is appropriate for their current level, and bridges their mastered concepts to a slightly more advanced one.

Output your response EXACTLY in this format:

**Scenario:** 
(2-3 sentences describing the real-world engineering problem)

**Topic to Research:**
(Name of the optimal data structure or algorithm)

**Resources to Study:**
- (Link or search term to learn about this concept)
- (Link or search term for system design applications of this concept)`;
    }


    return await generateWithFallback(prompt, { tools: [{ googleSearch: {} }] });
}

async function gradeResponse(scenario, userResponse, type = 'algorithm') {
    let prompt = "";
    if (type === 'design') {
        prompt = `You are a strict, senior software engineer evaluating a candidate's response to a System Design interview question.
Scenario given to candidate: ${scenario}
Candidate Response: ${userResponse}

Evaluate their response. Return a pure JSON object (do not use markdown code blocks) with the following structure:
{
  "feedback_markdown": "Your detailed feedback formatted in markdown. Include Verdict, High-Level Architecture, API Design, Scalability & Trade-offs, and Database Choices.",
  "xp_awarded": (integer from 1 to 10 based on how well they handled scale and trade-offs),
  "primary_topic": "The exact name of the primary system design concept tested (e.g. 'Microservices', 'Sharding', 'Message Queues')"
}
`;
    } else {
        prompt = `You are a strict, senior software engineer evaluating a candidate's response to an interview question.
Scenario given to candidate: ${scenario}
Candidate Response: ${userResponse}

Evaluate their response. Return a pure JSON object (do not use markdown code blocks) with the following structure:
{
  "feedback_markdown": "Your detailed feedback formatted in markdown. Include Verdict, The Optimal Solution, Complexity, Real-World Use Cases, Pseudo-code, and Implementation in Python or JS.",
  "xp_awarded": (integer from 1 to 10 based on how optimal their approach was),
  "primary_topic": "The exact name of the primary data structure or algorithm tested (e.g. 'Sliding Window', 'Hash Map')"
}
`;
    }


    const rawResponse = await generateWithFallback(prompt, { responseMimeType: "application/json" });
    try {
        const cleaned = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("Failed to parse grading JSON:", err);
        return {
            feedback_markdown: "Error parsing AI feedback. The API returned malformed JSON.",
            xp_awarded: 1,
            primary_topic: "Unknown"
        };
    }
}

module.exports = {
    generateMorningScenario,
    gradeResponse
};
