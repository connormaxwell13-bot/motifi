// api/chat.js
// Vercel serverless function — proxies chat messages to Anthropic API.
// Keeps the API key server-side. Called by ChatInterface.jsx at /api/chat.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { messages, system } = req.body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system,
        messages,
      }),
    })

    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    console.error('Chat API error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
