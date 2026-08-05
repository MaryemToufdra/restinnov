import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NouvelAgentMaintenanceForm } from './NouvelAgentMaintenanceForm'

describe('NouvelAgentMaintenanceForm', () => {
  it('n\'affiche aucun champ "appartements assignés"', () => {
    render(<NouvelAgentMaintenanceForm onSubmit={vi.fn()} />)

    expect(screen.queryByText(/appartements assignés/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('affiche le mot de passe en clair (pas type="password") avec un texte d\'aide', () => {
    render(<NouvelAgentMaintenanceForm onSubmit={vi.fn()} />)

    const passwordInput = screen.getByLabelText(/mot de passe/i)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByText(/vous pourrez communiquer ce mot de passe à l'agent/i)).toBeInTheDocument()
  })

  it('soumet le formulaire avec le payload attendu et role maintenance fixé', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentMaintenanceForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim Benali')
    await user.type(screen.getByLabelText(/téléphone/i), '0622222222')
    await user.type(screen.getByLabelText(/adresse/i), '3 rue des Artisans, Rabat')
    await user.type(screen.getByLabelText(/mot de passe/i), 'motdepasse123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Karim Benali',
      role: 'maintenance',
      telephone: '0622222222',
      adresse: '3 rue des Artisans, Rabat',
      password: 'motdepasse123',
    })
  })

  it('envoie telephone et adresse à null quand rien n\'est renseigné', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentMaintenanceForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim Benali')
    await user.type(screen.getByLabelText(/mot de passe/i), 'motdepasse123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Karim Benali',
      role: 'maintenance',
      telephone: null,
      adresse: null,
      password: 'motdepasse123',
    })
  })

  it('exige un nom', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(<NouvelAgentMaintenanceForm onSubmit={onSubmit} />)

    container.querySelector('#agent_maintenance_nom')?.removeAttribute('required')
    container.querySelector('#agent_maintenance_password')?.removeAttribute('required')

    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(await screen.findByText(/obligatoire/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('le bouton Annuler réinitialise le formulaire', async () => {
    const user = userEvent.setup()
    render(<NouvelAgentMaintenanceForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim Benali')
    await user.type(screen.getByLabelText(/mot de passe/i), 'motdepasse123')

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByLabelText('Nom')).toHaveValue('')
    expect(screen.getByLabelText(/mot de passe/i)).toHaveValue('')
  })
})
