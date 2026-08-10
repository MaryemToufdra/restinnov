import { useAuth } from './auth/AuthContext'

/**
 * Shown to a role with no frontend space yet (maintenance, for now) --
 * lets them log out instead of getting stuck on a route neither "/" nor
 * "/menage" will render for their role.
 */
export function EspaceNonDisponible() {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <p className="text-base text-gray-700">Cet espace n'est pas encore disponible pour votre rôle.</p>
      <button
        type="button"
        onClick={() => {
          void logout()
        }}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Déconnexion
      </button>
    </div>
  )
}
