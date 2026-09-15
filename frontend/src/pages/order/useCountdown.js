import { useEffect, useRef, useState } from 'react'

/** Counts down one second at a time and calls `onFinish` at zero. */
export function useCountdown(onFinish) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) {
      onFinishRef.current()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return {
    secondsLeft,
    start: (seconds) => setSecondsLeft(seconds),
    stop: () => setSecondsLeft(null),
  }
}
