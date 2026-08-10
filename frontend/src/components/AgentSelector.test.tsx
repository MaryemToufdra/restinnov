import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AgentSelector } from './AgentSelector'
import type { Agent } from '../types'

const agentsMenage: Agent[] = [
  { id: 1, nom: 'Fatima Z.', role: 'menage', telephone: null },
  { id: 2, nom: 'Karim B.', role: 'menage', telephone: null },
]

describe('AgentSelector', () => {
  it('le bouton Continuer est désactivé tant qu\'aucun agent n\'est choisi', () => {
    render(<AgentSelector agentsMenage={agentsMenage} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled()
  })

  it('appelle onSelect avec l\'id de l\'agent choisi', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<AgentSelector agentsMenage={agentsMenage} onSelect={onSelect} />)

    await user.selectOptions(screen.getByLabelText(/agent de ménage/i), '2')
    await user.click(screen.getByRole('button', { name: /continuer/i }))

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('liste tous les agents ménage proposés', () => {
    render(<AgentSelector agentsMenage={agentsMenage} onSelect={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Fatima Z.' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Karim B.' })).toBeInTheDocument()
  })
})
