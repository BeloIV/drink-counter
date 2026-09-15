import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { BAG_TARES, NO_BAG } from '../../lib/bagTares'
import { parseDecimal } from '../../lib/numbers'

const BAG_CHOICES = [...BAG_TARES, NO_BAG]
// Smaller differences are plausible weighing noise and show as a warning, not an error.
const TOLERATED_DIFFERENCE_GRAMS = 20

function differenceRowClass(difference) {
  if (difference === 0) return 'table-success'
  return Math.abs(difference) < TOLERATED_DIFFERENCE_GRAMS ? 'table-warning' : 'table-danger'
}

function differenceLabel(difference) {
  if (difference === 0) return 'sedí'
  return difference > 0 ? 'viac než systém' : 'menej než systém'
}

function BagPicker({ selectedIndex, onSelect }) {
  return (
    <div className="mb-3">
      <label className="form-label text-muted">Veľkosť sáčka (tara)</label>
      <div className="d-flex flex-wrap gap-1">
        {BAG_CHOICES.map((bag, index) => (
          <button
            key={bag.label}
            className={`btn btn-sm ${selectedIndex === index ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => onSelect(index)}
          >
            {bag.label}
            <span className="num ms-1 opacity-75">({bag.grams} g)</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function WeighingTable({ measured, tare, net, systemStock, difference }) {
  return (
    <table className="table table-sm mb-3">
      <tbody>
        <tr>
          <td className="text-muted">Namerané</td>
          <td className="num fw-semibold">{measured.toFixed(1)} g</td>
        </tr>
        <tr>
          <td className="text-muted">Tara sáčka</td>
          <td className="num">− {tare} g</td>
        </tr>
        <tr className="table-info">
          <td className="fw-bold">Čistá káva</td>
          <td className="num fw-bold">{net.toFixed(1)} g</td>
        </tr>
        <tr>
          <td className="text-muted">Systém hovorí</td>
          <td className="num">{systemStock.toFixed(1)} g</td>
        </tr>
        <tr className={differenceRowClass(difference)}>
          <td className="fw-bold">Rozdiel</td>
          <td className="fw-bold">
            <span className="num">{difference > 0 ? '+' : ''}{difference.toFixed(1)} g</span>
            <span className="ms-2 opacity-75 fs-xs">{differenceLabel(difference)}</span>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** Shown every tenth brew: weigh the bag and compare the beans left with the stock the system expects. */
export function CoffeeCheckModal({ item, onClose }) {
  const [measuredInput, setMeasuredInput] = useState('')
  const [bagIndex, setBagIndex] = useState(0)

  const tare = BAG_CHOICES[bagIndex].grams
  const measured = parseDecimal(measuredInput)
  const hasMeasurement = !Number.isNaN(measured)
  const net = Math.max(0, measured - tare)
  const systemStock = Number(item.stock_quantity)
  const difference = net - systemStock

  return (
    <Modal
      onClose={onClose}
      icon="scales"
      title="Kontrola zásoby kávy"
      subtitle="Každých 10 šálok — odváž sáčok a skontrolujme zásoby."
      actions={<button className="btn btn-outline-secondary" onClick={onClose}>Zavrieť</button>}
    >
      <p className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <Icon name="coffee" /> {item.name}
      </p>

      <BagPicker selectedIndex={bagIndex} onSelect={setBagIndex} />

      <div className="mb-3">
        <label className="form-label text-muted" htmlFor="measured-weight">Nameraná hmotnosť sáčka (g)</label>
        <input
          id="measured-weight"
          className="form-control"
          type="number"
          inputMode="decimal"
          placeholder="napr. 320"
          value={measuredInput}
          onChange={(event) => setMeasuredInput(event.target.value)}
          data-autofocus
        />
      </div>

      {hasMeasurement && (
        <WeighingTable measured={measured} tare={tare} net={net} systemStock={systemStock} difference={difference} />
      )}

      {hasMeasurement && difference !== 0 && (
        <div className="alert alert-warning py-2 mb-0 fs-sm">
          Ak zásoby nesedia, uprav ich v <strong>Admin → položka → zásoby</strong>.
        </div>
      )}
    </Modal>
  )
}
