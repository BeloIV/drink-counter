import { memo, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { avatarPhotoUrl, getInitials, nameGradient } from '../../lib/avatar'
import { debtClassName } from './orderRules'
import { StepSection } from './StepSection'
import { useProgressivePhotos } from './useProgressivePhotos'

const ENTER_STAGGER_SECONDS = 0.05

function PersonPhoto({ url, name, onSettled }) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <img
      src={url}
      alt=""
      className={`choice-photo${isLoaded ? ' choice-photo--on' : ''}`}
      decoding="async"
      onLoad={() => { setIsLoaded(true); onSettled() }}
      onError={onSettled}
      // The gradient underneath stays visible until the photo is there.
      style={{ background: nameGradient(name) }}
    />
  )
}

// Memoised so a debt change re-renders only the card it belongs to; `onSelect` must be stable.
const PersonCard = memo(function PersonCard({
  person, debt, isGroupOrder, isSelected, onSelect, enterIndex, canLoadPhoto, onPhotoSettled,
}) {
  const photoUrl = avatarPhotoUrl(person)
  const selectionClass = isGroupOrder ? (isSelected ? 'multi-selected' : 'multi-dim') : ''

  return (
    <button
      className={`choice choice-enter ${photoUrl ? '' : 'choice-initials'} ${selectionClass}`}
      onClick={() => onSelect(person)}
      aria-pressed={isGroupOrder ? isSelected : undefined}
      style={{ background: nameGradient(person.name), animationDelay: `${enterIndex * ENTER_STAGGER_SECONDS}s` }}
    >
      {photoUrl && canLoadPhoto && (
        <PersonPhoto url={photoUrl} name={person.name} onSettled={onPhotoSettled} />
      )}
      <div className="overlay">
        {!photoUrl && <div className="initials-letter">{getInitials(person.name)}</div>}
        <div className="fw-bold">{person.name}</div>
        <div className={`num mt-1 fw-bold debt-value ${debtClassName(debt)}`}>{debt.toFixed(2)} €</div>
      </div>
      {isGroupOrder && (
        <div className={`multi-check ${isSelected ? 'multi-check-on' : ''}`}>
          {isSelected && <Icon name="check" size={14} />}
        </div>
      )}
    </button>
  )
})

function PersonGrid({ persons, firstIndex = 0, debts, isGroupOrder, selectedIds, onSelect, photos, children }) {
  return (
    <div className="grid-choices">
      {persons.map((person, index) => (
        <PersonCard
          key={person.id}
          person={person}
          debt={debts[person.id] ?? 0}
          isGroupOrder={isGroupOrder}
          isSelected={selectedIds.has(person.id)}
          onSelect={onSelect}
          enterIndex={firstIndex + index}
          canLoadPhoto={photos.canLoad(photos.indexOf(person))}
          onPhotoSettled={photos.onSettled}
        />
      ))}
      {children}
    </div>
  )
}

function AddGuestCard({ onClick }) {
  return (
    <button className="choice choice-initials" style={{ background: nameGradient('+ Hosť') }} onClick={onClick}>
      <div className="overlay">
        <div className="initials-letter"><Icon name="plus" size={34} /></div>
        <div className="fw-bold">Pridať hosťa</div>
      </div>
    </button>
  )
}

function GroupOrderToggle({ isGroupOrder, onToggle }) {
  return (
    <button
      className={`btn ${isGroupOrder ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-2 tap-target`}
      onClick={onToggle}
      aria-pressed={isGroupOrder}
    >
      <Icon name={isGroupOrder ? 'check' : 'users'} size={16} />
      Viac osôb
    </button>
  )
}

/** Photos load in the order people are shown, home members first. */
function usePhotoOrder(homeMembers, guests) {
  const order = useMemo(() => {
    const positions = new Map()
    for (const person of [...homeMembers, ...guests]) {
      if (avatarPhotoUrl(person)) positions.set(person.id, positions.size)
    }
    return positions
  }, [homeMembers, guests])

  const progressive = useProgressivePhotos(order.size)
  return { ...progressive, indexOf: (person) => order.get(person.id) }
}

export function PersonStep({
  homeMembers, guests, debts, isGroupOrder, selectedPersons,
  onToggleGroupOrder, onSelect, onAddGuest, onContinue,
}) {
  const selectedIds = new Set(selectedPersons.map((person) => person.id))
  const photos = usePhotoOrder(homeMembers, guests)
  const gridProps = { debts, isGroupOrder, selectedIds, onSelect, photos }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
        <h2 className="m-0 fs-lg">Vyber osobu</h2>
        <GroupOrderToggle isGroupOrder={isGroupOrder} onToggle={onToggleGroupOrder} />
      </div>

      <StepSection title="Domáci">
        <PersonGrid persons={homeMembers} {...gridProps} />
      </StepSection>

      <StepSection title="Hostia">
        <PersonGrid persons={guests} firstIndex={homeMembers.length} {...gridProps}>
          <AddGuestCard onClick={onAddGuest} />
        </PersonGrid>
      </StepSection>

      {isGroupOrder && selectedPersons.length > 0 && (
        <div className="fixed-bottom-button">
          <button className="btn btn-primary btn-lg" onClick={onContinue}>
            Pokračovať <span className="num">({selectedPersons.length})</span>
          </button>
        </div>
      )}
    </>
  )
}
