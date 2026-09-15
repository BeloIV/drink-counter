import { Icon } from '../../components/Icon'
import { DEFAULT_OUTPUT_ML } from './brewRules'
import { CoffeeChipList } from './CoffeeChip'

const formatPerMl = (price) => `${price.toFixed(3)} €/ml`

function PriceStatus({ existingItem, price, isPriceOutdated, updatePrice, onUpdatePriceChange }) {
  if (!existingItem) {
    return <span className="badge badge-tone-accent">Nová položka bude vytvorená</span>
  }
  if (!isPriceOutdated) {
    return (
      <span className="badge d-inline-flex align-items-center gap-1 badge-tone-ok">
        <Icon name="check" size={12} /> Cena zodpovedá
      </span>
    )
  }
  return (
    <>
      <span className="badge d-inline-flex align-items-center gap-1 me-2 badge-tone-warn">
        <Icon name="warning" size={12} /> Iná cena
      </span>
      <span className="num text-muted fs-xs">
        aktuálna {Number(existingItem.price).toFixed(3)} · vypočítaná {formatPerMl(price)}
      </span>
      <div className="form-check mt-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="update-price"
          checked={updatePrice}
          onChange={(event) => onUpdatePriceChange(event.target.checked)}
        />
        <label className="form-check-label fs-sm" htmlFor="update-price">
          Aktualizovať cenu na <span className="num">{formatPerMl(price)}</span>
        </label>
      </div>
    </>
  )
}

function OutputPreview({ identity, price, priceStatus }) {
  return (
    <div className="card mb-3 overflow-hidden">
      <div className="color-strip" style={{ background: identity.color }} />
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2 fw-bold fs-md">
            <Icon name="coldBrew" /> {identity.name}
          </div>
          {price !== null && <span className="num text-muted">{formatPerMl(price)}</span>}
        </div>
        <div className="mt-3">{priceStatus}</div>
      </div>
    </div>
  )
}

function OutputVolume({ outputMl, price, onChange }) {
  return (
    <div className="card mb-4 p-3">
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <label className="form-label mb-0 fw-semibold text-nowrap" htmlFor="output-ml">Výstup (ml)</label>
        <input
          id="output-ml"
          type="number"
          className="form-control output-ml-input"
          min="1"
          step="any"
          inputMode="decimal"
          value={outputMl}
          onChange={(event) => onChange(Number(event.target.value) || DEFAULT_OUTPUT_ML)}
        />
        {price !== null && <span className="num text-muted">{formatPerMl(price)}</span>}
      </div>
    </div>
  )
}

export function RecapStep({ recipe, identity, price, existingItem, isPriceOutdated, isBrewing, onBrew, onAddCoffee, onStartOver }) {
  const priceStatus = (
    <PriceStatus
      existingItem={existingItem}
      price={price}
      isPriceOutdated={isPriceOutdated}
      updatePrice={recipe.updatePrice}
      onUpdatePriceChange={recipe.setUpdatePrice}
    />
  )

  return (
    <div className="step-zoom-in">
      <h2 className="text-center mb-3 fs-lg">Rekapitulácia</h2>
      <CoffeeChipList coffees={recipe.coffees} />
      <OutputPreview identity={identity} price={price} priceStatus={priceStatus} />
      <OutputVolume outputMl={recipe.outputMl} price={price} onChange={recipe.setOutputMl} />

      <div className="d-flex flex-column gap-2">
        <button
          className="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2"
          onClick={onBrew}
          disabled={isBrewing || recipe.coffees.length === 0}
        >
          <Icon name="coldBrew" size={20} />
          {isBrewing ? 'Vyrábam…' : 'Vyrobiť Cold Brew'}
        </button>
        <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2" onClick={onAddCoffee}>
          <Icon name="plus" size={16} /> Pridať ďalšiu kávu
        </button>
        <button className="btn btn-outline-secondary" onClick={onStartOver}>Začať odznova</button>
      </div>
    </div>
  )
}
