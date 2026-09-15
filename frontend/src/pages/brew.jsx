import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { PageHeader } from '../components/PageHeader'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/EmptyState'
import { SkeletonGrid } from '../components/Skeleton'

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

/* Štítok ingrediencie — farba položky je bodka, nie pozadie štítku.
   Používatelia volia aj biele farby, ktoré by v tmavom režime svietili. */
function CoffeeChip({ coffee, onRemove }) {
  return (
    <span
      className="d-inline-flex align-items-center gap-2 px-3"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--fs-sm)',
        minHeight: 36,
      }}
    >
      <span className="item-dot" style={{ background: coffee.item.color || 'var(--text-dim)' }} />
      {coffee.item.name}
      <span className="num text-muted">{coffee.grams} g</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Odobrať ${coffee.item.name}`}
          className="d-inline-flex align-items-center justify-content-center"
          style={{
            background: 'none', border: 'none', padding: 0,
            width: 24, height: 24, color: 'var(--text-muted)',
          }}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  )
}

export default function Brew() {
  const navigate = useNavigate()

  const [step, setStep] = useState('pick-coffee')
  const [coffees, setCoffees] = useState([])
  const [selectedCoffee, setSelectedCoffee] = useState(null)
  const [customGrams, setCustomGrams] = useState('')

  const [outputMl, setOutputMl] = useState(1000)
  const [updatePrice, setUpdatePrice] = useState(false)

  const [items, setItems] = useState([])
  const [cats, setCats] = useState([])
  const [coffeeFilters, setCoffeeFilters] = useState([])
  const [booting, setBooting] = useState(true)
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
    }).finally(() => setBooting(false))
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
      setMsg('Kategória „Cold Brew" neexistuje. Vytvor ju v Admine.')
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
        ingredients: coffees.map(c => ({ coffee_id: c.item.id, grams: c.grams })),
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
      try { const parsed = JSON.parse(errMsg); errMsg = parsed.error || errMsg } catch { /* nie JSON */ }
      setMsg(errMsg)
    }
    setLoading(false)
  }

  return (
    <div className="container py-3">
      <PageHeader title="Cold Brew" icon="coldBrew" />

      {msg && (
        <div className="alert alert-warning py-2 mb-3 position-relative overflow-hidden">
          {msg}
          <div className="alert-dismiss-bar" style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* ── Krok: výber kávy ── */}
      {step === 'pick-coffee' && (
        <div className="step-zoom-in">
          <h2 className="text-center mb-3" style={{ fontSize: 'var(--fs-lg)' }}>
            {coffees.length === 0 ? 'Vyber kávu' : 'Vyber ďalšiu kávu'}
          </h2>

          {coffees.length > 0 && (
            <div className="d-flex flex-wrap gap-2 justify-content-center mb-4">
              {coffees.map((c, i) => (
                <CoffeeChip key={i} coffee={c} onRemove={() => removeCoffee(i)} />
              ))}
            </div>
          )}

          {booting ? (
            <SkeletonGrid count={6} />
          ) : coffeeItems.length === 0 ? (
            <EmptyState
              icon="coffee"
              title="Žiadne kávy na varenie"
              text="Cold brew potrebuje aspoň jednu aktívnu kávu účtovanú po gramoch. Pridaj ju v Admine."
            />
          ) : (
            <div className="grid-choices">
              {coffeeItems.map((item, idx) => {
                const lowStock = Number(item.stock_quantity) < 50
                return (
                  <button
                    key={item.id}
                    className="choice choice-enter"
                    onClick={() => pickCoffee(item)}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {item.color && <span className="choice-swatch" style={{ background: item.color }} />}
                    <div className="fw-bold">{item.name}</div>
                    <div className="num text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                      {Number(item.price).toFixed(3)} €/g
                    </div>
                    {item.stock_quantity !== null && (
                      <div
                        className="d-flex align-items-center gap-1 mt-1"
                        style={{
                          fontSize: 'var(--fs-xs)',
                          color: lowStock ? 'var(--warn)' : 'var(--text-dim)',
                          fontWeight: lowStock ? 600 : 400,
                        }}
                      >
                        <Icon name="stock" size={13} />
                        <span className="num">{Number(item.stock_quantity).toFixed(0)} g</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Krok: gramáž ── */}
      {step === 'pick-grams' && selectedCoffee && (
        <div className="step-zoom-in">
          <h2 className="text-center mb-3" style={{ fontSize: 'var(--fs-lg)' }}>
            Koľko gramov — {selectedCoffee.name}?
          </h2>
          <div className="grid-choices">
            {GRAM_PRESETS.map((g, idx) => (
              <button
                key={g}
                className="choice choice-enter"
                onClick={() => confirmGrams(g)}
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <span className="num fw-bold" style={{ fontSize: 'var(--fs-xl)' }}>{g} g</span>
                <div className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                  ≈ {(Number(selectedCoffee.price) * g).toFixed(2)} €
                </div>
              </button>
            ))}
            <div className="choice choice-enter" style={{ animationDelay: '0.18s' }}>
              <div className="mb-2" style={{ fontSize: 'var(--fs-sm)' }}>Vlastné</div>
              <div className="input-group">
                <input
                  className="form-control text-center"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  placeholder="g"
                  aria-label="Vlastná gramáž"
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
                <div className="num text-muted mt-2" style={{ fontSize: 'var(--fs-xs)' }}>
                  ≈ {(Number(selectedCoffee.price) * Number(customGrams)).toFixed(2)} €
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <button
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
              onClick={() => { setSelectedCoffee(null); setStep('pick-coffee') }}
            >
              <Icon name="back" size={16} /> Späť
            </button>
          </div>
        </div>
      )}

      {/* ── Krok: rekapitulácia ── */}
      {step === 'recap' && (
        <div className="step-zoom-in">
          <h2 className="text-center mb-3" style={{ fontSize: 'var(--fs-lg)' }}>Rekapitulácia</h2>

          <div className="d-flex flex-wrap gap-2 justify-content-center mb-4">
            {coffees.map((c, i) => <CoffeeChip key={i} coffee={c} />)}
          </div>

          {/* Náhľad výslednej položky */}
          <div className="card mb-3 overflow-hidden">
            <div style={{ background: coldBrewMeta.color, height: 6 }} />
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2 fw-bold" style={{ fontSize: 'var(--fs-md)' }}>
                  <Icon name="coldBrew" /> {coldBrewMeta.name}
                </div>
                {pricePerMl !== null && (
                  <span className="num text-muted">{pricePerMl.toFixed(3)} €/ml</span>
                )}
              </div>

              <div className="mt-3">
                {!existingColdBrew && (
                  <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    Nová položka bude vytvorená
                  </span>
                )}
                {existingColdBrew && !priceMismatch && (
                  <span className="badge d-inline-flex align-items-center gap-1" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                    <Icon name="check" size={12} /> Cena zodpovedá
                  </span>
                )}
                {existingColdBrew && priceMismatch && (
                  <>
                    <span className="badge d-inline-flex align-items-center gap-1 me-2" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                      <Icon name="warning" size={12} /> Iná cena
                    </span>
                    <span className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                      aktuálna {Number(existingColdBrew.price).toFixed(3)} · vypočítaná {pricePerMl?.toFixed(3)} €/ml
                    </span>
                    <div className="form-check mt-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="updatePriceCheck"
                        checked={updatePrice}
                        onChange={e => setUpdatePrice(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="updatePriceCheck" style={{ fontSize: 'var(--fs-sm)' }}>
                        Aktualizovať cenu na <span className="num">{pricePerMl?.toFixed(3)} €/ml</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Výstup v ml */}
          <div className="card mb-4 p-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <label className="form-label mb-0 fw-semibold text-nowrap" htmlFor="outputMl">Výstup (ml)</label>
              <input
                id="outputMl"
                type="number"
                className="form-control"
                min="1"
                step="any"
                inputMode="decimal"
                value={outputMl}
                onChange={e => setOutputMl(Number(e.target.value) || 1000)}
                style={{ maxWidth: 140 }}
              />
              {pricePerMl !== null && (
                <span className="num text-muted">{pricePerMl.toFixed(3)} €/ml</span>
              )}
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              className="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2"
              onClick={doBrewBatch}
              disabled={loading || coffees.length === 0}
            >
              <Icon name="coldBrew" size={20} />
              {loading ? 'Vyrábam…' : 'Vyrobiť Cold Brew'}
            </button>
            <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={() => setStep('pick-coffee')}>
              <Icon name="plus" size={16} /> Pridať ďalšiu kávu
            </button>
            <button className="btn btn-outline-secondary" onClick={resetAll}>Začať odznova</button>
          </div>
        </div>
      )}

      {/* ── Krok: hotovo ── */}
      {step === 'done' && doneData && (
        <div className="step-zoom-in">
          <div className="card p-4 text-center">
            <div className="done-check"><Icon name="check" size={48} /></div>
            <h2 className="mt-2 mb-3" style={{ fontSize: 'var(--fs-lg)' }}>Cold brew je navarený</h2>
            <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
              {doneData.coffees.map((c, i) => <CoffeeChip key={i} coffee={c} />)}
            </div>
            <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
              <Icon name="coldBrew" size={16} />
              {doneData.outputName}
              <span className="num">{doneData.outputMl} ml</span>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary flex-fill d-flex align-items-center justify-content-center gap-2" onClick={resetAll}>
              <Icon name="coldBrew" size={16} /> Vyrobiť ďalší
            </button>
            <button className="btn btn-outline-secondary flex-fill" onClick={() => navigate('/')}>Domov</button>
          </div>
        </div>
      )}
    </div>
  )
}
