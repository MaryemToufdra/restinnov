import { useEffect, useState } from 'react'
import { fetchTicketsMaintenance, resolveStorageUrl, validerResolutionTicketMaintenance } from '../api'
import type { TicketMaintenance } from '../types'

function ResolutionCard({
  ticket,
  onValider,
}: {
  ticket: TicketMaintenance
  onValider: (ticketId: number) => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleValider = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await onValider(ticket.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className="rounded-md border border-gray-200 p-4">
      <div>
        <p className="font-medium text-gray-900">{ticket.appartement?.nom ?? `Appartement #${ticket.appartement_id}`}</p>
        <p className="text-sm text-gray-500">{ticket.appartement?.adresse}</p>
      </div>

      {ticket.description_manager && <p className="mt-2 text-sm text-gray-700">{ticket.description_manager}</p>}

      {ticket.photo_apres && (
        <img
          src={resolveStorageUrl(ticket.photo_apres)}
          alt="Photo après réparation"
          className="mt-2 h-32 w-32 rounded-md object-cover"
        />
      )}

      {ticket.cout_reparation != null && (
        <p className="mt-2 text-sm font-medium text-gray-900">Coût : {ticket.cout_reparation} MAD</p>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={handleValider}
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Validation...' : 'Valider'}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </li>
  )
}

export function ResolutionsAValiderSection() {
  const [tickets, setTickets] = useState<TicketMaintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchTicketsMaintenance('resolu_en_attente_validation')
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les résolutions.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleValider = async (ticketId: number) => {
    await validerResolutionTicketMaintenance(ticketId)
    setTickets((current) => current.filter((t) => t.id !== ticketId))
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        Résolutions à valider
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {tickets.length}
        </span>
      </h2>

      {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && tickets.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Aucune résolution en attente de validation.</p>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="mt-3 space-y-3">
          {tickets.map((ticket) => (
            <ResolutionCard key={ticket.id} ticket={ticket} onValider={handleValider} />
          ))}
        </ul>
      )}
    </div>
  )
}
