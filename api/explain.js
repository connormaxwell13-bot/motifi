export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { car, answers } = req.body

  const prompt = `You are a UK used car advisor. Write 2 sentences explaining why the ${car.make} ${car.model} suits this user. They have a budget of £${answers.budgetMax}, drive ${answers.driving}, and need ${answers.space} space.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const raw = await response.text()
    console.log('Anthropic raw response:', raw)

    const data = JSON.parse(raw)
    console.log('Parsed data:', JSON.stringify(data))

const raw = (data?.content?.[0]?.text || '').replace(/^#+\s*/gm, '').trim()
const text = raw.replace(/^(the\s+)?[\w\s]+(:|,)?\s*/i, s => {
  const lower = s.toLowerCase().trim().replace(/[:,]$/, '')
  const carName = `${car.make} ${car.model}`.toLowerCase()
  return lower.includes(carName.split(' ')[0].toLowerCase()) ? '' : s
})
    res.status(200).json({ explanation: text || 'No explanation available.' })
  } catch (err) {
    console.error('Error:', err.message)
    res.status(200).json({ explanation: 'Error: ' + err.message })
  }
}
