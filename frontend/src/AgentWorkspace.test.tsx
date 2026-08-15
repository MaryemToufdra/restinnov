import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentWorkspace } from './AgentWorkspace'
import { AuthProvider } from './auth/AuthContext'

function seedLoggedInAgent() {
  localStorage.setItem('auth_token', 'fake-token')
  localStorage.setItem('auth_user', JSON.stringify({ id: 1, nom: 'Fatima Z.', role: 'menage' }))
}

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))

    if (url.pathname === '/api/produits-catalogue') return new Response(JSON.stringify([]), { status: 200 })
    if (url.pathname === '/api/mission-menages') return new Response(JSON.stringify([]), { status: 200 })
    if (url.pathname === '/api/mes-missions/historique') return new Response(JSON.stringify([]), { status: 200 })

    throw new Error(`Unhandled request: ${url.pathname}`)
  })
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AgentWorkspace />
    </AuthProvider>,
  )
}

describe('AgentWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    seedLoggedInAgent()
    globalThis.fetch = mockFetch() as typeof fetch
  })

  it('affiche "Mes missions du jour" par défaut', async () => {
    renderWithAuth()

    expect(await screen.findByText('Mes missions du jour')).toBeInTheDocument()
  })

  it('bascule vers "Historique" au clic sur l\'onglet', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await screen.findByText('Mes missions du jour')
    await user.click(screen.getByRole('tab', { name: /historique/i }))

    expect(await screen.findByRole('heading', { name: 'Historique' })).toBeInTheDocument()
    expect(screen.queryByText('Mes missions du jour')).not.toBeInTheDocument()
  })

  it('revient à "Mes missions" au clic sur son onglet', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await screen.findByText('Mes missions du jour')
    await user.click(screen.getByRole('tab', { name: /historique/i }))
    await screen.findByRole('heading', { name: 'Historique' })
    await user.click(screen.getByRole('tab', { name: /mes missions/i }))

    expect(await screen.findByText('Mes missions du jour')).toBeInTheDocument()
  })
})
