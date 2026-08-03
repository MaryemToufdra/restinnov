import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NouveauSejourForm } from './NouveauSejourForm'
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
]

async function fillMinimalForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: /Appartement/i }), '1')
  await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')
  await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-05')
  await user.type(screen.getByLabelText('Nom'), 'Jean Dupont')
}

describe('NouveauSejourForm', () => {
  it('affiche un seul voyageur par défaut, principal et la plateforme Airbnb sélectionnée', () => {
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Airbnb' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Direct' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.queryByLabelText(/Retirer le voyageur/i)).not.toBeInTheDocument()
  })

  it('ajoute un bloc voyageur avec le bouton "+ Ajouter un voyageur" et le compteur', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter un voyageur/i }))
    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('2')
    expect(screen.getAllByText(/^Voyageur \d$/)).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre de voyageurs/i }))
    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('3')
    expect(screen.getAllByText(/^Voyageur \d$/)).toHaveLength(3)
  })

  it('retire un voyageur via la croix, sauf s\'il n\'en reste qu\'un seul', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter un voyageur/i }))
    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('2')

    await user.click(screen.getByLabelText('Retirer le voyageur 2'))
    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('1')
    expect(screen.queryByLabelText(/Retirer le voyageur/i)).not.toBeInTheDocument()
  })

  it('réassigne le voyageur principal si celui-ci est retiré', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter un voyageur/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    await user.click(screen.getByLabelText('Retirer le voyageur 1'))

    const remaining = screen.getAllByRole('checkbox')
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toBeChecked()
  })

  it('un seul voyageur peut être principal à la fois', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter un voyageur/i }))
    const checkboxes = screen.getAllByRole('checkbox')

    await user.click(checkboxes[1])

    const updated = screen.getAllByRole('checkbox')
    expect(updated[0]).not.toBeChecked()
    expect(updated[1]).toBeChecked()
  })

  it('permet de sélectionner une autre plateforme', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Direct' }))

    expect(screen.getByRole('button', { name: 'Direct' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Airbnb' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('propose Booking comme 4e plateforme d\'origine', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Booking' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Booking' }))
    expect(screen.getByRole('button', { name: 'Booking' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calcule le nombre de nuits et le montant par nuit en temps réel', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.queryByTestId('nombre-nuits')).not.toBeInTheDocument()
    expect(screen.queryByTestId('montant-par-nuit')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-06')

    expect(screen.getByTestId('nombre-nuits')).toHaveTextContent('5 nuits')

    await user.clear(screen.getByLabelText(/Montant du séjour/i))
    await user.type(screen.getByLabelText(/Montant du séjour/i), '1000')

    expect(screen.getByTestId('montant-par-nuit')).toHaveTextContent('200.00 MAD / nuit')

    await user.clear(screen.getByLabelText(/Date de départ/i))
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-09')

    expect(screen.getByTestId('nombre-nuits')).toHaveTextContent('8 nuits')
    expect(screen.getByTestId('montant-par-nuit')).toHaveTextContent('125.00 MAD / nuit')
  })

  it('soumet le formulaire avec le payload attendu', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouveauSejourForm appartements={appartements} onSubmit={onSubmit} />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: 'Direct' }))
    await user.clear(screen.getByLabelText(/Montant du séjour/i))
    await user.type(screen.getByLabelText(/Montant du séjour/i), '1500')

    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      appartement_id: 1,
      date_arrivee: '2026-08-01',
      date_depart: '2026-08-05',
      plateforme_origine: 'direct',
      montant_mad: 1500,
      voyageurs: [{ nom: 'Jean Dupont', numero_passeport: null, est_principal: true }],
    })
  })

  it('refuse une date de départ non strictement après la date d\'arrivée', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouveauSejourForm appartements={appartements} onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /Appartement/i }), '1')
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-05')
    await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-05')
    await user.type(screen.getByLabelText('Nom'), 'Jean Dupont')

    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(await screen.findByText(/strictement après/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('le bouton Annuler réinitialise le formulaire', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ajouter un voyageur/i }))
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByTestId('nombre-voyageurs')).toHaveTextContent('1')
    expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('')
  })
})
