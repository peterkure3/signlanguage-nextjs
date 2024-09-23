// pages/api/chatgpt.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { text } = req.body;

    try {
        // Call the OpenAI API to get refined text from GPT-3.5
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are an assistant that helps refine detected sign language gestures into natural language.' },
                    { role: 'user', content: `Refine this detected sign language gesture into natural language: ${text}` }
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`ChatGPT API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.status(200).json({ text: data.choices[0].message.content }); // Send the refined text back
    } catch (error) {
        console.error('Error processing ChatGPT request:', error);
        res.status(500).json({ error: 'Failed to process ChatGPT request' });
    }
}