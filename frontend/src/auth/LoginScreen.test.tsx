import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from './AuthContext'
import { LoginScreen } from './LoginScreen'

function renderLoginScreen(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function mockFetchWithAgents(
  agents: { id: number; nom: string; telephone: string }[] = [],
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.pathname === '/api/agents-menage-actifs') {
      return new Response(JSON.stringify(agents), { status: 200 })
    }
    throw new Error(`Unhandled request: ${url.pathname}`)
  })
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

  describe('variante /menage (accessible)', () => {
    it('affiche une grille d\'avatars cliquables pour les agents actifs', async () => {
      globalThis.fetch = mockFetchWithAgents([
        { id: 1, nom: 'Fatima Z.', telephone: '0611111111' },
        { id: 2, nom: 'Sara B.', telephone: '0622222222' },
      ]) as typeof fetch

      renderLoginScreen('/menage')

      expect(await screen.findByRole('button', { name: /se connecter en tant que fatima z\./i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /se connecter en tant que sara b\./i })).toBeInTheDocument()
    })

    it('cliquer un avatar pré-remplit le téléphone sans que l\'agent ait à le taper', async () => {
      const user = userEvent.setup()
      globalThis.fetch = mockFetchWithAgents([{ id: 1, nom: 'Fatima Z.', telephone: '0611111111' }]) as typeof fetch

      renderLoginScreen('/menage')

      await user.click(await screen.findByRole('button', { name: /se connecter en tant que fatima z\./i }))

      expect(screen.getByLabelText(/téléphone/i)).toHaveValue('0611111111')
    })

    it('le champ téléphone reste disponible en saisie manuelle avec un clavier numérique', async () => {
      globalThis.fetch = mockFetchWithAgents([]) as typeof fetch

      renderLoginScreen('/menage')

      const telephoneInput = await screen.findByLabelText(/téléphone/i)
      expect(telephoneInput).toHaveAttribute('inputmode', 'numeric')
    })

    it('la variante manager (hors /menage) n\'affiche pas de grille d\'avatars', () => {
      globalThis.fetch = vi.fn() as typeof fetch

      renderLoginScreen('/')

      expect(screen.queryByRole('group', { name: /choisissez votre nom/i })).not.toBeInTheDocument()
    })
  })
})
