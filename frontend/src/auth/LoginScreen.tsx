import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { fetchAgentsMenageActifs } from '../api'
import type { AgentMenagePublic } from '../types'
import { avatarColorClass, avatarInitial } from '../utils/avatar'
import { useAuth } from './AuthContext'

export function LoginScreen() {
  const { login } = useAuth()
  const location = useLocation()
  const isMenage = location.pathname.startsWith('/menage')

  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentMenagePublic[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)

  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isMenage) return
    fetchAgentsMenageActifs()
      .then(setAgents)
      .catch(() => setAgents([]))
  }, [isMenage])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(telephone, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePickAgent = (agent: AgentMenagePublic) => {
    setSelectedAgentId(agent.id)
    setTelephone(agent.telephone)
    setError(null)
    passwordRef.current?.focus()
  }

  if (!isMenage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-gray-900">Séjours & ménage</h1>
          <p className="text-sm text-gray-500">Connectez-vous pour continuer.</p>

          <div>
            <label htmlFor="login_telephone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              id="login_telephone"
              type="tel"
              required
              autoComplete="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-3 text-base"
            />
          </div>

          <div>
            <label htmlFor="login_password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="login_password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-3 text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-50 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
      >
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-3xl"
          >
            🧹
          </div>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Ménage</h1>
        </div>

        {agents.length > 0 && (
          <div>
            <div
              role="group"
              aria-label="Choisissez votre nom dans la liste"
              className="grid grid-cols-3 gap-3"
            >
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  aria-pressed={selectedAgentId === agent.id}
                  aria-label={`Se connecter en tant que ${agent.nom}`}
                  onClick={() => handlePickAgent(agent)}
                  className={`flex min-h-[72px] flex-col items-center gap-1 rounded-xl border-2 p-2 ${
                    selectedAgentId === agent.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-transparent hover:border-indigo-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white ${avatarColorClass(agent.id)}`}
                  >
                    {avatarInitial(agent.nom)}
                  </span>
                  <span className="line-clamp-1 text-xs font-medium text-gray-700">{agent.nom}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2" aria-hidden="true">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="login_telephone" className="block text-base font-medium text-gray-700">
            📱 Téléphone
          </label>
          <input
            id="login_telephone"
            type="tel"
            inputMode="numeric"
            required
            autoComplete="tel"
            value={telephone}
            onChange={(e) => {
              setTelephone(e.target.value)
              setSelectedAgentId(null)
            }}
            className="mt-1 block w-full rounded-xl border-2 border-gray-300 px-4 py-4 text-2xl tracking-wide"
          />
        </div>

        <div>
          <label htmlFor="login_password" className="block text-base font-medium text-gray-700">
            🔒 Mot de passe
          </label>
          <input
            ref={passwordRef}
            id="login_password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-xl border-2 border-gray-300 px-4 py-4 text-2xl tracking-wide"
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-base font-medium text-red-700">
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <span aria-hidden="true">▶</span>
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
