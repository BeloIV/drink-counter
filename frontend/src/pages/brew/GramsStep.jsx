import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { formatEuro } from '../../lib/units'
import { GRAM_PRESETS } from './brewRules'

const ENTER_STAGGER_SECONDS = 0.06

function CustomGramsCard({ coffee, onConfirm }) {
  const [grams, setGrams] = useState('')
  const isValid = Boolean(grams) && Number(grams) > 0

  return (
    <div className="choice choice-enter" style={{ animationDelay: `${GRAM_PRESETS.length * ENTER_STAGGER_SECONDS}s` }}>
      <div className="mb-2 fs-sm">Vlastné</div>
      <div className="input-group">
        <input
          className="form-control text-center"
          type="number"
          inputMode="decimal"
          min="1"
          placeholder="g"
          aria-label="Vlastná gramáž"
          value={grams}
          onChange={(event) => setGrams(event.target.value)}
        />
        <button className="btn btn-primary" onClick={() => onConfirm(grams)} disabled={!isValid}>OK</button>
      </div>
      {isValid && (
        <div className="num text-muted mt-2 fs-xs">≈ {formatEuro(Number(coffee.price) * Number(grams))}</div>
      )}
    </div>
  )
}

export function GramsStep({ coffee, onConfirm, onBack }) {
  return (
    <div className="step-zoom-in">
      <h2 className="text-center mb-3 fs-lg">Koľko gramov — {coffee.name}?</h2>
      <div className="grid-choices">
        {GRAM_PRESETS.map((grams, index) => (
          <button
            key={grams}
            className="choice choice-enter"
            onClick={() => onConfirm(grams)}
            style={{ animationDelay: `${index * ENTER_STAGGER_SECONDS}s` }}
          >
            <span className="num fw-bold fs-xl">{grams} g</span>
            <div className="num text-muted fs-xs">≈ {formatEuro(Number(coffee.price) * grams)}</div>
          </button>
        ))}
        <CustomGramsCard coffee={coffee} onConfirm={onConfirm} />
      </div>
      <div className="mt-4">
        <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={onBack}>
          <Icon name="back" size={16} /> Späť
        </button>
      </div>
    </div>
  )
}
