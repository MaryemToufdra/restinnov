import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { LoginScreen } from './LoginScreen'

function renderLoginScreen() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("affiche le message d'erreur générique renvoyé par l'API en cas d'échec", async () => {
    const user = userEvent.setup()
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ message: 'Identifiants incorrects.' }), { status: 401 }),
    ) as typeof fetch

    renderLoginScreen()

    await user.type(screen.getByLabelText(/téléphone/i), '0611111111')
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Identifiants incorrects.')).toBeInTheDocument()
  })

  it('envoie telephone et password au clic sur "Se connecter"', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ token: 't', id: 1, nom: 'Fatima Z.', role: 'menage' }), { status: 200 }),
    )
    globalThis.fetch = fetchMock as typeof fetch

    renderLoginScreen()

    await user.type(screen.getByLabelText(/téléphone/i), '0611111111')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init!.body as string)).toEqual({ telephone: '0611111111', password: 'secret123' })
  })

  it('les champs téléphone et mot de passe sont requis', () => {
    renderLoginScreen()

    expect(screen.getByLabelText(/téléphone/i)).toBeRequired()
    expect(screen.getByLabelText(/mot de passe/i)).toBeRequired()
  })
})
