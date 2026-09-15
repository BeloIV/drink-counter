/* Skeletony kopírujúce tvar obsahu — nahrádzajú text „Načítavam…“
   a generický spinner. */
export function Skeleton({ h = 16, w = '100%', r, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, width: w, ...(r ? { borderRadius: r } : {}), ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCards({ count = 4, h = 92 }) {
  return (
    <div className="row g-3" aria-busy="true" aria-label="Načítavam">
      {Array.from({ length: count }, (_, i) => (
        <div className="col-6 col-md-3" key={i}>
          <Skeleton h={h} r="var(--radius-lg)" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 6, h = 44 }) {
  return (
    <div className="d-flex flex-column gap-2" aria-busy="true" aria-label="Načítavam">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} h={h} r="var(--radius-md)" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid-choices" aria-busy="true" aria-label="Načítavam">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ aspectRatio: 1, borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  )
}
