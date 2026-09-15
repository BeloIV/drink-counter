// api.js puts the raw response body into Error.message.
const parseBody = (error) => JSON.parse(error?.message)

/** The backend's `{ error }` text when there is one, otherwise the raw message. */
export function errorMessage(error) {
  const raw = error?.message || String(error)
  try {
    return parseBody(error).error || raw
  } catch {
    return raw
  }
}

/** DRF validation errors as "field: problem | field: problem", or null when the body is not JSON. */
export function fieldErrorSummary(error) {
  try {
    return Object.entries(parseBody(error))
      .map(([field, problems]) => `${field}: ${Array.isArray(problems) ? problems.join(', ') : problems}`)
      .join(' | ')
  } catch {
    return null
  }
}
