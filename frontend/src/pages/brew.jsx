import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { NavDrawer, HamburgerBtn } from '../NavDrawer'

const GRAM_PRESETS = [15, 65, 80]

function calcFilterCost(coffeeFilters) {
  // 1× veľký + 1× stredný filter = top 2 podľa ceny
  const sorted = [...coffeeFilters].sort((a, b) => Number(b.extra_eur) - Number(a.extra_eur))
  return sorted.slice(0, 2).reduce((s, f) => s + Number(f.extra_eur), 0)
}

function calcBrewPrice(coffees, outputMl, coffeeFilters) {
  if (!coffees.length || !outputMl) return null
  const filterCost = calcFilterCost(coffeeFilters)
  const totalCost = coffees.reduce((s, c) => s + Number(c.item.price) * c.grams, 0) + filterCost
  return Math.ceil((totalCost / outputMl) * 1000) / 1000
}

function buildColdBrewMeta(coffees) {
  if (!coffees.length) return { name: '', color: '#ffffff' }
  if (coffees.length === 1) {
    return { name: coffees[0].item.name, color: coffees[0].item.color }
  }
  if (coffees.length === 2) {
    return {
      name: `${coffees[0].item.name} ${coffees[1].item.name}`,
      color: `linear-gradient(90deg, ${coffees[0].item.color} 50%, ${coffees[1].item.color} 50%)`,
    }
  }
  return {
    name: coffees.map(c => c.item.name).join(' + '),
    color: coffees[0].item.color,
  }
}

export default function Brew() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [step, setStep] = useState('pick-coffee')
  const [coffees, setCoffees] = useState([])
  const [selectedCoffee, setSelectedCoffee] = useState(null)
  const [customGrams, setCustomGrams] = useState('')

  const [outputMl, setOutputMl] = useState(1000)
  const [updatePrice, setUpdatePrice] = useState(false)

  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [coffeeFilters, setCoffeeFilters] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [doneData, setDoneData] = useState(null)

  useEffect(() => {
    Promise.all([
      api.items(),
      api.categories(),
      api.getCoffeeFilters(),
    ]).then(([its, cs, cfs]) => {
      setItems(Array.isArray(its) ? its : [])
      setCats(Array.isArray(cs) ? cs : [])
      setCoffeeFilters(Array.isArray(cfs) ? cfs : [])
    })
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  const coffeeItems = items.filter(i =>
    i.category?.name?.toLowerCase() === 'coffee' &&
    i.pricing_mode === 'per_gram' &&
    i.active
  )

  const coldBrewMeta = buildColdBrewMeta(coffees)
  const pricePerMl = calcBrewPrice(coffees, outputMl, coffeeFilters)

  const existingColdBrew = items.find(i =>
    i.category?.name?.toLowerCase() === 'cold brew' &&
    i.name.toLowerCase() === coldBrewMeta.name.toLowerCase()
  )
  const priceMismatch = existingColdBrew && pricePerMl !== null &&
    Math.abs(Number(existingColdBrew.price) - pricePerMl) > 0.0005

  const pickCoffee = (item) => {
    setSelectedCoffee(item)
    setCustomGrams('')
    setStep('pick-grams')
  }

  const confirmGrams = (grams) => {
    const g = Number(grams)
    if (!g || g <= 0) return
    setCoffees(prev => [...prev, { item: selectedCoffee, grams: g }])
    setSelectedCoffee(null)
    setStep('recap')
  }

  const removeCoffee = (idx) => {
    setCoffees(prev => prev.filter((_, i) => i !== idx))
  }

  const resetAll = () => {
    setCoffees([])
    setSelectedCoffee(null)
    setOutputMl(1000)
    setUpdatePrice(false)
    setStep('pick-coffee')
  }

  const doBrewBatch = async () => {
    const coldBrewCat = cats.find(c => c.name.toLowerCase() === 'cold brew')
    if (!coldBrewCat) {
      setMsg('Chyba: kategória "Cold Brew" neexistuje. Vytvor ju v Admine.')
      return
    }
    setLoading(true)
    try {
      await api.csrf().catch(() => {})

      let outputItem = existingColdBrew

      if (!outputItem) {
        outputItem = await api.addItem({
          name: coldBrewMeta.name,
          category_id: coldBrewCat.id,
          pricing_mode: 'per_ml',
          price: String(pricePerMl),
          color: coldBrewMeta.color,
        })
      } else if (priceMismatch && updatePrice) {
        await api.updateItem(outputItem.id, { price: String(pricePerMl) })
      }

      const result = await api.createBrewBatch({
        ingredients: coffees.map((c, i) => ({ coffee_id: c.item.id, grams: c.grams })),
        output_item_id: outputItem.id,
        output_ml: outputMl,
      })

      setDoneData({
        batch: result,
        outputName: outputItem.name,
        outputMl,
        coffees: [...coffees],
      })
      setStep('done')
    } catch (err) {
      let errMsg = err.message || String(err)
      try { const parsed = JSON.parse(errMsg); errMsg = parsed.error || errMsg } catch (_) {}
      setMsg('Chyba: ' + errMsg)
    }
    setLoading(false)
  }

  const isLight = (color) => !color || color === '#ffffff' || color.toLowerCase() === '#fff'

  return (
    <div className="container py-3">
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/')}
            style={{ fontSize: '1.4rem', lineHeight: 1 }}>←</button>
          <h2 className="mb-0">❄️ Cold Brew</h2>
        </div>
        <HamburgerBtn onClick={() => setDrawerOpen(true)} />
      </div>

      {msg && (
        <div className="alert alert-warning py-2 mb-3 position-relative overflow-hidden">
          {msg}
          <div className="alert-dismiss-bar" style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* ── Step: pick-coffee ── */}
      {step === 'pick-coffee' && (
        <div className="step-zoom-in">
          <h4 className="text-center mb-3">
            {coffees.length === 0 ? 'Vyber kávu' : 'Vyber ďalšiu kávu'}
          </h4>

          {coffees.length > 0 && (
            <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
              {coffees.map((c, i) => (
                <span
                  key={i}
                  className="badge d-flex align-items-center gap-1"
                  style={{
                    background: c.item.color,
                    color: isLight(c.item.color) ? '#000' : '#fff',
                    border: isLight(c.item.color) ? '1px solid #ccc' : 'none',
                    fontSize: '0.85rem',
                    padding: '0.35em 0.6em',
                    borderRadius: '999px',
                  }}
                >
                  ☕ {c.item.name} {c.grams}g
                  <button
                    onClick={() => removeCoffee(i)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      color: isLight(c.item.color) ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
                      fontSize: '0.8rem', lineHeight: 1 }}
                  >✕</button>
                </span>
              ))}
            </div>
          )}

          {coffeeItems.length === 0 ? (
            <div className="text-center text-muted py-4">Žiadne aktívne kávy (Coffee / per_gram)</div>
          ) : (
            <div className="grid-choices">
              {coffeeItems.map((item, idx) => {
                const bg = item.color || '#ffffff'
                const light = isLight(bg)
                return (
                  <button
                    key={item.id}
                    className="choice choice-enter"
                    onClick={() => pickCoffee(item)}
                    style={{
                      background: bg,
                      color: light ? '#000' : '#fff',
                      border: light ? '2px solid #ddd' : 'none',
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    <div className="fw-bold">{item.name}</div>
                    <div className="small" style={{ color: light ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.85)' }}>
                      {Number(item.price).toFixed(3)} €/g
                    </div>
                    {item.stock_quantity !== null && (
                      <div className="small mt-1" style={{
                        color: Number(item.stock_quantity) < 50
                          ? '#fd7e14'
                          : light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)',
                        fontWeight: Number(item.stock_quantity) < 50 ? '600' : 'normal',
                      }}>
                        📦 {Number(item.stock_quantity).toFixed(0)} g
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step: pick-grams ── */}
      {step === 'pick-grams' && selectedCoffee && (
        <div className="step-zoom-in">
          <h4 className="text-center mb-3">Koľko gramov<br /><em>{selectedCoffee.name}</em>?</h4>
          <div className="grid-choices">
            {GRAM_PRESETS.map((g, idx) => (
              <button
                key={g}
                className="choice choice-enter"
                onClick={() => confirmGrams(g)}
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <div className="fw-bold" style={{ fontSize: '1.4rem' }}>{g} g</div>
                <div className="small text-muted">
                  ≈ {(Number(selectedCoffee.price) * g).toFixed(2)} €
                </div>
              </button>
            ))}
            <div className="choice choice-enter" style={{ animationDelay: '0.18s' }}>
              <div className="mb-2 small">Vlastné</div>
              <div className="input-group input-group-sm">
                <input
                  className="form-control text-center"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  placeholder="g"
                  value={customGrams}
                  onChange={e => setCustomGrams(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => confirmGrams(customGrams)}
                  disabled={!customGrams || Number(customGrams) <= 0}
                >OK</button>
              </div>
              {customGrams && Number(customGrams) > 0 && (
                <div className="small text-muted mt-1">
                  ≈ {(Number(selectedCoffee.price) * Number(customGrams)).toFixed(2)} €
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-outline-secondary" onClick={() => { setSelectedCoffee(null); setStep('pick-coffee') }}>
              ← Späť
            </button>
          </div>
        </div>
      )}

      {/* ── Step: recap ── */}
      {step === 'recap' && (
        <div className="step-zoom-in">
          <h4 className="text-center mb-3">Rekapitulácia</h4>

          {/* Ingredient chips */}
          <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
            {coffees.map((c, i) => (
              <span
                key={i}
                className="badge"
                style={{
                  background: c.item.color,
                  color: isLight(c.item.color) ? '#000' : '#fff',
                  border: isLight(c.item.color) ? '1px solid #ccc' : 'none',
                  fontSize: '0.9rem',
                  padding: '0.4em 0.75em',
                  borderRadius: '999px',
                }}
              >
                ☕ {c.item.name} {c.grams}g
              </span>
            ))}
          </div>

          {/* Preview cold brew card */}
          <div
            className="card mb-3 overflow-hidden"
            style={{ border: 'none', borderRadius: 12 }}
          >
            <div
              style={{
                background: coldBrewMeta.color,
                minHeight: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1rem',
              }}
            >
              <div className="text-center">
                <div
                  className="fw-bold"
                  style={{
                    fontSize: '1.05rem',
                    color: coldBrewMeta.color.startsWith('linear') ? '#fff' : (isLight(coldBrewMeta.color) ? '#000' : '#fff'),
                    textShadow: coldBrewMeta.color.startsWith('linear') ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                  }}
                >
                  ❄️ {coldBrewMeta.name}
                </div>
                {pricePerMl !== null && (
                  <div
                    className="small mt-1"
                    style={{
                      color: coldBrewMeta.color.startsWith('linear') ? 'rgba(255,255,255,0.85)' : (isLight(coldBrewMeta.color) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'),
                    }}
                  >
                    {pricePerMl.toFixed(3)} €/ml
                  </div>
                )}
              </div>
            </div>
            <div className="card-body py-2 px-3">
              {!existingColdBrew && (
                <span className="badge bg-info text-dark">Nová položka bude vytvorená</span>
              )}
              {existingColdBrew && !priceMismatch && (
                <span className="badge bg-success">✓ Cena zodpovedá</span>
              )}
              {existingColdBrew && priceMismatch && (
                <div>
                  <span className="badge bg-warning text-dark me-2">⚠ Iná cena</span>
                  <span className="small text-muted">
                    Aktuálna: {Number(existingColdBrew.price).toFixed(3)} €/ml · Vypočítaná: {pricePerMl?.toFixed(3)} €/ml
                  </span>
                  <div className="form-check mt-1">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="updatePriceCheck"
                      checked={updatePrice}
                      onChange={e => setUpdatePrice(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="updatePriceCheck">
                      Aktualizovať cenu na {pricePerMl?.toFixed(3)} €/ml
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output ml */}
          <div className="card mb-3 p-3">
            <div className="d-flex align-items-center gap-3">
              <label className="form-label mb-0 fw-semibold text-nowrap">Výstup (ml)</label>
              <input
                type="number"
                className="form-control"
                min="1"
                step="any"
                inputMode="decimal"
                value={outputMl}
                onChange={e => setOutputMl(Number(e.target.value) || 1000)}
                style={{ maxWidth: 120 }}
              />
              {pricePerMl !== null && (
                <div className="text-muted small">
                  {pricePerMl.toFixed(3)} €/ml
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="d-flex flex-column gap-2">
            <button
              className="btn btn-lg text-white fw-semibold"
              style={{ background: 'linear-gradient(135deg, #0062cc, #0ea5e9)', border: 'none' }}
              onClick={doBrewBatch}
              disabled={loading || coffees.length === 0}
            >
              {loading ? '⏳ Vyrábam…' : '❄️ Vyrobiť Cold Brew'}
            </button>
            <button className="btn btn-outline-primary" onClick={() => setStep('pick-coffee')}>
              ➕ Pridať ďalšiu kávu
            </button>
            <button className="btn btn-outline-secondary" onClick={resetAll}>
              Znovu vybrať
            </button>
          </div>
        </div>
      )}

      {/* ── Step: done ── */}
      {step === 'done' && doneData && (
        <div className="step-zoom-in">
          <div className="card p-4 text-center">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <h4 className="mb-2">Hotovo!</h4>
            <div className="text-muted mb-3">
              {doneData.coffees.map((c, i) => (
                <span key={i}>
                  {i > 0 && ' + '}☕ {c.item.name} {c.grams}g
                </span>
              ))}
              {' → '}❄️ {doneData.outputName} {doneData.outputMl} ml
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              className="btn btn-primary flex-fill"
              onClick={resetAll}
            >
              ❄️ Vyrobiť ďalší
            </button>
            <button className="btn btn-outline-secondary flex-fill" onClick={() => navigate('/')}>
              Domov
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
