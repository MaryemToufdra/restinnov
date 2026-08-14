import { Navigate, Route, Routes } from 'react-router'
import { AgentWorkspace } from './AgentWorkspace'
import App from './App'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './auth/LoginScreen'
import { MaintenanceWorkspace } from './MaintenanceWorkspace'

/**
 * "/" is the Manager app, "/menage" is the cleaning agent's own space,
 * "/maintenance" is the maintenance agent's own space -- strictly one role
 * per route. A role visiting the wrong route is bounced to the one
 * matching their account, never shown another role's screen.
 */
function homeRouteForRole(role: string): string {
  if (role === 'menage') return '/menage'
  if (role === 'maintenance') return '/maintenance'
  return '/'
}

export function AppRoot() {
  const { user } = useAuth()

  if (!user) {
    return <LoginScreen />
  }

  return (
    <Routes>
      <Route path="/" element={user.role === 'manager' ? <App /> : <Navigate to={homeRouteForRole(user.role)} replace />} />
      <Route
        path="/menage"
        element={user.role === 'menage' ? <AgentWorkspace /> : <Navigate to={homeRouteForRole(user.role)} replace />}
      />
      <Route
        path="/maintenance"
        element={
          user.role === 'maintenance' ? <MaintenanceWorkspace /> : <Navigate to={homeRouteForRole(user.role)} replace />
        }
      />
      <Route path="*" element={<Navigate to={homeRouteForRole(user.role)} replace />} />
    </Routes>
  )
}
