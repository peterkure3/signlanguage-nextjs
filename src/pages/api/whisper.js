// pages/api/whisper.js

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { text } = req.body;

        try {
            // Call the OpenAI Whisper API to generate audio
            const audioResponse = await fetchWhisperAudio(text);
            res.status(200).send(audioResponse);
        } catch (error) {
            res.status(500).json({ error: 'Failed to process Whisper request' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}

// Function to call Whisper API
const fetchWhisperAudio = async (text) => {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ text }), // Adapt the payload based on the API requirements
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    const audioData = await response.blob();
    return audioData; // Return the audio blob for playback
};
