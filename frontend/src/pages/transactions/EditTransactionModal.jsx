import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { toggleSign } from './transactionRules'

function SignedDecimalInput({ id, label, toggleLabel, value, onChange, autoFocus = false }) {
  return (
    <div className="col-6">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="input-group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          tabIndex={-1}
          aria-label={toggleLabel}
          onClick={() => onChange(toggleSign(value))}
        >±</button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          pattern="-?[0-9]*[.,]?[0-9]*"
          className="form-control"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...(autoFocus ? { 'data-autofocus': true } : {})}
        />
      </div>
    </div>
  )
}

export function EditTransactionModal({ transaction, onSave, onClose }) {
  const [form, setForm] = useState({ quantity: transaction.quantity, price_at_time: transaction.price_at_time })
  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))

  return (
    <Modal
      onClose={onClose}
      icon="edit"
      size="sm"
      title="Upraviť transakciu"
      subtitle={`${transaction.person.name} — ${transaction.item.name}`}
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Uložiť</button>
        </>
      }
    >
      <div className="row g-3">
        <SignedDecimalInput
          id="edit-quantity"
          label="Množstvo"
          toggleLabel="Prepnúť znamienko množstva"
          value={form.quantity}
          onChange={setField('quantity')}
          autoFocus
        />
        <SignedDecimalInput
          id="edit-price"
          label="Cena (€)"
          toggleLabel="Prepnúť znamienko ceny"
          value={form.price_at_time}
          onChange={setField('price_at_time')}
        />
      </div>
    </Modal>
  )
}
