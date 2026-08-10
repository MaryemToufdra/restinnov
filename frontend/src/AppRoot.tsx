import { Navigate, Route, Routes } from 'react-router'
import { AgentWorkspace } from './AgentWorkspace'
import App from './App'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './auth/LoginScreen'
import { EspaceNonDisponible } from './EspaceNonDisponible'

/**
 * "/" is the Manager app, "/menage" is the cleaning agent's own space --
 * strictly one role per route. A role visiting the wrong route is bounced
 * to the one matching their account, never shown the other's screen.
 */
export function AppRoot() {
  const { user } = useAuth()

  if (!user) {
    return <LoginScreen />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user.role === 'manager' ? (
            <App />
          ) : user.role === 'menage' ? (
            <Navigate to="/menage" replace />
          ) : (
            <EspaceNonDisponible />
          )
        }
      />
      <Route
        path="/menage"
        element={
          user.role === 'menage' ? (
            <AgentWorkspace />
          ) : user.role === 'manager' ? (
            <Navigate to="/" replace />
          ) : (
            <EspaceNonDisponible />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
