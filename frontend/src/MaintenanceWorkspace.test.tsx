import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './auth/AuthContext'
import { MaintenanceWorkspace } from './MaintenanceWorkspace'

function seedLoggedInAgent() {
  localStorage.setItem('auth_token', 'fake-token')
  localStorage.setItem('auth_user', JSON.stringify({ id: 9, nom: 'Karim B.', role: 'maintenance' }))
}

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'

    if (url.pathname === '/api/tickets-maintenance/mes-tickets') {
      return new Response(JSON.stringify([]), { status: 200 })
    }
    if (url.pathname === '/api/logout' && method === 'POST') {
      return new Response(JSON.stringify({ message: 'Déconnecté.' }), { status: 200 })
    }

    throw new Error(`Unhandled request: ${method} ${url.pathname}`)
  })
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <MaintenanceWorkspace />
    </AuthProvider>,
  )
}

describe('MaintenanceWorkspace', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    seedLoggedInAgent()
    globalThis.fetch = mockFetch() as typeof fetch
  })

  it("affiche le titre Maintenance et le nom de l'agent connecté", async () => {
    renderWithAuth()

    expect(await screen.findByText('Maintenance')).toBeInTheDocument()
    expect(screen.getByText('Karim B.')).toBeInTheDocument()
  })

  it('affiche un simple bouton icône + texte pour se déconnecter (pas un gros bouton pictogramme)', async () => {
    renderWithAuth()

    const bouton = await screen.findByRole('button', { name: 'Déconnexion' })
    expect(bouton).toBeInTheDocument()
    expect(bouton.textContent).toContain('Déconnexion')
  })

  it('affiche la section Mes tickets', async () => {
    renderWithAuth()

    expect(await screen.findByText('Mes tickets')).toBeInTheDocument()
  })

  it('le bouton Déconnexion appelle logout', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await screen.findByText('Mes tickets')
    await user.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})
