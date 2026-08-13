import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NouveauSejourForm } from './NouveauSejourForm'
import type { Appartement, Sejour } from '../types'

function appartementFixture(overrides: Partial<Appartement> = {}): Appartement {
  return {
    id: 1,
    nom: 'Loft Bastille',
    adresse: '12 rue de la Roquette',
    statut: 'disponible',
    photo_principale: null,
    checklist_modele_id: null,
    agent_habituel_id: null,
    ...overrides,
  }
}

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
  it('exclut les appartements "maintenance" du sélecteur, mais garde occupé/en ménage', async () => {
    render(
      <NouveauSejourForm
        appartements={[
          appartementFixture({ id: 1, nom: 'Loft Bastille', statut: 'disponible' }),
          appartementFixture({ id: 2, nom: 'Zenith', statut: 'maintenance' }),
          appartementFixture({ id: 3, nom: 'Marina', statut: 'occupe' }),
          appartementFixture({ id: 4, nom: 'Riad', statut: 'en_menage' }),
        ]}
        onSubmit={vi.fn()}
      />,
    )

    const select = screen.getByRole('combobox', { name: /Appartement/i })
    expect(within(select).getByText('Loft Bastille')).toBeInTheDocument()
    expect(within(select).getByText('Marina')).toBeInTheDocument()
    expect(within(select).getByText('Riad')).toBeInTheDocument()
    expect(within(select).queryByText('Zenith')).not.toBeInTheDocument()
  })

  it('affiche un adulte principal par défaut, aucun enfant, et la plateforme Airbnb sélectionnée', () => {
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('1')
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('0')
    expect(screen.getByTestId('resume-voyageurs')).toHaveTextContent('1 voyageurs (1 adultes, 0 enfants)')
    expect(screen.getByRole('button', { name: 'Airbnb' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Direct' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('Adulte')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Retirer le voyageur/i)).not.toBeInTheDocument()
  })

  it('le compteur Adultes ajoute/retire des blocs voyageur de type adulte', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'adultes/i }))
    expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('2')
    expect(screen.getByTestId('resume-voyageurs')).toHaveTextContent('2 voyageurs (2 adultes, 0 enfants)')
    expect(screen.getAllByText('Adulte')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /diminuer le nombre d'adultes/i }))
    expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('1')
  })

  it('le compteur Enfants ajoute/retire des blocs voyageur de type enfant, minimum 0', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: /diminuer le nombre d'enfants/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'enfants/i }))
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('1')
    expect(screen.getByTestId('resume-voyageurs')).toHaveTextContent('2 voyageurs (1 adultes, 1 enfants)')
    expect(screen.getByText('Enfant')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /diminuer le nombre d'enfants/i }))
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('0')
    expect(screen.queryByText('Enfant')).not.toBeInTheDocument()
  })

  it('le compteur Adultes ne descend jamais sous 1', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: /diminuer le nombre d'adultes/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /diminuer le nombre d'adultes/i }))
    expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('1')
  })

  it('n\'affiche pas la case "Voyageur principal" sur les blocs enfant', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'enfants/i }))

    const enfantBlock = screen.getByText('Voyageur 2').closest('div.relative') as HTMLElement
    expect(within(enfantBlock).queryByText(/voyageur principal/i)).not.toBeInTheDocument()
    expect(within(enfantBlock).queryByRole('checkbox')).not.toBeInTheDocument()

    // only the adulte's checkbox exists
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('retire un voyageur via la croix, un enfant peut être retiré même si seul restant', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'enfants/i }))
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('1')

    await user.click(screen.getByLabelText('Retirer le voyageur 2'))
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('0')
    expect(screen.queryByLabelText(/Retirer le voyageur/i)).not.toBeInTheDocument()
  })

  it('la croix n\'est pas proposée sur le seul bloc adulte restant', async () => {
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.queryByLabelText('Retirer le voyageur 1')).not.toBeInTheDocument()
  })

  it('réassigne le voyageur principal à un autre adulte si celui-ci est retiré', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'adultes/i }))
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

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'adultes/i }))
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

  it('propose Booking comme plateforme d\'origine', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Booking' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Booking' }))
    expect(screen.getByRole('button', { name: 'Booking' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche les pilules de plateforme dans l\'ordre Airbnb, Booking, Direct, Autre', () => {
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    const group = screen.getByRole('group', { name: /Plateforme d'origine/i })
    const labels = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent)

    expect(labels).toEqual(['Airbnb', 'Booking', 'Direct', 'Autre'])
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

  it('masque les flèches natives du champ montant sans perdre la validation numérique', () => {
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    const montantInput = screen.getByLabelText(/Montant du séjour/i)
    expect(montantInput).toHaveAttribute('type', 'number')
    expect(montantInput).toHaveAttribute('min', '0')
    expect(montantInput).toHaveAttribute('step', '0.01')
    expect(montantInput.className).toContain('[&::-webkit-inner-spin-button]:appearance-none')
    expect(montantInput.className).toContain('[&::-webkit-outer-spin-button]:appearance-none')
    expect(montantInput.className).toContain('[-moz-appearance:textfield]')
  })

  it('soumet le formulaire avec le payload attendu, type inclus pour chaque voyageur', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NouveauSejourForm appartements={appartements} onSubmit={onSubmit} />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'enfants/i }))
    await user.click(screen.getByRole('button', { name: 'Direct' }))
    await user.clear(screen.getByLabelText(/Montant du séjour/i))
    await user.type(screen.getByLabelText(/Montant du séjour/i), '1500')

    const nomInputs = screen.getAllByLabelText('Nom')
    await user.type(nomInputs[1], 'Petit Dupont')

    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      appartement_id: 1,
      date_arrivee: '2026-08-01',
      date_depart: '2026-08-05',
      plateforme_origine: 'direct',
      montant_mad: 1500,
      voyageurs: [
        { nom: 'Jean Dupont', numero_passeport: null, est_principal: true, type: 'adulte' },
        { nom: 'Petit Dupont', numero_passeport: null, est_principal: false, type: 'enfant' },
      ],
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

  it("affiche le message d'erreur renvoyé par l'API quand la création échoue (ex. chevauchement de dates)", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Cet appartement est déjà réservé du 2026-08-01 au 2026-08-10.'))
    render(<NouveauSejourForm appartements={appartements} onSubmit={onSubmit} />)

    await fillMinimalForm(user)
    await user.click(screen.getByRole('button', { name: /enregistrer le séjour/i }))

    expect(await screen.findByText('Cet appartement est déjà réservé du 2026-08-01 au 2026-08-10.')).toBeInTheDocument()
  })

  it('le bouton Annuler réinitialise le formulaire', async () => {
    const user = userEvent.setup()
    render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /augmenter le nombre d'enfants/i }))
    await user.type(screen.getByLabelText(/Date d'arrivée/i), '2026-08-01')

    await user.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('1')
    expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('0')
    expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('')
  })

  describe('mode édition', () => {
    const sejourToEdit: Sejour = {
      id: 5,
      reference: 'SEJ-0005',
      appartement_id: 1,
      date_arrivee: '2026-08-01',
      date_depart: '2026-08-05',
      nom_voyageur: 'Jean Dupont',
      statut: 'a_venir',
      plateforme_origine: 'booking',
      montant_mad: 1500,
      voyageurs: [
        { nom: 'Jean Dupont', numero_passeport: 'FR123', est_principal: true, type: 'adulte' },
        { nom: 'Petit Dupont', numero_passeport: null, est_principal: false, type: 'enfant' },
      ],
    }

    it('préremplit le formulaire à partir du séjour à éditer', () => {
      render(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} sejourToEdit={sejourToEdit} />)

      expect(screen.getByRole('heading', { name: 'Modifier le séjour' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /Appartement/i })).toHaveValue('1')
      expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('2026-08-01')
      expect(screen.getByLabelText(/Date de départ/i)).toHaveValue('2026-08-05')
      expect(screen.getByRole('button', { name: 'Booking' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('nombre-adultes')).toHaveTextContent('1')
      expect(screen.getByTestId('nombre-enfants')).toHaveTextContent('1')
      expect(screen.getByRole('button', { name: /enregistrer les modifications/i })).toBeInTheDocument()
    })

    it('soumet le payload modifié au clic sur "Enregistrer les modifications"', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<NouveauSejourForm appartements={appartements} onSubmit={onSubmit} sejourToEdit={sejourToEdit} />)

      await user.clear(screen.getByLabelText(/Date de départ/i))
      await user.type(screen.getByLabelText(/Date de départ/i), '2026-08-10')
      await user.click(screen.getByRole('button', { name: /enregistrer les modifications/i }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          appartement_id: 1,
          date_arrivee: '2026-08-01',
          date_depart: '2026-08-10',
          plateforme_origine: 'booking',
        }),
      )
    })

    it('revient à un formulaire vierge quand sejourToEdit redevient null', () => {
      const { rerender } = render(
        <NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} sejourToEdit={sejourToEdit} />,
      )
      expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('2026-08-01')

      rerender(<NouveauSejourForm appartements={appartements} onSubmit={vi.fn()} sejourToEdit={null} />)

      expect(screen.getByRole('heading', { name: 'Nouveau séjour' })).toBeInTheDocument()
      expect(screen.getByLabelText(/Date d'arrivée/i)).toHaveValue('')
    })
  })
})
