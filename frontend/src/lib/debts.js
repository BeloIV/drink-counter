/** Map person id → open debt in euros from a `/session/active` response. */
export function debtsByPerson(sessionSummary) {
  const debts = {}
  for (const row of sessionSummary?.per_person || []) {
    debts[row.person_id] = Number(row.total_eur || 0)
  }
  return debts
}
