import { useEffect, useState } from 'react'
import { fetchMesTicketsMaintenanceHistorique, resolveStorageUrl } from '../api'
import type { HistoriqueTicketAgent } from '../types'
import { URGENCE_LABELS, URGENCE_STYLES } from '../utils/urgence'

function HistoriqueTicketRow({ ticket }: { ticket: HistoriqueTicketAgent }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="rounded-2xl border-2 border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex min-h-[80px] w-full items-center gap-4 p-4 text-left"
      >
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-3xl"
        >
          ✅
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-gray-900">
            {ticket.appartement?.nom ?? 'Appartement'}
            <span className="ml-2 text-xs font-normal text-gray-400">{ticket.reference}</span>
          </p>
          <p className="truncate text-sm text-gray-500">{ticket.appartement?.adresse}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${URGENCE_STYLES[ticket.urgence]}`}>
          Urgence {URGENCE_LABELS[ticket.urgence]}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xl text-gray-400">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
          {ticket.description_manager && <p className="text-gray-700">{ticket.description_manager}</p>}
          {ticket.photo_apres && (
            <img
              src={resolveStorageUrl(ticket.photo_apres)}
              alt="Photo après réparation"
              className="h-24 w-24 rounded-lg object-cover"
            />
          )}
          {ticket.cout_reparation != null && (
            <p className="font-medium text-gray-900">Coût : {ticket.cout_reparation} MAD</p>
          )}
          {ticket.note_resolution && <p className="text-gray-700">{ticket.note_resolution}</p>}
        </div>
      )}
    </li>
  )
}

export function HistoriqueTicketsAgentSection() {
  const [tickets, setTickets] = useState<HistoriqueTicketAgent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchMesTicketsMaintenanceHistorique()
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger l'historique."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Validés</h3>

      {loading && <p className="mt-4 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !error && tickets.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-5xl"
          >
            🗂️
          </div>
          <p className="text-base text-gray-500">Aucun ticket validé pour l'instant.</p>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {tickets.map((ticket) => (
          <HistoriqueTicketRow key={ticket.id} ticket={ticket} />
        ))}
      </ul>
    </div>
  )
}
