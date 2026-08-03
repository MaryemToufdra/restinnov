import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NouvelAppartementForm } from './NouvelAppartementForm'
import type { Agent, ChecklistModele } from '../types'

const checklistModeles: ChecklistModele[] = [{ id: 1, nom: 'Checklist standard' }]
const agentsMenage: Agent[] = [{ id: 2, nom: 'Fatima Z.', role: 'menage', telephone: null }]

/** Mirrors how App.tsx owns the checklist list, so a newly created modele becomes a selectable option. */
function ManagedForm({ onCreateChecklistModele }: { onCreateChecklistModele: (nom: string) => Promise<ChecklistModele> }) {
  const [modeles, setModeles] = useState(checklistModeles)

  return (
    <NouvelAppartementForm
      checklistModeles={modeles}
      agentsMenage={agentsMenage}
      onSubmit={vi.fn()}
      onCreateChecklistModele={async (nom) => {
        const created = await onCreateChecklistModele(nom)
        setModeles((current) => [...current, created])
        return created
      }}
    />
  )
}

function makeFile(name = 'photo.jpg', type = 'image/jpeg') {
  return new File(['contenu'], name, { type })
}

describe('NouvelAppartementForm', () => {
  it('affiche le statut en lecture seule avec la mention explicative', () => {
    render(
      <NouvelAppartementForm
        checklistModeles={checklistModeles}
        agentsMenage={agentsMenage}
        onSubmit={vi.fn()}
        onCreateChecklistModele={vi.fn()}
      />,
    )

    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText(/géré automatiquement/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /statut/i })).not.toBeInTheDocument()
  })

  it('met à jour la zone de dépôt quand un fichier est choisi', async () => {
    const user = userEvent.setup()
    render(
      <NouvelAppartementForm
        checklistModeles={checklistModeles}
        agentsMenage={agentsMenage}
        onSubmit={vi.fn()}
        onCreateChecklistModele={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Photo principale', { selector: 'input' })
    await user.upload(input, makeFile())

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument()
  })

  it('permet de créer un nouveau modèle de checklist à la volée et le sélectionne', async () => {
    const user = userEvent.setup()
    const onCreateChecklistModele = vi.fn().mockResolvedValue({ id: 99, nom: 'Checklist studio' })
    render(<ManagedForm onCreateChecklistModele={onCreateChecklistModele} />)

    await user.click(screen.getByRole('button', { name: /créer un nouveau modèle/i }))
    await user.type(screen.getByPlaceholderText(/nom du nouveau modèle/i), 'Checklist studio')
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }))

    expect(onCreateChecklistModele).toHaveBeenCalledWith('Checklist studio')
    expect(await screen.findByRole('combobox', { name: /checklist de ménage/i })).toHaveValue('99')
  })

  it('soumet le formulaire avec le payload attendu', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <NouvelAppartementForm
        checklistModeles={checklistModeles}
        agentsMenage={agentsMenage}
        onSubmit={onSubmit}
        onCreateChecklistModele={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/nom du bien/i), 'Zenith 3ème étage')
    await user.type(screen.getByLabelText(/adresse complète/i), '10 avenue Hassan II')
    const photo = makeFile()
    await user.upload(screen.getByLabelText('Photo principale', { selector: 'input' }), photo)
    await user.selectOptions(screen.getByRole('combobox', { name: /checklist de ménage/i }), '1')
    await user.selectOptions(screen.getByRole('combobox', { name: /agent de ménage habituel/i }), '2')

    await user.click(screen.getByRole('button', { name: /enregistrer l'appartement/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      nom: 'Zenith 3ème étage',
      adresse: '10 avenue Hassan II',
      photo,
      checklist_modele_id: 1,
      agent_habituel_id: 2,
    })
  })

  it('refuse un fichier qui n\'est pas au format JPG/PNG', async () => {
    render(
      <NouvelAppartementForm
        checklistModeles={checklistModeles}
        agentsMenage={agentsMenage}
        onSubmit={vi.fn()}
        onCreateChecklistModele={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Photo principale', { selector: 'input' })
    // fireEvent bypasses the input's `accept` filter, exercising the JS-level validation
    // (a drag-and-drop of a mistyped file would hit the same code path).
    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } })

    expect(await screen.findByText(/JPG ou PNG/i)).toBeInTheDocument()
  })

  it('exige un nom et une adresse', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { container } = render(
      <NouvelAppartementForm
        checklistModeles={checklistModeles}
        agentsMenage={agentsMenage}
        onSubmit={onSubmit}
        onCreateChecklistModele={vi.fn()}
      />,
    )

    // bypass native HTML5 "required" blocking to exercise the JS-level check
    container.querySelector('form')?.removeAttribute('required')
    for (const el of container.querySelectorAll('[required]')) {
      el.removeAttribute('required')
    }

    await user.click(screen.getByRole('button', { name: /enregistrer l'appartement/i }))

    expect(await screen.findByText(/obligatoires/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
