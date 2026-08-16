import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FraisMenageSection } from './FraisMenageSection'
import type { MissionMenage, ProduitCatalogue } from '../types'

const catalogue: ProduitCatalogue[] = [
  { id: 1, nom: 'Javel', prix: '12.50', photo_url: null, actif: true },
  { id: 2, nom: 'Sac poubelle', prix: '7.50', photo_url: 'produits-catalogue/sac.jpg', actif: true },
  { id: 3, nom: 'Ancien produit', prix: '99.00', photo_url: null, actif: false },
]

const missionMenage: MissionMenage = {
  id: 1,
  sejour_id: 1,
  agent_id: 1,
  statut: 'a_faire',
  agent: { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
  frais_forfait: 80,
  vue: true,
  produits: [],
}

function makeFile(name = 'produit.jpg', type = 'image/jpeg') {
  return new File(['contenu'], name, { type })
}

describe('FraisMenageSection', () => {
  it('pré-remplit le forfait à 80 et affiche uniquement les produits actifs', () => {
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/forfait femme de ménage/i)).toHaveValue(80)
    expect(screen.getByText(/Javel/)).toBeInTheDocument()
    expect(screen.getByText(/Sac poubelle/)).toBeInTheDocument()
    expect(screen.queryByText(/Ancien produit/)).not.toBeInTheDocument()
  })

  it('affiche la photo du produit quand présente', () => {
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={vi.fn()}
      />,
    )

    expect(screen.getByAltText('Photo de "Sac poubelle"')).toBeInTheDocument()
    expect(screen.queryByAltText('Photo de "Javel"')).not.toBeInTheDocument()
  })

  it('calcule le total en temps réel (forfait + produits cochés)', async () => {
    const user = userEvent.setup()
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={vi.fn()}
      />,
    )

    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('80.00 MAD')

    await user.click(screen.getByRole('checkbox', { name: /Javel/i }))
    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('92.50 MAD')

    await user.click(screen.getByRole('checkbox', { name: /Sac poubelle/i }))
    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('100.00 MAD')

    const forfaitInput = screen.getByLabelText(/forfait femme de ménage/i)
    await user.clear(forfaitInput)
    await user.type(forfaitInput, '100')
    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('120.00 MAD')
  })

  it('enregistre le forfait et les produits cochés', async () => {
    const user = userEvent.setup()
    const onUpdateProduits = vi.fn().mockResolvedValue(undefined)
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={onUpdateProduits}
        onSignalerProduit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: /Javel/i }))
    await user.click(screen.getByRole('button', { name: /enregistrer les frais de ménage/i }))

    expect(onUpdateProduits).toHaveBeenCalledWith(1, { frais_forfait: 80, produit_ids: [1] })
  })

  it('affiche le formulaire "Signaler un nouveau produit" et envoie photo + note', async () => {
    const user = userEvent.setup()
    const onSignalerProduit = vi.fn().mockResolvedValue(undefined)
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={onSignalerProduit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /signaler un nouveau produit/i }))

    const photo = makeFile()
    await user.upload(screen.getByLabelText(/photo du produit/i), photo)
    await user.type(screen.getByLabelText(/note/i), 'Trouvé sous l\'évier')
    await user.click(screen.getByRole('button', { name: /envoyer/i }))

    expect(onSignalerProduit).toHaveBeenCalledWith(1, { photo, note: "Trouvé sous l'évier" })
    expect(await screen.findByText(/en attente de validation/i)).toBeInTheDocument()
  })

  it('refuse de signaler un produit sans photo', async () => {
    const user = userEvent.setup()
    const onSignalerProduit = vi.fn()
    render(
      <FraisMenageSection
        missionMenage={missionMenage}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={onSignalerProduit}
      />,
    )

    await user.click(screen.getByRole('button', { name: /signaler un nouveau produit/i }))
    await user.click(screen.getByRole('button', { name: /envoyer/i }))

    expect(await screen.findByText(/photo est obligatoire/i)).toBeInTheDocument()
    expect(onSignalerProduit).not.toHaveBeenCalled()
  })

  it('pré-coche les produits déjà associés à la mission', () => {
    render(
      <FraisMenageSection
        missionMenage={{ ...missionMenage, produits: [catalogue[0]] }}
        catalogue={catalogue}
        onUpdateProduits={vi.fn()}
        onSignalerProduit={vi.fn()}
      />,
    )

    expect(screen.getByRole('checkbox', { name: /Javel/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Sac poubelle/i })).not.toBeChecked()
  })

  it('coche automatiquement un produit ajouté à la mission depuis l\'extérieur (validation Manager) sans perdre la sélection en cours', async () => {
    const user = userEvent.setup()

    function Wrapper() {
      const [mission, setMission] = useState(missionMenage)
      return (
        <>
          <FraisMenageSection
            missionMenage={mission}
            catalogue={catalogue}
            onUpdateProduits={vi.fn()}
            onSignalerProduit={vi.fn()}
          />
          <button
            type="button"
            onClick={() => setMission((m) => ({ ...m, produits: [...(m.produits ?? []), catalogue[1]] }))}
          >
            simulate-manager-validation
          </button>
        </>
      )
    }

    render(<Wrapper />)

    // user checks Javel locally, unsaved
    await user.click(screen.getByRole('checkbox', { name: /Javel/i }))
    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('92.50 MAD')

    // externally, "Sac poubelle" gets attached to the mission (e.g. a validated produit signalé)
    await user.click(screen.getByRole('button', { name: 'simulate-manager-validation' }))

    expect(screen.getByRole('checkbox', { name: /Javel/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Sac poubelle/i })).toBeChecked()
    expect(screen.getByTestId('total-frais-menage-1')).toHaveTextContent('100.00 MAD')
  })
})
