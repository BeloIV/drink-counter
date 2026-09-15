import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export default function NotFoundPage() {
  return (
    <div className="container py-3">
      <PageHeader title="Stránka sa nenašla" icon="search" />
      <EmptyState
        icon="search"
        title="Tu nič nie je"
        text="Adresa, ktorú si otvoril, v appke neexistuje. Skús to cez menu alebo sa vráť na domovskú obrazovku."
        action={<Link to="/" className="btn btn-primary mt-3">Späť na domov</Link>}
      />
    </div>
  )
}
