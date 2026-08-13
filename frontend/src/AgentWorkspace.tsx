import { useEffect, useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { fetchProduitsCatalogue } from './api'
import { MesMissionsSection } from './components/MesMissionsSection'
import { usePwaIdentity } from './pwa/usePwaIdentity'
import type { ProduitCatalogue } from './types'

/**
 * The cleaning agent's whole world: full screen, no Manager sidebar, no
 * Dashboard/Séjours/Appartements nav -- just their own missions. Reuses
 * MesMissionsSection/MissionDetailAgent unchanged from the Manager build.
 */
export function AgentWorkspace() {
  usePwaIdentity('menage')

  const { user, logout } = useAuth()
  const [catalogue, setCatalogue] = useState<ProduitCatalogue[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetchProduitsCatalogue()
      .then(setCatalogue)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Impossible de charger les données.'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ménage</h1>
          {user && <p className="text-xs text-gray-500">{user.nom}</p>}
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

      <main className="px-4 py-6">
        {loadError && <p className="mb-4 text-sm text-red-600">{loadError}</p>}
        <MesMissionsSection catalogue={catalogue} />
      </main>
    </div>
  )
}
