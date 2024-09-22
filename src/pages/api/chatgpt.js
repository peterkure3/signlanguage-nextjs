// export default async function handler(req, res) {
//     const { text } = req.body;

//     const response = await fetch('https://api.openai.com/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
//         },
//         body: JSON.stringify({
//             model: 'gpt-3.5-turbo',
//             messages: [{ role: 'user', content: text }],
//         }),
//     });

//     const data = await response.json();
//     res.status(200).json({ text: data.choices[0].message.content });
// }
export default async function handler(req, res) {
    const { text } = req.body;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: text }],
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.status(200).json({ text: data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
