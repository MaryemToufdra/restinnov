import { useEffect, useState } from 'react'
import { fetchAppartementHistorique, resolveStorageUrl } from '../api'
import type { HistoriqueMission } from '../types'

interface AppartementHistoriqueSectionProps {
  appartementId: number
}

const STATUT_LABELS: Record<string, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_attente_validation: 'En attente de validation',
  conforme: 'Conforme',
  non_conforme: 'Non conforme',
}

const STATUT_STYLES: Record<string, string> = {
  a_faire: 'bg-gray-100 text-gray-600',
  en_cours: 'bg-amber-100 text-amber-800',
  en_attente_validation: 'bg-purple-100 text-purple-800',
  conforme: 'bg-green-100 text-green-800',
  non_conforme: 'bg-red-100 text-red-800',
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}

function formatMad(value: number): string {
  return `${value.toFixed(2)} MAD`
}

function MissionRow({ mission }: { mission: HistoriqueMission }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400">{mission.sejour.reference}</p>
          <p className="font-medium text-gray-900">{mission.sejour.nom_voyageur}</p>
          <p className="text-sm text-gray-500">
            {formatDate(mission.sejour.date_arrivee)} → {formatDate(mission.sejour.date_depart)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUT_STYLES[mission.statut] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATUT_LABELS[mission.statut] ?? mission.statut}
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
                  <li key={index}>
                    {produit.nom} — {formatMad(produit.prix)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-sm text-gray-700">
            <p>Forfait : {formatMad(mission.frais_forfait)}</p>
            <p>Produits : {formatMad(mission.frais_produits_total)}</p>
            <p className="font-medium text-gray-900">Total : {formatMad(mission.frais_total)}</p>
          </div>
        </div>
      )}
    </li>
  )
}

export function AppartementHistoriqueSection({ appartementId }: AppartementHistoriqueSectionProps) {
  const [missions, setMissions] = useState<HistoriqueMission[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAppartementHistorique(appartementId)
      .then((data) => {
        if (!cancelled) setMissions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger l'historique.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [appartementId])

  if (loading) {
    return <p className="text-sm text-gray-500">Chargement de l'historique...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!missions || missions.length === 0) {
    return <p className="text-sm text-gray-500">Aucune mission de ménage pour cet appartement.</p>
  }

  return <ul className="space-y-2">{missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}</ul>
}
