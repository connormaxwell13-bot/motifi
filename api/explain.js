export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { car, answers } = req.body

  const prompt = `You are Motifi, a UK used car advisor. Write 2-3 sentences explaining why this car suits this user. Be specific and direct. Do NOT start with the car's name or make. Start with what makes it right for this person.

User: budget £${answers.budgetMin}–£${answers.budgetMax}, drives ${answers.drivingContext}, ${answers.annualMileage} miles/year, priority is ${answers.priority}, needs ${answers.bootSpace} boot space.

Car: ${car.make} ${car.model} ${car.generationName}, ${car.bodyType}, ${car.fuelType}, MPG ${car.mpgBand}, boot ${car.bootBand}, insurance ${car.insuranceBand}, reliability ${car.reliabilityBand}, ownership stress ${car.ownershipStress}, NCAP ${car.ncapStars} stars, price from £${car.priceLow}.`

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = (data?.content?.[0]?.text || '').replace(/^#+\s*/gm, '').trim()
    res.status(200).json({ explanation: text })
  } catch (err) {
    console.error('Error:', err.message)
    res.status(200).json({ explanation: '' })
  }
}
