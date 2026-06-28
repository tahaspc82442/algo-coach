const express = require('express');
const cors = require('cors');
const path = require('path');
const { getEvaluation } = require('./database');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Keep-alive endpoint for UptimeRobot
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/api/evaluations/:id', async (req, res) => {
    try {
        const evaluation = await getEvaluation(req.params.id);
        if (!evaluation) {
            return res.status(404).json({ error: 'Evaluation not found' });
        }
        res.json(evaluation);
    } catch (error) {
        console.error("Error fetching evaluation:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for the frontend page
app.get('/eval/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

function startServer() {
    app.listen(PORT, () => {
        console.log(`Web server running on http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
