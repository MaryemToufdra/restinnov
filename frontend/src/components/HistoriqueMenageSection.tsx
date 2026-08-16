import { useEffect, useState } from 'react'
import { fetchHistoriqueMenage, resolveStorageUrl } from '../api'
import type { Appartement, HistoriqueMissionManager } from '../types'

interface HistoriqueMenageSectionProps {
  appartements: Appartement[]
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR')
}

function formatMad(value: number): string {
  return `${value.toFixed(2)} MAD`
}

function MissionRow({ mission }: { mission: HistoriqueMissionManager }) {
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
          <p className="font-medium text-gray-900">{mission.appartement?.nom ?? 'Appartement supprimé'}</p>
          <p className="text-sm text-gray-500">{mission.appartement?.adresse}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium text-gray-400">{mission.sejour.reference}</p>
          <p className="text-sm text-gray-700">{mission.sejour.nom_voyageur}</p>
          <p className="text-xs text-gray-500">
            {formatDate(mission.sejour.date_arrivee)} → {formatDate(mission.sejour.date_depart)}
          </p>
        </div>
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
              <ul className="mt-1 space-y-1 text-sm text-gray-700">
                {mission.produits.map((produit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {produit.photo_url && (
                      <img
                        src={resolveStorageUrl(produit.photo_url)}
                        alt={`Photo de "${produit.nom}"`}
                        className="h-6 w-6 rounded object-cover"
                      />
                    )}
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

export function HistoriqueMenageSection({ appartements }: HistoriqueMenageSectionProps) {
  const [missions, setMissions] = useState<HistoriqueMissionManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appartementFilter, setAppartementFilter] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    fetchHistoriqueMenage({
      appartementId: appartementFilter ? Number(appartementFilter) : undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
    })
      .then(setMissions)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger l'historique."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appartementFilter, dateDebut, dateFin])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        Historique des missions de ménage
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {missions.length}
        </span>
      </h2>

      <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="historique_menage_appartement" className="block text-xs font-medium text-gray-500">
            Appartement
          </label>
          <select
            id="historique_menage_appartement"
            value={appartementFilter}
            onChange={(e) => setAppartementFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {appartements.map((appartement) => (
              <option key={appartement.id} value={appartement.id}>
                {appartement.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="historique_menage_date_debut" className="block text-xs font-medium text-gray-500">
            Du
          </label>
          <input
            id="historique_menage_date_debut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="historique_menage_date_fin" className="block text-xs font-medium text-gray-500">
            Au
          </label>
          <input
            id="historique_menage_date_fin"
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && missions.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">Aucune mission de ménage validée pour l'instant.</p>
      )}

      {!loading && !error && missions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {missions.map((mission) => (
            <MissionRow key={mission.id} mission={mission} />
          ))}
        </ul>
      )}
    </div>
  )
}
