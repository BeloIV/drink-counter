/** The JSON body of a failed request (api.js puts the raw body into Error.message), or null. */
export function parseErrorBody(error) {
  try {
    const body = JSON.parse(error?.message)
    return body && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

/** DRF validation errors as "field: problem | field: problem", or null when the body is not JSON. */
export function fieldErrorSummary(error) {
  const body = parseErrorBody(error)
  if (!body) return null
  return Object.entries(body)
    .map(([field, problems]) => `${field}: ${Array.isArray(problems) ? problems.join(', ') : problems}`)
    .join(' | ')
}

/** The backend's `{ error }` text when there is one, then field errors, then the raw message. */
export function errorMessage(error) {
  const raw = error?.message || String(error)
  const body = parseErrorBody(error)
  if (!body) return raw
  if (body.error) return [].concat(body.error).join(' ')
  return fieldErrorSummary(error) || raw
}
