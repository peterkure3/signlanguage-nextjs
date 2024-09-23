// pages/api/text-to-speech.js

import axios from 'axios';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { text } = req.body;

    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.openai.com/v1/audio/speech',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            data: {
                model: 'tts-1',
                input: text,
                voice: 'alloy',
            },
            responseType: 'arraybuffer',
        });

        const audioBuffer = Buffer.from(response.data);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.send(audioBuffer);
    } catch (error) {
        console.error('Error processing Text-to-Speech request:', error);
        res.status(500).json({ error: 'Failed to process Text-to-Speech request' });
    }
}