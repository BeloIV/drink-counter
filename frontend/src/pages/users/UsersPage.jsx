import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { PageHeader } from '../../components/PageHeader'
import { PinLoginCard } from '../../components/PinLogin'
import { Skeleton } from '../../components/Skeleton'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useDialog } from '../../lib/dialogContext'
import { UserCard } from './UserCard'
import { UserEditForm } from './UserEditForm'

const PAGE_TITLE = 'Používatelia'

function UserGridSkeleton() {
  return (
    <div className="row g-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="col-12 col-md-6 col-lg-4" key={index}>
          <Skeleton height={220} radius="var(--radius-lg)" />
        </div>
      ))}
    </div>
  )
}

function StatusMessage({ message }) {
  if (!message) return null
  return (
    <div className={`alert ${message.tone === 'ok' ? 'alert-success' : 'alert-danger'} mb-4`} role="status">
      {message.text}
    </div>
  )
}

function personFormData({ name, email, avatarFile }) {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('email', email)
  if (avatarFile) formData.append('avatar', avatarFile)
  return formData
}

function useUserManagement() {
  const dialog = useDialog()
  const [persons, setPersons] = useState([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const loadPersons = useCallback(async () => {
    setIsLoadingList(true)
    try {
      setPersons(await api.persons())
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const runBusy = async (task, failureText) => {
    setIsBusy(true)
    setMessage(null)
    try {
      await task()
    } catch {
      setMessage({ tone: 'error', text: failureText })
    } finally {
      setIsBusy(false)
    }
  }

  const save = (form) =>
    runBusy(async () => {
      await api.updatePerson(editingId, personFormData(form))
      setMessage({ tone: 'ok', text: 'Zmeny sú uložené.' })
      loadPersons()
      setEditingId(null)
    }, 'Zmeny sa nepodarilo uložiť.')

  const remove = async (person) => {
    const confirmed = await dialog.confirm({
      title: `Odstrániť ${person.name}?`,
      text: 'Osoba zmizne zo zoznamu. Túto akciu nie je možné vrátiť späť.',
      confirmLabel: 'Odstrániť',
      tone: 'danger',
    })
    if (!confirmed) return
    await runBusy(async () => {
      await api.deletePerson(person.id)
      setMessage({ tone: 'ok', text: `${person.name} bol odstránený.` })
      loadPersons()
    }, 'Odstránenie sa nepodarilo.')
  }

  const startEdit = (person) => {
    setEditingId(person.id)
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setMessage(null)
  }

  return {
    persons, isLoadingList, isBusy, message, editingId, loadPersons, save, remove, startEdit, cancelEdit,
    showError: (text) => setMessage({ tone: 'error', text }),
  }
}

function UserGrid({ users }) {
  if (users.isLoadingList && users.persons.length === 0) return <UserGridSkeleton />
  if (users.persons.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Žiadni používatelia"
        text="Osoby pribudnú, keď si ich pridáš na domovskej obrazovke alebo v Admine."
      />
    )
  }
  return (
    <div className="row g-4">
      {users.persons.map((person) => (
        <div key={person.id} className="col-12 col-md-6 col-lg-4">
          {users.editingId === person.id ? (
            <UserEditForm
              person={person}
              isSaving={users.isBusy}
              onSave={users.save}
              onCancel={users.cancelEdit}
              onError={users.showError}
            />
          ) : (
            <UserCard person={person} isBusy={users.isBusy} onEdit={users.startEdit} onDelete={users.remove} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function UsersPage() {
  const users = useUserManagement()
  const auth = useAdminAuth(users.loadPersons)

  if (auth.isChecking) {
    return (
      <div className="container py-3">
        <PageHeader title={PAGE_TITLE} icon="users" />
        <UserGridSkeleton />
      </div>
    )
  }

  if (!auth.isAdmin) {
    return (
      <div className="container py-3">
        <PageHeader title={PAGE_TITLE} icon="users" />
        <PinLoginCard title="Správa používateľov" onLogin={auth.login}>
          <Link to="/admin" className="btn btn-outline-secondary w-100 mt-3 d-flex align-items-center justify-content-center gap-2">
            <Icon name="back" size={16} /> Späť na Admin
          </Link>
        </PinLoginCard>
      </div>
    )
  }

  return (
    <div className="container py-3">
      <PageHeader title={PAGE_TITLE} icon="users">
        <button onClick={auth.logout} className="btn btn-sm btn-outline-secondary">Odhlásiť</button>
      </PageHeader>
      <StatusMessage message={users.message} />
      <UserGrid users={users} />
    </div>
  )
}
