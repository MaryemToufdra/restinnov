import { useAuth } from './auth/AuthContext'
import { MesTicketsSection } from './components/MesTicketsSection'
import { usePwaIdentity } from './pwa/usePwaIdentity'

export function MaintenanceWorkspace() {
  usePwaIdentity('maintenance')
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Maintenance</h1>
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
        <MesTicketsSection />
      </main>
    </div>
  )
}
