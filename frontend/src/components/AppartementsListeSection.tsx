import { useEffect, useState } from 'react'
import { fetchAppartementsListe, resolveStorageUrl } from '../api'
import type { Appartement } from '../types'

interface AppartementsListeSectionProps {
  onNavigateToCreer: () => void
  onEditAppartement: (appartement: Appartement) => void
}

const PER_PAGE = 10

const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  en_menage: 'En ménage',
}

const STATUT_STYLES: Record<string, string> = {
  disponible: 'bg-green-100 text-green-800',
  occupe: 'bg-gray-100 text-gray-600',
  en_menage: 'bg-purple-100 text-purple-800',
}

function StatutBadge({ statut }: { statut: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLES[statut] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUT_LABELS[statut] ?? statut}
    </span>
  )
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

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Aucun'
  return new Date(value).toLocaleDateString('fr-FR')
}

export function AppartementsListeSection({ onNavigateToCreer, onEditAppartement }: AppartementsListeSectionProps) {
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAppartementId, setSelectedAppartementId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAppartementsListe({
      search: search || undefined,
      statut: statutFilter || undefined,
      sort_by: 'nom',
      sort_dir: sortDir,
      page,
      per_page: PER_PAGE,
    })
      .then((res) => {
        if (cancelled) return
        setAppartements(res.data)
        setMeta({ current_page: res.current_page, last_page: res.last_page, total: res.total })
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les appartements.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, statutFilter, sortDir, page])

  const handleSortNom = () => {
    setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    setPage(1)
  }

  const selectedAppartement = appartements.find((a) => a.id === selectedAppartementId) ?? null

  if (selectedAppartement) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedAppartementId(null)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Retour à la liste
        </button>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-4">
            {selectedAppartement.photo_principale && (
              <img
                src={resolveStorageUrl(selectedAppartement.photo_principale)}
                alt={selectedAppartement.nom}
                className="h-24 w-24 rounded-md object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedAppartement.nom}</h3>
              <p className="text-sm text-gray-600">{selectedAppartement.adresse}</p>
              <div className="mt-2">
                <StatutBadge statut={selectedAppartement.statut} />
              </div>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Checklist assignée</dt>
              <dd className="text-gray-900">{selectedAppartement.checklist_modele?.nom ?? 'Aucune'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Agent habituel</dt>
              <dd className="text-gray-900">{selectedAppartement.agent_habituel?.nom ?? 'Aucun'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Nombre de séjours</dt>
              <dd className="text-gray-900">{selectedAppartement.sejours_count ?? 0}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dernier séjour</dt>
              <dd className="text-gray-900">{formatDate(selectedAppartement.dernier_sejour)}</dd>
            </div>
          </dl>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Appartements</h3>
          <p className="text-sm text-gray-500">{meta.total} appartements trouvés</p>
        </div>
        <button
          type="button"
          onClick={onNavigateToCreer}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Nouvel appartement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div>
          <label htmlFor="appartements_search" className="block text-xs font-medium text-gray-500">
            Recherche
          </label>
          <input
            id="appartements_search"
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Nom ou adresse"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="appartements_statut" className="block text-xs font-medium text-gray-500">
            Statut
          </label>
          <select
            id="appartements_statut"
            value={statutFilter}
            onChange={(e) => {
              setStatutFilter(e.target.value)
              setPage(1)
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="disponible">Disponible</option>
            <option value="occupe">Occupé</option>
            <option value="en_menage">En ménage</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && appartements.length === 0 && (
        <p className="text-sm text-gray-500">Aucun appartement trouvé.</p>
      )}

      {!loading && !error && appartements.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="px-4 py-2">Photo</th>
                <th className="px-4 py-2">
                  <button type="button" onClick={handleSortNom} className="flex items-center">
                    Nom
                    <span className="ml-1 text-indigo-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </th>
                <th className="px-4 py-2">Adresse</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Checklist</th>
                <th className="px-4 py-2">Agent habituel</th>
                <th className="px-4 py-2">Nb séjours</th>
                <th className="px-4 py-2">Dernier séjour</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appartements.map((appartement) => (
                <tr key={appartement.id}>
                  <td className="px-4 py-3">
                    {appartement.photo_principale ? (
                      <img
                        src={resolveStorageUrl(appartement.photo_principale)}
                        alt={appartement.nom}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{appartement.nom}</td>
                  <td className="px-4 py-3 text-gray-700">{appartement.adresse}</td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={appartement.statut} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{appartement.checklist_modele?.nom ?? 'Aucune'}</td>
                  <td className="px-4 py-3 text-gray-700">{appartement.agent_habituel?.nom ?? 'Aucun'}</td>
                  <td className="px-4 py-3 text-gray-700">{appartement.sejours_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(appartement.dernier_sejour)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Modifier l'appartement ${appartement.nom}`}
                        onClick={() => onEditAppartement(appartement)}
                        className="text-gray-500 hover:text-indigo-600"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Voir le détail de l'appartement ${appartement.nom}`}
                        onClick={() => setSelectedAppartementId(appartement.id)}
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
                  p === meta.current_page ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
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
