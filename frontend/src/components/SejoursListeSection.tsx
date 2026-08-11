import { useEffect, useState } from 'react'
import {
  checkoutSejour,
  createFraisMaintenance,
  deleteFraisMaintenance,
  fetchSejour,
  fetchSejours,
  signalerProduit,
  updateMissionMenageProduits,
  validerMissionMenage,
  type NewFraisMaintenanceInput,
  type SignalerProduitInput,
  type UpdateMissionMenageProduitsInput,
} from '../api'
import type { Appartement, PlateformeOrigine, ProduitCatalogue, Sejour, SejourStatut } from '../types'
import { SejourCard } from './SejourCard'

interface SejoursListeSectionProps {
  appartements: Appartement[]
  catalogue: ProduitCatalogue[]
  onNavigateToCreer: () => void
  onEditSejour: (sejour: Sejour) => void
  initialStatutFilter?: SejourStatut | ''
  initialSejourId?: number | null
}

const PER_PAGE = 10

const STATUT_FILTER_OPTIONS: { value: SejourStatut | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Checkout effectué' },
]

const STATUT_BADGE_LABELS: Record<SejourStatut, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
}

const STATUT_BADGE_STYLES: Record<SejourStatut, string> = {
  a_venir: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-amber-100 text-amber-800',
  termine: 'bg-green-100 text-green-800',
}

const PLATEFORME_LABELS: Record<PlateformeOrigine, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  direct: 'Direct',
  autre: 'Autre',
}

const PLATEFORME_STYLES: Record<PlateformeOrigine, string> = {
  airbnb: 'bg-rose-100 text-rose-800',
  booking: 'bg-blue-100 text-blue-800',
  direct: 'bg-emerald-100 text-emerald-800',
  autre: 'bg-gray-100 text-gray-700',
}

function initiales(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487a2.06 2.06 0 112.914 2.914L7.5 19.677l-4 1 1-4L16.862 4.487z"
      />
    </svg>
  )
}

function SortArrow({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1 text-indigo-600">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function SejoursListeSection({
  appartements,
  catalogue,
  onNavigateToCreer,
  onEditSejour,
  initialStatutFilter,
  initialSejourId,
}: SejoursListeSectionProps) {
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<SejourStatut | ''>(initialStatutFilter ?? '')
  const [appartementFilter, setAppartementFilter] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [sortBy, setSortBy] = useState<'date_arrivee' | 'date_depart'>('date_arrivee')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [sejours, setSejours] = useState<Sejour[]>([])
  // Sejours fetched individually (e.g. opened directly from the Dashboard's
  // "Séjours récents"), which may not be part of the currently loaded page.
  const [extraSejours, setExtraSejours] = useState<Sejour[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSejourId, setSelectedSejourId] = useState<number | null>(initialSejourId ?? null)
  const [initialDetailLoading, setInitialDetailLoading] = useState(initialSejourId != null)

  const applySejourUpdate = (predicate: (sejour: Sejour) => boolean, updater: (sejour: Sejour) => Sejour) => {
    setSejours((current) => current.map((s) => (predicate(s) ? updater(s) : s)))
    setExtraSejours((current) => current.map((s) => (predicate(s) ? updater(s) : s)))
  }

  useEffect(() => {
    if (initialSejourId == null) return

    let cancelled = false
    fetchSejour(initialSejourId)
      .then((sejour) => {
        if (cancelled) return
        setExtraSejours((current) => (current.some((s) => s.id === sejour.id) ? current : [...current, sejour]))
      })
      .catch(() => {
        // The detail view simply won't have anything to show; the normal
        // list below is unaffected.
      })
      .finally(() => {
        if (!cancelled) setInitialDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Only ever runs for the id this component was mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSejours({
      search: search || undefined,
      statut: statutFilter || undefined,
      appartement_id: appartementFilter ? Number(appartementFilter) : undefined,
      date_debut: dateDebut || undefined,
      date_fin: dateFin || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      per_page: PER_PAGE,
    })
      .then((res) => {
        if (cancelled) return
        setSejours(res.data)
        setMeta({ current_page: res.current_page, last_page: res.last_page, total: res.total })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les séjours.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, statutFilter, appartementFilter, dateDebut, dateFin, sortBy, sortDir, page])

  const handleSort = (column: 'date_arrivee' | 'date_depart') => {
    if (sortBy === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(1)
  }

  const handleCheckout = async (id: number) => {
    const { sejour: updated, mission_menage } = await checkoutSejour(id)
    applySejourUpdate(
      (s) => s.id === id,
      (s) => ({ ...s, statut: updated.statut, mission_menage }),
    )
  }

  const handleValiderMission = async (missionMenageId: number) => {
    const updated = await validerMissionMenage(missionMenageId)
    applySejourUpdate(
      (s) => s.mission_menage?.id === missionMenageId,
      (s) => ({ ...s, mission_menage: updated }),
    )
  }

  const handleUpdateMissionProduits = async (missionMenageId: number, input: UpdateMissionMenageProduitsInput) => {
    const updated = await updateMissionMenageProduits(missionMenageId, input)
    applySejourUpdate(
      (s) => s.mission_menage?.id === missionMenageId,
      (s) => ({ ...s, mission_menage: updated }),
    )
  }

  const handleSignalerProduit = async (missionMenageId: number, input: SignalerProduitInput) => {
    await signalerProduit(missionMenageId, input)
  }

  const handleAddFraisMaintenance = async (sejourId: number, input: NewFraisMaintenanceInput) => {
    const created = await createFraisMaintenance(sejourId, input)
    applySejourUpdate(
      (s) => s.id === sejourId,
      (s) => ({ ...s, frais_maintenance: [...(s.frais_maintenance ?? []), created] }),
    )
  }

  const handleDeleteFraisMaintenance = async (id: number) => {
    await deleteFraisMaintenance(id)
    applySejourUpdate(
      () => true,
      (s) => ({ ...s, frais_maintenance: (s.frais_maintenance ?? []).filter((f) => f.id !== id) }),
    )
  }

  const selectedSejour =
    sejours.find((s) => s.id === selectedSejourId) ?? extraSejours.find((s) => s.id === selectedSejourId) ?? null

  if (initialDetailLoading) {
    return <p className="text-sm text-gray-500">Chargement du séjour...</p>
  }

  if (selectedSejour) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedSejourId(null)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Retour à la liste
        </button>
        <ul className="mt-4 space-y-3">
          <SejourCard
            sejour={selectedSejour}
            catalogue={catalogue}
            onCheckout={handleCheckout}
            onValiderMission={handleValiderMission}
            onUpdateMissionProduits={handleUpdateMissionProduits}
            onSignalerProduit={handleSignalerProduit}
            onAddFraisMaintenance={handleAddFraisMaintenance}
            onDeleteFraisMaintenance={handleDeleteFraisMaintenance}
          />
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Séjours</h3>
          <p className="text-sm text-gray-500">{meta.total} séjours trouvés</p>
        </div>
        <button
          type="button"
          onClick={onNavigateToCreer}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nouveau séjour
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="sejours_search" className="block text-xs font-medium text-gray-500">
            Recherche
          </label>
          <input
            id="sejours_search"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Voyageur ou appartement"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sejours_statut" className="block text-xs font-medium text-gray-500">
            Statut
          </label>
          <select
            id="sejours_statut"
            value={statutFilter}
            onChange={(e) => {
              setStatutFilter(e.target.value as SejourStatut | '')
              setPage(1)
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {STATUT_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sejours_appartement" className="block text-xs font-medium text-gray-500">
            Appartement
          </label>
          <select
            id="sejours_appartement"
            value={appartementFilter}
            onChange={(e) => {
              setAppartementFilter(e.target.value)
              setPage(1)
            }}
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
          <label htmlFor="sejours_date_debut" className="block text-xs font-medium text-gray-500">
            Arrivée du
          </label>
          <input
            id="sejours_date_debut"
            type="date"
            value={dateDebut}
            onChange={(e) => {
              setDateDebut(e.target.value)
              setPage(1)
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sejours_date_fin" className="block text-xs font-medium text-gray-500">
            Arrivée au
          </label>
          <input
            id="sejours_date_fin"
            type="date"
            value={dateFin}
            onChange={(e) => {
              setDateFin(e.target.value)
              setPage(1)
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && sejours.length === 0 && (
        <p className="text-sm text-gray-500">Aucun séjour trouvé.</p>
      )}

      {!loading && !error && sejours.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Voyageur principal</th>
                <th className="px-4 py-2">Appartement</th>
                <th className="px-4 py-2">
                  <button type="button" onClick={() => handleSort('date_arrivee')} className="flex items-center">
                    Arrivée
                    <SortArrow active={sortBy === 'date_arrivee'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-2">
                  <button type="button" onClick={() => handleSort('date_depart')} className="flex items-center">
                    Départ
                    <SortArrow active={sortBy === 'date_depart'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-2">Nb voyageurs</th>
                <th className="px-4 py-2">Plateforme</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sejours.map((sejour) => (
                <tr key={sejour.id}>
                  <td className="px-4 py-3 text-gray-700" data-testid={`sejour-reference-${sejour.id}`}>
                    {sejour.reference}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {initiales(sejour.nom_voyageur)}
                      </span>
                      <span className="font-medium text-gray-900">{sejour.nom_voyageur}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {sejour.appartement?.nom ?? `Appartement #${sejour.appartement_id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{sejour.date_arrivee}</td>
                  <td className="px-4 py-3 text-gray-700">{sejour.date_depart}</td>
                  <td className="px-4 py-3 text-gray-700">{sejour.voyageurs_count ?? sejour.voyageurs?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATEFORME_STYLES[sejour.plateforme_origine]}`}
                    >
                      {PLATEFORME_LABELS[sejour.plateforme_origine]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_BADGE_STYLES[sejour.statut]}`}
                    >
                      {STATUT_BADGE_LABELS[sejour.statut]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Modifier le séjour de ${sejour.nom_voyageur}`}
                        title={
                          sejour.statut === 'termine'
                            ? 'Ce séjour est terminé et ne peut plus être modifié.'
                            : undefined
                        }
                        disabled={sejour.statut === 'termine'}
                        onClick={() => onEditSejour(sejour)}
                        className="text-gray-500 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:text-gray-300"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Voir le détail du séjour de ${sejour.nom_voyageur}`}
                        onClick={() => setSelectedSejourId(sejour.id)}
                        className="text-gray-500 hover:text-indigo-600"
                      >
                        <EyeIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={meta.current_page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Précédent
          </button>
          <div className="flex gap-1">
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === meta.current_page ? 'page' : undefined}
                className={`h-8 w-8 rounded-md text-sm font-medium ${
                  p === meta.current_page
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={meta.current_page >= meta.last_page}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
