import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NouvelAgentForm } from './NouvelAgentForm'
import type { Appartement } from '../types'

const appartements: Appartement[] = [
  {
    id: 1,
    nom: 'Loft Bastille',
    adresse: '12 rue de la Roquette',
    statut: 'disponible',
    photo_principale: null,
    agent_habituel_id: null,
  },
  {
    id: 2,
    nom: 'Zenith',
    adresse: '10 avenue Hassan II',
    statut: 'disponible',
    photo_principale: null,
    agent_habituel_id: 7,
    agent_habituel: { id: 7, nom: 'Karim B.', role: 'menage', telephone: null },
  },
]

describe('NouvelAgentForm', () => {
  it('n\'affiche aucun sélecteur de rôle : ce formulaire est spécifique au ménage', () => {
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('combobox', { name: /rôle/i })).not.toBeInTheDocument()
  })

  it('liste les appartements à cocher, avec l\'agent habituel actuel si présent', () => {
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: /Loft Bastille/i })).toBeInTheDocument()
    expect(screen.getByText(/actuellement : Karim B\./i)).toBeInTheDocument()
  })

  it('soumet le formulaire avec le payload attendu, role menage fixé et les appartements cochés', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.type(screen.getByLabelText(/téléphone/i), '0611111111')
    await user.type(screen.getByLabelText(/adresse/i), '5 rue des Fleurs, Casablanca')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Fatima Zahra',
      role: 'menage',
      telephone: '0611111111',
      adresse: '5 rue des Fleurs, Casablanca',
      password: 'secret123',
      appartement_ids: [1],
    })
  })

  it('envoie telephone et adresse à null, et un tableau vide, quand rien n\'est renseigné', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim B.')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Karim B.',
      role: 'menage',
      telephone: null,
      adresse: null,
      password: 'secret123',
      appartement_ids: [],
    })
  })

  it('permet de cocher/décocher plusieurs appartements', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.type(screen.getByLabelText(/mot de passe/i), 'secret123')
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('checkbox', { name: /Zenith/i }))
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ appartement_ids: [2] }),
    )
  })

  it('affiche le mot de passe en clair (pas type="password") avec un texte d\'aide', () => {
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} />)

    const passwordInput = screen.getByLabelText(/mot de passe/i)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByText(/vous pourrez communiquer ce mot de passe à l'agent/i)).toBeInTheDocument()
  })

  it('exige un nom', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    container.querySelector('#agent_nom')?.removeAttribute('required')
    container.querySelector('#agent_password')?.removeAttribute('required')

    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(await screen.findByText(/obligatoire/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('le bouton Annuler réinitialise le formulaire', async () => {
    const user = userEvent.setup()
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByLabelText('Nom')).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: /Loft Bastille/i })).not.toBeChecked()
  })

  // --- edit mode (agentToEdit) ---

  const agentToEdit = { id: 7, nom: 'Fatima Zahra', role: 'menage', telephone: '0611111111', adresse: '5 rue des Fleurs' }

  it('en mode édition, préremplit nom/téléphone/adresse et laisse le mot de passe vide', () => {
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} agentToEdit={agentToEdit} />)

    expect(screen.getByRole('heading', { name: "Modifier l'agent de ménage" })).toBeInTheDocument()
    expect(screen.getByLabelText('Nom')).toHaveValue('Fatima Zahra')
    expect(screen.getByLabelText(/téléphone/i)).toHaveValue('0611111111')
    expect(screen.getByLabelText(/adresse/i)).toHaveValue('5 rue des Fleurs')
    expect(screen.getByLabelText(/mot de passe/i)).toHaveValue('')
  })

  it('en mode édition, le mot de passe est optionnel et la section appartements est masquée', () => {
    render(<NouvelAgentForm appartements={appartements} onSubmit={vi.fn()} agentToEdit={agentToEdit} />)

    expect(screen.getByLabelText(/mot de passe/i)).not.toBeRequired()
    expect(screen.queryByText(/appartements assignés/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enregistrer les modifications/i })).toBeInTheDocument()
  })

  it('en mode édition, soumet sans mot de passe quand il est laissé vide', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} agentToEdit={agentToEdit} />)

    await user.clear(screen.getByLabelText('Nom'))
    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra B.')
    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ nom: 'Fatima Zahra B.', password: null }),
    )
  })

  it('en mode édition, soumet le nouveau mot de passe quand il est renseigné', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} agentToEdit={agentToEdit} />)

    await user.type(screen.getByLabelText(/mot de passe/i), 'nouveau-mdp')
    await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ password: 'nouveau-mdp' }))
  })
})
