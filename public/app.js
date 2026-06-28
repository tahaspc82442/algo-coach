document.addEventListener('DOMContentLoaded', async () => {
    // Extract ID from URL path (e.g., /eval/12345)
    const pathParts = window.location.pathname.split('/');
    const evalId = pathParts[pathParts.length - 1];

    if (!evalId || evalId === 'eval') {
        showError('Invalid evaluation link.');
        return;
    }

    try {
        const response = await fetch(`/api/evaluations/${evalId}`);
        if (!response.ok) {
            throw new Error('Evaluation not found');
        }
        
        const data = await response.json();
        
        // Configure marked to use highlight.js
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true
        });

        // Populate DOM
        document.getElementById('scenario').innerText = data.topic;
        document.getElementById('answer').innerText = data.user_answer;
        document.getElementById('feedback').innerHTML = marked.parse(data.feedback);

        // Show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    } catch (err) {
        console.error(err);
        showError('Could not load evaluation. It may have expired or the link is incorrect.');
    }
});

function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    const errorEl = document.getElementById('error');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}
