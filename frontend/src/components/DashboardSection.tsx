import type { DashboardData } from '../types'

interface DashboardSectionProps {
  data: DashboardData | null
  loading: boolean
  error: string | null
}

const STATUT_LABELS: Record<keyof DashboardData['sejours_par_statut'], string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
}

function formatMad(value: number): string {
  return `${value.toFixed(2)} MAD`
}

export function DashboardSection({ data, loading, error }: DashboardSectionProps) {
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
          <ul className="mt-3 space-y-1">
            {data.appartements.map((appartement) => (
              <li key={appartement.id} className="flex items-center justify-between text-sm text-gray-700">
                <span>{appartement.nom}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    appartement.statut === 'disponible'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {appartement.statut === 'disponible' ? 'Disponible' : appartement.statut}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
