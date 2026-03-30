export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { car, answers } = req.body

  const prompt = `You are Motifi, a UK used car advisor. Write 2-3 sentences explaining why this car suits this user. Be specific and direct.

User: budget £${answers.budgetMin}-£${answers.budgetMax}, drives ${answers.driving}, needs ${answers.space} space, mileage ${answers.mileage}, reliability preference ${answers.reliability}.

Car: ${car.make} ${car.model}, ${car.segment}, ${car.fuelType}, MPG ${car.mpgBand}, boot ${car.bootSize}, insurance ${car.insuranceBand}, reliability tier ${car.reliabilityTier}, price from £${car.price}.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data?.content?.[0]?.text ?? 'No explanation available.'
  
  res.setHeader('Content-Type', 'application/json')
  res.status(200).end(JSON.stringify({ explanation: text }))
}
