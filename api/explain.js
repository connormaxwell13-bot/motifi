export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { car, answers } = req.body

    const prompt = `You are Motifi, an intelligent UK used car advisor. Write a short, honest, personalised explanation of why this car is a good match for this user. Use plain English. Be direct and specific. Maximum 3 sentences. Do not start with "This car" or "The ${car.make}".

User profile:
- Budget: £${answers.budgetMin} to £${answers.budgetMax}
- Drives mostly: ${answers.driving}
- Annual mileage: ${answers.mileage}
- Space needed: ${answers.space}
- Reliability preference: ${answers.reliability}
- Running costs matter: ${answers.runningCosts}
- ULEZ required: ${answers.ulez}

Car details:
- ${car.make} ${car.model} (${car.generation})
- Segment: ${car.segment}
- Fuel: ${car.fuelType}
- MPG: ${car.mpgBand}
- Boot size: ${car.bootSize}
- Insurance: ${car.insuranceBand} risk
- Reliability tier: ${car.reliabilityTier}
- Safety tier: ${car.safetyTier}
- ULEZ compliance: ${car.ulezCompliance}
- Ownership stress: ${car.ownershipStress}
- Price from: £${car.price}

Write the explanation now:`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const explanation = data.content?.[0]?.text || ''
    return res.status(200).json({ explanation })

  } catch (error) {
    return res.status(500).json({ explanation: '' })
  }
}
