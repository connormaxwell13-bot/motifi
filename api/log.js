export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    const { answers, results } = req.body

    const payload = {
      gender: answers.gender || null,
      age: answers.age || null,
      postcode: answers.postcode || null,
      radius: answers.radius || null,
      budget_min: parseFloat(answers.budgetMin) || null,
      budget_max: parseFloat(answers.budgetMax) || null,
      transmission: answers.transmission || null,
      fuel: answers.fuel || null,
      body_type: answers.bodyType || null,
      driving: answers.driving || null,
      mileage: answers.mileage || null,
      running_costs: answers.runningCosts || null,
      space: answers.space || null,
      reliability: answers.reliability || null,
      ulez: answers.ulez || null,
      result_1_make: results[0]?.make || null,
      result_1_model: results[0]?.model || null,
      result_1_score: results[0]?.scores?.finalScore || null,
      result_2_make: results[1]?.make || null,
      result_2_model: results[1]?.model || null,
      result_2_score: results[1]?.scores?.finalScore || null,
      result_3_make: results[2]?.make || null,
      result_3_model: results[2]?.model || null,
      result_3_score: results[2]?.scores?.finalScore || null,
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Supabase error:', error)
      res.status(500).json({ success: false })
      return
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Log error:', err.message)
    res.status(500).json({ success: false })
  }
}
