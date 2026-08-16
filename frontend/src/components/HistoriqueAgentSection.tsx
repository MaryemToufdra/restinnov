import { useEffect, useState } from 'react'
import { fetchHistoriqueAgent, resolveStorageUrl } from '../api'
import type { HistoriqueMissionAgent } from '../types'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}

function HistoriqueRow({ mission }: { mission: HistoriqueMissionAgent }) {
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
          <p className="truncate text-lg font-semibold text-gray-900">{mission.appartement?.nom ?? 'Appartement'}</p>
          <p className="truncate text-sm text-gray-500">{mission.appartement?.adresse}</p>
          <p className="text-xs text-gray-400">{formatDate(mission.sejour.date_depart)}</p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-xl text-gray-400">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Checklist{mission.checklist_modeles_utilises.length > 0 ? ` (${mission.checklist_modeles_utilises.join(', ')})` : ''}
            </p>
            {mission.checklist_items.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">Aucun item de checklist.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {mission.checklist_items.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span
                      aria-label={item.coche ? 'Coché' : 'Non coché'}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.coche ? 'bg-emerald-600 text-white' : 'border border-gray-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={item.coche ? 'text-gray-700' : 'text-gray-500'}>{item.libelle}</span>
                    {item.photo_url && (
                      <img
                        src={resolveStorageUrl(item.photo_url)}
                        alt={`Photo de "${item.libelle}"`}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Produits utilisés</p>
            {mission.produits.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">Aucun produit.</p>
            ) : (
              <ul className="mt-1 text-sm text-gray-700">
                {mission.produits.map((produit, index) => (
                  <li key={index}>{produit.nom}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export function HistoriqueAgentSection() {
  const [missions, setMissions] = useState<HistoriqueMissionAgent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchHistoriqueAgent()
      .then(setMissions)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger l'historique."))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Validées</h3>

      {loading && <p className="mt-4 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !error && missions.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-5xl"
          >
            🗂️
          </div>
          <p className="text-base text-gray-500">Aucun ménage validé pour l'instant.</p>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {missions.map((mission) => (
          <HistoriqueRow key={mission.id} mission={mission} />
        ))}
      </ul>
    </div>
  )
}
