import { useEffect, useState } from 'react'
import {
  checkoutSejour,
  createAppartement,
  createChecklistModele,
  createSejour,
  createUtilisateur,
  fetchAppartements,
  fetchChecklistModeles,
  fetchSejours,
  fetchUtilisateurs,
  type NewAppartementInput,
  type NewSejourInput,
  type NewUtilisateurInput,
} from './api'
import { NouveauSejourForm } from './components/NouveauSejourForm'
import { NouvelAgentForm } from './components/NouvelAgentForm'
import { NouvelAppartementForm } from './components/NouvelAppartementForm'
import { SejourCard } from './components/SejourCard'
import type { Agent, Appartement, ChecklistModele, Sejour } from './types'

type Tab = 'sejour' | 'appartement' | 'agent'

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [checklistModeles, setChecklistModeles] = useState<ChecklistModele[]>([])
  const [agentsMenage, setAgentsMenage] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('sejour')

  const loadData = async () => {
    setLoadError(null)
    try {
      const [appartementsData, sejoursData, checklistModelesData, agentsMenageData] = await Promise.all([
        fetchAppartements(),
        fetchSejours(),
        fetchChecklistModeles(),
        fetchUtilisateurs('menage'),
      ])
      setAppartements(appartementsData)
      setSejours(sejoursData)
      setChecklistModeles(checklistModelesData)
      setAgentsMenage(agentsMenageData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSejour = async (input: NewSejourInput) => {
    const sejour = await createSejour(input)
    setSejours((current) => [sejour, ...current])
  }

  const handleCreateAppartement = async (input: NewAppartementInput) => {
    const appartement = await createAppartement(input)
    setAppartements((current) => [...current, appartement].sort((a, b) => a.nom.localeCompare(b.nom)))
    setActiveTab('sejour')
  }

  const handleCreateChecklistModele = async (nom: string) => {
    const modele = await createChecklistModele(nom)
    setChecklistModeles((current) => [...current, modele].sort((a, b) => a.nom.localeCompare(b.nom)))
    return modele
  }

  const handleCreateUtilisateur = async (input: NewUtilisateurInput) => {
    const agent = await createUtilisateur(input)
    if (agent.role === 'menage') {
      setAgentsMenage((current) => [...current, agent].sort((a, b) => a.nom.localeCompare(b.nom)))
    }

    const assignedIds = input.appartement_ids ?? []
    if (assignedIds.length > 0) {
      setAppartements((current) =>
        current.map((appartement) =>
          assignedIds.includes(appartement.id)
            ? { ...appartement, agent_habituel_id: agent.id, agent_habituel: agent }
            : appartement,
        ),
      )
    }
  }

  const handleCheckout = async (id: number) => {
    const { sejour: updated, mission_menage } = await checkoutSejour(id)
    setSejours((current) =>
      current.map((s) => (s.id === id ? { ...s, statut: updated.statut, mission_menage } : s)),
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Séjours & ménage</h1>
      <p className="mt-1 text-sm text-gray-600">
        Créez un appartement, un séjour ou un compte agent, puis confirmez le checkout pour générer automatiquement une mission de ménage.
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('sejour')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'sejour'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Nouveau séjour
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('appartement')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'appartement'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Nouvel appartement
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('agent')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'agent'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Nouvel agent de ménage
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'sejour' && (
          <NouveauSejourForm appartements={appartements} onSubmit={handleCreateSejour} />
        )}
        {activeTab === 'appartement' && (
          <NouvelAppartementForm
            checklistModeles={checklistModeles}
            agentsMenage={agentsMenage}
            onSubmit={handleCreateAppartement}
            onCreateChecklistModele={handleCreateChecklistModele}
          />
        )}
        {activeTab === 'agent' && (
          <NouvelAgentForm appartements={appartements} onSubmit={handleCreateUtilisateur} />
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Séjours</h2>

        {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        {!loading && !loadError && sejours.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">Aucun séjour pour le moment.</p>
        )}

        <ul className="mt-3 space-y-3">
          {sejours.map((sejour) => (
            <SejourCard key={sejour.id} sejour={sejour} onCheckout={handleCheckout} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
