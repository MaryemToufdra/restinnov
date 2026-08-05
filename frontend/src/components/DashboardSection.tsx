import type { DashboardData } from '../types'

interface DashboardSectionProps {
  data: DashboardData | null
  loading: boolean
  error: string | null
  onNavigateToAppartements?: () => void
}

const STATUT_LABELS: Record<keyof DashboardData['sejours_par_statut'], string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
}

function formatMad(value: number): string {
  return `${value.toFixed(2)} MAD`
}

function formatDate(value: string | null): string {
  if (!value) return 'Aucun'
  return new Date(value).toLocaleDateString('fr-FR')
}

export function DashboardSection({ data, loading, error, onNavigateToAppartements }: DashboardSectionProps) {
  if (loading) {
    return <p className="text-sm text-gray-500">Chargement du dashboard...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Revenus totaux</p>
          <p className="mt-1 text-xl font-semibold text-gray-900" data-testid="dashboard-revenus-totaux">
            {formatMad(data.revenus_totaux)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Frais de ménage totaux</p>
          <p className="mt-1 text-xl font-semibold text-gray-900" data-testid="dashboard-frais-menage-totaux">
            {formatMad(data.frais_menage_totaux)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Frais de maintenance totaux</p>
          <p
            className="mt-1 text-xl font-semibold text-gray-900"
            data-testid="dashboard-frais-maintenance-totaux"
          >
            {formatMad(data.frais_maintenance_totaux)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Résultat net</p>
          <p
            className={`mt-1 text-xl font-semibold ${data.resultat_net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            data-testid="dashboard-resultat-net"
          >
            {formatMad(data.resultat_net)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Hors commission propriétaire (non incluse pour le moment)</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700">Séjours par statut</h3>
        <div className="mt-3 flex flex-wrap gap-4">
          {(Object.keys(STATUT_LABELS) as (keyof DashboardData['sejours_par_statut'])[]).map((statut) => (
            <div key={statut} className="text-sm text-gray-700">
              <span className="font-medium">{data.sejours_par_statut[statut]}</span>{' '}
              {STATUT_LABELS[statut]}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700">Appartements</h3>
        {data.appartements.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Aucun appartement pour le moment.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase text-gray-500">
                  <th className="py-2 pr-4">Nom</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Séjours</th>
                  <th className="py-2 pr-4">Dernier séjour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.appartements.map((appartement) => (
                  <tr
                    key={appartement.id}
                    onClick={() => onNavigateToAppartements?.()}
                    className={onNavigateToAppartements ? 'cursor-pointer hover:bg-gray-50' : undefined}
                  >
                    <td className="py-2 pr-4 text-gray-900">{appartement.nom}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          appartement.statut === 'disponible'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {appartement.statut === 'disponible' ? 'Disponible' : appartement.statut}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{appartement.sejours_count}</td>
                    <td className="py-2 pr-4 text-gray-700">{formatDate(appartement.dernier_sejour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
