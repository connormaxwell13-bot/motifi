export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { car, runnerUp, answers } = req.body

  // Compute the headline numbers we want Cooper to ground the narrative in.
  // The system prompt asks for "Why this wins" — to do that we need to feed
  // the model not just the hero car, but the runner-up's depreciation +
  // reliability so it can make a real comparison.
  const heroDep   = Number(car?.depreciation48m ?? car?.scores?.depreciationScore ?? 0)
  const heroRel   = Number(car?.scores?.runningScore ?? car?.reliabilityScore ?? 0)
  const heroMatch = Math.round(Number(car?.scores?.finalScore || 0) * 10)
  const runnerDep = runnerUp ? Number(runnerUp?.depreciation48m ?? runnerUp?.scores?.depreciationScore ?? 0) : null
  const runnerRel = runnerUp ? Number(runnerUp?.scores?.runningScore ?? runnerUp?.reliabilityScore ?? 0) : null

  const priority = answers.priority || 'overall value'
  const finance  = answers.paymentMethod || answers.purchaseMethod || 'cash'
  const budget   = `£${Number(answers.budgetMin || 0).toLocaleString()}–£${Number(answers.budgetMax || 0).toLocaleString()}`

  const runnerLine = runnerUp
    ? `Runner-up for context: ${runnerUp.make} ${runnerUp.model}, depreciation £${Math.round(runnerDep).toLocaleString()}, reliability ${runnerRel}/10.`
    : 'No runner-up data supplied.'

  const prompt = `You are Cooper, Motifi's UK used-car advisor. Write a "Why this wins" paragraph for the user's #1 match.

VOICE & STRUCTURE — strict:
- Open with the bolded phrase **Why this wins.** then continue inline.
- Mention what the user said mattered most (their stated priority + finance method + budget).
- Make ONE specific quantitative comparison against the runner-up (depreciation, reliability, or running cost — whichever is most flattering and accurate).
- End with the real four-year outlay number, prefixed with "Real four-year outlay:" and the figure.
- 3 sentences maximum. No headers. No lists. No emoji.
- Use markdown emphasis: **bold** for the opener and key numbers (£ amounts, the car name); plain prose for the rest.

USER PROFILE:
- Stated priority: ${priority}
- Finance method: ${finance}
- Budget: ${budget}
- Driving context: ${answers.drivingContext || 'not specified'}
- Annual mileage: ${answers.annualMileage || 'not specified'}

HERO CAR (rank 1):
- ${car.make} ${car.model} ${car.generationName || ''}
- Body: ${car.bodyType}, fuel: ${car.fuelType}, gearbox: ${car.transmission}
- MPG band: ${car.mpgBand}, insurance band: ${car.insuranceBand}, reliability: ${car.reliabilityBand}
- Match score: ${heroMatch}/100
- Depreciation score: ${heroDep}, reliability score: ${heroRel}/10
- Price from £${Number(car.priceLow || 0).toLocaleString()}

${runnerLine}

Write the paragraph now. Output the paragraph only — no preamble, no closing remark.`

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
        max_tokens: 320,
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
