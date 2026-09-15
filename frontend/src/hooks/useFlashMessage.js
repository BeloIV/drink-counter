import { useCallback, useEffect, useState } from 'react'

/** A status message that clears itself after a delay. */
export function useFlashMessage(defaultDurationMs) {
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), flash.durationMs)
    return () => clearTimeout(timer)
  }, [flash])

  const show = useCallback(
    (text, durationMs = defaultDurationMs) => setFlash({ text, durationMs }),
    [defaultDurationMs],
  )

  return { message: flash?.text ?? '', durationMs: flash?.durationMs, show }
}
