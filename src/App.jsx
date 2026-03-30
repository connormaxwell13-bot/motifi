import React, { useState } from 'react'

export default function App() {
  return (
    <div style={{ fontFamily: 'Satoshi, sans-serif', backgroundColor: '#0F1D35', minHeight: '100vh', color: '#F5F7FA' }}>
      
      {/* Nav */}
      <nav style={{ backgroundColor: '#1A2E50', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-0.02em' }}>
          Mo<span style={{ color: '#00C896' }}>ti</span>fi
        </div>
        <button style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
          Find my car
        </button>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#1A2E50', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: '500', color: '#00C896', letterSpacing: '0.05em', marginBottom: '32px' }}>
          INTELLIGENT CAR MATCHING
        </div>
        <h1 style={{ fontSize: '52px', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '24px' }}>
          The smarter way to find your <span style={{ color: '#00C896' }}>next car.</span>
        </h1>
        <p style={{ fontSize: '18px', fontWeight: '400', lineHeight: '1.6', color: '#A8B8CC', marginBottom: '40px', maxWidth: '520px', margin: '0 auto 40px' }}>
          Answer a few simple questions. We match you to the right used car — with the true cost of ownership made clear from the start.
        </p>
        <button style={{ backgroundColor: '#00C896', color: '#0F1D35', border: 'none', borderRadius: '10px', padding: '16px 36px', fontFamily: 'Satoshi, sans-serif', fontWeight: '700', fontSize: '16px', cursor: 'pointer', marginRight: '12px' }}>
          Find my car →
        </button>
      </div>

      {/* Three value props */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[
          { title: 'Smart matching', body: 'We ask the right questions and score every car in our database against your answers.' },
          { title: 'True cost, not just sticker price', body: 'Insurance, fuel, tax and running costs are built into every recommendation.' },
          { title: 'Three clear choices', body: 'No endless scrolling. Just your three best matches, explained in plain English.' },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: '#1A2E50', borderRadius: '12px', padding: '28px 24px' }}>
            <div style={{ width: '32px', height: '3px', backgroundColor: '#00C896', borderRadius: '2px', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>{card.title}</h3>
            <p style={{ fontSize: '14px', fontWeight: '400', lineHeight: '1.6', color: '#A8B8CC' }}>{card.body}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #1A2E50', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#4A6080' }}>
        © 2026 Motifi · The smarter way to find your next car
      </div>

    </div>
  )
}
