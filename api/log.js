export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    const { answers, results } = req.body

    const payload = {
      // Demographics — unchanged
      gender:       answers.gender        || null,
      age:          answers.age           || null,
      postcode:     answers.postcode      || null,

      // Search radius — was answers.radius, now answers.searchRadius
      radius:       answers.searchRadius  || null,

      // Budget — unchanged
      budget_min:   parseFloat(answers.budgetMin) || null,
      budget_max:   parseFloat(answers.budgetMax) || null,

      // Car preferences — updated field names
      transmission: answers.transmission  || null,
      fuel:         answers.fuelType      || null,   // was answers.fuel
      body_type:    answers.bodyType      || null,
      driving:      answers.drivingContext || null,  // was answers.driving
      mileage:      answers.annualMileage || null,   // was answers.mileage
      space:        answers.bootSpace     || null,   // was answers.space
      ulez:         answers.ulezRequired  || null,   // was answers.ulez

      // Priority — replaces separate running_costs + reliability questions
      // Map to running_costs column; reliability column set to priority too for visibility
      running_costs: answers.priority     || null,   // was answers.runningCosts
      reliability:   answers.priority     || null,   // was answers.reliability

      // Top 3 results — scores.finalScore key unchanged
      result_1_make:  results[0]?.make              || null,
      result_1_model: results[0]?.model             || null,
      result_1_score: results[0]?.scores?.finalScore || null,
      result_2_make:  results[1]?.make              || null,
      result_2_model: results[1]?.model             || null,
      result_2_score: results[1]?.scores?.finalScore || null,
      result_3_make:  results[2]?.make              || null,
      result_3_model: results[2]?.model             || null,
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
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Log error:', err.message)
    res.status(200).json({ ok: false })
  }
}
