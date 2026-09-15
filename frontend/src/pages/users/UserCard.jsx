import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'

export function UserCard({ person, isBusy, onEdit, onDelete }) {
  return (
    <div className="card h-100">
      <div className="card-body text-center">
        <div className="mb-3 d-flex justify-content-center">
          <Avatar person={person} size={92} />
        </div>

        <h2 className="mb-1 fs-md">{person.name}</h2>
        <p className="text-muted mb-3 fs-sm">
          {person.email || <span className="fst-italic">bez emailu</span>}
        </p>

        <div className="mb-3">
          <span className={`badge ${person.is_guest ? 'badge-tone-warn' : 'badge-tone-accent'}`}>
            {person.is_guest ? 'Hosť' : 'Domáci'}
          </span>
        </div>

        <div className="d-flex gap-2 justify-content-center">
          <button
            onClick={() => onEdit(person)}
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
            disabled={isBusy}
          >
            <Icon name="edit" size={14} /> Upraviť
          </button>
          <button
            onClick={() => onDelete(person)}
            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-2"
            disabled={isBusy}
          >
            <Icon name="trash" size={14} /> Zmazať
          </button>
        </div>
      </div>
    </div>
  )
}
