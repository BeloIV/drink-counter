import { Avatar } from '../../components/Avatar'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { firstName } from './transactionRules'

function PersonToggle({ person, isSelected, isDimmed, onToggle }) {
  return (
    <button
      onClick={() => onToggle(person.id)}
      className={`avatar-btn${isSelected ? ' avatar-btn--on' : ''}`}
      aria-pressed={isSelected}
    >
      <Avatar person={person} size={44} className={isDimmed ? 'avatar--dimmed' : ''} />
      <span className="avatar-btn-label">{firstName(person)}</span>
    </button>
  )
}

export function PersonFilter({ persons, selectedIds, onToggle, onClear }) {
  const hasSelection = selectedIds.length > 0
  const title = (
    <span className="fs-sm">
      Filter podľa osoby
      {hasSelection && <span className="num badge ms-2 badge-tone-accent">{selectedIds.length}</span>}
    </span>
  )

  return (
    <CollapsibleCard title={title} className="mb-4" bodyClassName="card-body py-3 px-3">
      <div className="d-flex flex-wrap gap-2 align-items-start">
        {persons.map((person) => {
          const isSelected = selectedIds.includes(person.id)
          return (
            <PersonToggle
              key={person.id}
              person={person}
              isSelected={isSelected}
              isDimmed={hasSelection && !isSelected}
              onToggle={onToggle}
            />
          )
        })}
        {hasSelection && (
          <button className="btn btn-sm btn-outline-secondary align-self-center" onClick={onClear}>
            Zrušiť filter
          </button>
        )}
      </div>
    </CollapsibleCard>
  )
}
