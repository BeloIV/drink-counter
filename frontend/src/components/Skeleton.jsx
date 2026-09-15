// Loading placeholders shaped like the content they stand in for.

const indexes = (count) => Array.from({ length: count }, (_, index) => index)

export function Skeleton({ height = 16, width = '100%', radius, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, ...(radius ? { borderRadius: radius } : {}), ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCards({ count = 4, height = 92 }) {
  return (
    <div className="row g-3" aria-busy="true" aria-label="Načítavam">
      {indexes(count).map((index) => (
        <div className="col-6 col-md-3" key={index}>
          <Skeleton height={height} radius="var(--radius-lg)" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 6, height = 44 }) {
  return (
    <div className="d-flex flex-column gap-2" aria-busy="true" aria-label="Načítavam">
      {indexes(count).map((index) => (
        <Skeleton key={index} height={height} radius="var(--radius-md)" style={{ opacity: 1 - index * 0.12 }} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid-choices" aria-busy="true" aria-label="Načítavam">
      {indexes(count).map((index) => (
        <div key={index} className="skeleton skeleton-square" />
      ))}
    </div>
  )
}
