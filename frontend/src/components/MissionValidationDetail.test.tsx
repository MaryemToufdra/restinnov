import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MissionValidationDetail } from './MissionValidationDetail'
import type { MissionMenage } from '../types'

function missionFixture(overrides: Partial<MissionMenage> = {}): MissionMenage {
  return {
    id: 10,
    sejour_id: 1,
    agent_id: 5,
    statut: 'en_attente_validation',
    agent: { id: 5, nom: 'Fatima Z.', role: 'menage', telephone: null },
    frais_forfait: 0,
    vue: true,
    checklist_items: [],
    produits_signales: [],
    ...overrides,
  }
}

describe('MissionValidationDetail', () => {
  it('le détail est masqué par défaut, "Voir le détail" le déplie', async () => {
    const user = userEvent.setup()
    render(
      <MissionValidationDetail
        mission={missionFixture({
          checklist_items: [{ id: 1, mission_menage_id: 10, libelle: 'Changer les draps', coche: true, photo_url: null, ordre: 0 }],
        })}
      />,
    )

    expect(screen.queryByText('Changer les draps')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /voir le détail/i }))

    expect(screen.getByText('Changer les draps')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /masquer le détail/i })).toBeInTheDocument()
  })

  it('distingue visuellement (aria-label) les items cochés des non cochés', async () => {
    const user = userEvent.setup()
    render(
      <MissionValidationDetail
        mission={missionFixture({
          checklist_items: [
            { id: 1, mission_menage_id: 10, libelle: 'Changer les draps', coche: true, photo_url: null, ordre: 0 },
            { id: 2, mission_menage_id: 10, libelle: 'Passer l\'aspirateur', coche: false, photo_url: null, ordre: 1 },
          ],
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: /voir le détail/i }))

    expect(screen.getByLabelText('Coché')).toBeInTheDocument()
    expect(screen.getByLabelText('Non coché')).toBeInTheDocument()
  })

  it('affiche la miniature photo d\'un item de checklist quand présente', async () => {
    const user = userEvent.setup()
    render(
      <MissionValidationDetail
        mission={missionFixture({
          checklist_items: [
            {
              id: 1,
              mission_menage_id: 10,
              libelle: 'Changer les draps',
              coche: true,
              photo_url: 'checklist-items/preuve.jpg',
              ordre: 0,
            },
          ],
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: /voir le détail/i }))

    const image = screen.getByAltText('Photo de "Changer les draps"')
    expect(image).toHaveAttribute('src', expect.stringContaining('checklist-items/preuve.jpg'))
  })

  it('affiche les produits signalés avec photo, note et statut', async () => {
    const user = userEvent.setup()
    render(
      <MissionValidationDetail
        mission={missionFixture({
          produits_signales: [
            {
              id: 1,
              mission_menage_id: 10,
              photo_url: 'produits-signales/photo.jpg',
              note: 'Nouveau produit trouvé',
              statut: 'en_attente',
              produit_catalogue_id: null,
            },
          ],
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: /voir le détail/i }))

    expect(screen.getByText('Nouveau produit trouvé')).toBeInTheDocument()
    expect(screen.getByText('En attente')).toBeInTheDocument()
    const image = screen.getByAltText('Photo du produit signalé')
    expect(image).toHaveAttribute('src', expect.stringContaining('produits-signales/photo.jpg'))
  })

  it('affiche des messages "aucun" quand la checklist et les produits signalés sont vides', async () => {
    const user = userEvent.setup()
    render(<MissionValidationDetail mission={missionFixture()} />)

    await user.click(screen.getByRole('button', { name: /voir le détail/i }))

    expect(screen.getByText('Aucun item de checklist.')).toBeInTheDocument()
    expect(screen.getByText('Aucun produit signalé.')).toBeInTheDocument()
  })
})
