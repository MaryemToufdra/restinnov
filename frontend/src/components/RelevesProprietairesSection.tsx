import { useEffect, useState } from 'react'
import { downloadRelevePdf, fetchAppartements, fetchReleve } from '../api'
import type { Appartement, Releve } from '../types'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMontant(value: number | undefined): string {
  return `${(value ?? 0).toFixed(2)} MAD`
}

/**
 * Self-contained, like TicketsMaintenanceSection: fetches its own
 * appartements + one releve per appartement for the selected month,
 * independent of the lighter dashboard aggregate payload (which has no
 * proprietaire info).
 */
export function RelevesProprietairesSection() {
  const [mois, setMois] = useState(currentMonth())
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [releves, setReleves] = useState<Record<number, Releve>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAppartements()
      .then(async (data) => {
        if (cancelled) return
        setAppartements(data)

        const entries = await Promise.all(
          data.map(async (appartement) => [appartement.id, await fetchReleve(appartement.id, mois)] as const),
        )
        if (cancelled) return
        setReleves(Object.fromEntries(entries))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les relevés.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mois])

  const handleDownload = async (appartementId: number) => {
    setError(null)
    setDownloadingId(appartementId)
    try {
      await downloadRelevePdf(appartementId, mois)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de télécharger le PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Relevés propriétaires</h3>
        <div>
          <label htmlFor="releves_mois" className="sr-only">
            Mois
          </label>
          <input
            id="releves_mois"
            type="month"
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {loading && <p className="mt-3 text-sm text-gray-500">Chargement...</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!loading && !error && appartements.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">Aucun appartement pour le moment.</p>
      )}

      {!loading && !error && appartements.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500">
                <th className="py-2 pr-4">Appartement</th>
                <th className="py-2 pr-4">Propriétaire</th>
                <th className="py-2 pr-4">Revenus</th>
                <th className="py-2 pr-4">Frais</th>
                <th className="py-2 pr-4">Montant dû</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appartements.map((appartement) => {
                const releve = releves[appartement.id]
                const frais = releve ? releve.frais_menage_total + releve.frais_maintenance_total : 0

                return (
                  <tr key={appartement.id}>
                    <td className="py-2 pr-4 text-gray-900">{appartement.nom}</td>
                    <td className="py-2 pr-4 text-gray-700">{appartement.proprietaire?.nom ?? 'Aucun'}</td>
                    <td className="py-2 pr-4 text-gray-700">{formatMontant(releve?.revenus_bruts)}</td>
                    <td className="py-2 pr-4 text-gray-700">{formatMontant(frais)}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {formatMontant(releve?.montant_proprietaire)}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => handleDownload(appartement.id)}
                        disabled={downloadingId === appartement.id}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                      >
                        {downloadingId === appartement.id ? 'Téléchargement...' : 'Télécharger PDF'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
