import { useCallback, useEffect, useRef, useState } from 'react'

// The top rows load at once; each finished photo then releases the next one, so the
// cards people see first are not slowed down by the ones further down.
const FIRST_BATCH = 8
const NEXT_BATCH = 4
// A photo that never reports back (a dead connection) must not stall the rest.
const STALL_TIMEOUT_MS = 4000

/**
 * Decides which photos may load yet. `canLoad(index)` answers for one photo and
 * `onSettled` is called once per photo, whether it loaded or failed.
 */
export function useProgressivePhotos(total) {
  const [allowed, setAllowed] = useState(FIRST_BATCH)
  const settledCount = useRef(0)

  const onSettled = useCallback(() => {
    settledCount.current += 1
    setAllowed((current) => (settledCount.current >= current ? current + NEXT_BATCH : current))
  }, [])

  useEffect(() => {
    if (allowed >= total) return
    const timer = setTimeout(() => setAllowed((current) => current + NEXT_BATCH), STALL_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [allowed, total])

  return { canLoad: (index) => index !== undefined && index < allowed, onSettled }
}
