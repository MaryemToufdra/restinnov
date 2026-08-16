import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { fetchMissionsAgent, fetchProduitsCatalogue } from './api'
import { HistoriqueAgentSection } from './components/HistoriqueAgentSection'
import { MesMissionsSection } from './components/MesMissionsSection'
import { usePwaIdentity } from './pwa/usePwaIdentity'
import type { MissionMenage, ProduitCatalogue } from './types'

type Onglet = 'mes-missions' | 'en-attente' | 'refusees' | 'validees'

const ONGLETS: { id: Onglet; label: string; icon: string }[] = [
  { id: 'mes-missions', label: 'Mes missions', icon: '🧹' },
  { id: 'en-attente', label: 'En attente', icon: '⏳' },
  { id: 'refusees', label: 'Refusées', icon: '⚠️' },
  { id: 'validees', label: 'Validées', icon: '🗂️' },
]

/**
 * The cleaning agent's whole world: full screen, no Manager sidebar, no
 * Dashboard/Séjours/Appartements nav -- just their own missions, switched
 * via a simple four-tab bar (mes missions / en attente de validation /
 * refusées / validées). Reuses MesMissionsSection/MissionDetailAgent
 * unchanged from the Manager build.
 */
export function AgentWorkspace() {
  usePwaIdentity('menage')

  const { user, logout } = useAuth()
  const [catalogue, setCatalogue] = useState<ProduitCatalogue[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<Onglet>('mes-missions')
  const [missions, setMissions] = useState<MissionMenage[]>([])
  const [loadingMissions, setLoadingMissions] = useState(false)
  const [missionsError, setMissionsError] = useState<string | null>(null)

  const chargerMissions = () => {
    if (!user) return
    setLoadingMissions(true)
    setMissionsError(null)
    fetchMissionsAgent(user.id)
      .then(setMissions)
      .catch((err) => setMissionsError(err instanceof Error ? err.message : 'Impossible de charger les missions.'))
      .finally(() => setLoadingMissions(false))
  }

  useEffect(() => {
    fetchProduitsCatalogue()
      .then(setCatalogue)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Impossible de charger les données.'))
  }, [])

  useEffect(() => {
    chargerMissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const actives = missions.filter((m) => m.statut === 'a_faire' || m.statut === 'en_cours')
  const enAttente = missions.filter((m) => m.statut === 'en_attente_validation')
  const refusees = missions.filter((m) => m.statut === 'non_conforme')
  const refuseesNonVues = refusees.some((m) => m.refus?.some((r) => !r.vu))

  const counts: Partial<Record<Onglet, number>> = {
    'mes-missions': actives.length,
    'en-attente': enAttente.length,
    refusees: refusees.length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RestInnov" className="h-8 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ménage</h1>
            {user && <p className="text-xs text-gray-500">{user.nom}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout()
          }}
          className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          <span aria-hidden="true" className="text-xl">
            🚪
          </span>
          Déconnexion
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`relative flex min-h-12 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold ${
              onglet === o.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span aria-hidden="true" className="text-lg">
              {o.icon}
            </span>
            {o.label}
            {counts[o.id] !== undefined && <span className="text-xs font-normal">({counts[o.id]})</span>}
            {o.id === 'refusees' && refuseesNonVues && (
              <span
                data-testid="refusees-dot"
                role="status"
                aria-label="Nouveau refus"
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500"
              />
            )}
          </button>
        ))}
      </nav>

      <main className="px-4 py-6">
        {loadError && <p className="mb-4 text-sm text-red-600">{loadError}</p>}

        {onglet === 'mes-missions' && (
          <MesMissionsSection
            missions={actives}
            catalogue={catalogue}
            loading={loadingMissions}
            error={missionsError}
            heading="Mes missions du jour"
            subheading={user?.nom}
            emptyIcon="✅"
            emptyMessage="Aucune mission pour l'instant."
            onRefresh={chargerMissions}
          />
        )}
        {onglet === 'en-attente' && (
          <MesMissionsSection
            missions={enAttente}
            catalogue={catalogue}
            loading={loadingMissions}
            error={missionsError}
            emptyIcon="⏳"
            emptyMessage="Aucune mission en attente de validation."
            onRefresh={chargerMissions}
          />
        )}
        {onglet === 'refusees' && (
          <MesMissionsSection
            missions={refusees}
            catalogue={catalogue}
            loading={loadingMissions}
            error={missionsError}
            emptyIcon="🎉"
            emptyMessage="Aucune mission refusée."
            onRefresh={chargerMissions}
          />
        )}
        {onglet === 'validees' && <HistoriqueAgentSection />}
      </main>
    </div>
  )
}
