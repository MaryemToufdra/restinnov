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
    checklist_modele_id: null,
    agent_habituel_id: null,
  },
  {
    id: 2,
    nom: 'Zenith',
    adresse: '10 avenue Hassan II',
    statut: 'disponible',
    photo_principale: null,
    checklist_modele_id: null,
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
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Fatima Zahra',
      role: 'menage',
      telephone: '0611111111',
      adresse: '5 rue des Fleurs, Casablanca',
      appartement_ids: [1],
    })
  })

  it('envoie telephone et adresse à null, et un tableau vide, quand rien n\'est renseigné', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Karim B.')
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Karim B.',
      role: 'menage',
      telephone: null,
      adresse: null,
      appartement_ids: [],
    })
  })

  it('permet de cocher/décocher plusieurs appartements', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Nom'), 'Fatima Zahra')
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('checkbox', { name: /Zenith/i }))
    await user.click(screen.getByRole('checkbox', { name: /Loft Bastille/i }))
    await user.click(screen.getByRole('button', { name: /créer le compte/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ appartement_ids: [2] }),
    )
  })

  it('exige un nom', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(<NouvelAgentForm appartements={appartements} onSubmit={onSubmit} />)

    container.querySelector('#agent_nom')?.removeAttribute('required')

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
})
