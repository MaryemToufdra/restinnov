import { useEffect, useState } from 'react'
import {
  checkoutSejour,
  createAppartement,
  createChecklistModele,
  createFraisMaintenance,
  createProduitCatalogue,
  createSejour,
  createUtilisateur,
  deleteFraisMaintenance,
  fetchAppartements,
  fetchChecklistModeles,
  fetchProduitsCatalogue,
  fetchProduitsSignales,
  fetchSejours,
  fetchUtilisateurs,
  rejeterProduitSignale,
  signalerProduit,
  updateMissionMenageProduits,
  validerProduitSignale,
  type NewAppartementInput,
  type NewFraisMaintenanceInput,
  type NewProduitCatalogueInput,
  type NewSejourInput,
  type NewUtilisateurInput,
  type SignalerProduitInput,
  type UpdateMissionMenageProduitsInput,
  type ValiderProduitSignaleInput,
} from './api'
import { CatalogueProduitsSection } from './components/CatalogueProduitsSection'
import { NouveauSejourForm } from './components/NouveauSejourForm'
import { NouvelAgentForm } from './components/NouvelAgentForm'
import { NouvelAppartementForm } from './components/NouvelAppartementForm'
import { ProduitsSignalesSection } from './components/ProduitsSignalesSection'
import { SejourCard } from './components/SejourCard'
import type { Agent, Appartement, ChecklistModele, ProduitCatalogue, ProduitMenageSignale, Sejour } from './types'

type Tab = 'sejour' | 'appartement' | 'agent' | 'catalogue'

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [checklistModeles, setChecklistModeles] = useState<ChecklistModele[]>([])
  const [agentsMenage, setAgentsMenage] = useState<Agent[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<ProduitCatalogue[]>([])
  const [produitsSignales, setProduitsSignales] = useState<ProduitMenageSignale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('sejour')

  const loadData = async () => {
    setLoadError(null)
    try {
      const [
        appartementsData,
        sejoursData,
        checklistModelesData,
        agentsMenageData,
        produitsCatalogueData,
        produitsSignalesData,
      ] = await Promise.all([
        fetchAppartements(),
        fetchSejours(),
        fetchChecklistModeles(),
        fetchUtilisateurs('menage'),
        fetchProduitsCatalogue(),
        fetchProduitsSignales('en_attente'),
      ])
      setAppartements(appartementsData)
      setSejours(sejoursData)
      setChecklistModeles(checklistModelesData)
      setAgentsMenage(agentsMenageData)
      setProduitsCatalogue(produitsCatalogueData)
      setProduitsSignales(produitsSignalesData)
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

  const handleCreateProduitCatalogue = async (input: NewProduitCatalogueInput) => {
    const produit = await createProduitCatalogue(input)
    setProduitsCatalogue((current) => [...current, produit].sort((a, b) => a.nom.localeCompare(b.nom)))
  }

  const handleUpdateMissionProduits = async (
    missionMenageId: number,
    input: UpdateMissionMenageProduitsInput,
  ) => {
    const updated = await updateMissionMenageProduits(missionMenageId, input)
    setSejours((current) =>
      current.map((s) =>
        s.mission_menage && s.mission_menage.id === missionMenageId ? { ...s, mission_menage: updated } : s,
      ),
    )
  }

  const handleSignalerProduit = async (missionMenageId: number, input: SignalerProduitInput) => {
    const created = await signalerProduit(missionMenageId, input)
    setProduitsSignales((current) => [created, ...current])
  }

  const handleValiderProduitSignale = async (id: number, input: ValiderProduitSignaleInput) => {
    const updated = await validerProduitSignale(id, input)
    setProduitsSignales((current) => current.filter((p) => p.id !== id))

    const nouveauProduit = updated.produit_catalogue
    if (nouveauProduit) {
      setProduitsCatalogue((current) => [...current, nouveauProduit].sort((a, b) => a.nom.localeCompare(b.nom)))
      setSejours((current) =>
        current.map((s) => {
          if (!s.mission_menage || s.mission_menage.id !== updated.mission_menage_id) return s
          if (s.mission_menage.produits?.some((p) => p.id === nouveauProduit.id)) return s
          return {
            ...s,
            mission_menage: {
              ...s.mission_menage,
              produits: [...(s.mission_menage.produits ?? []), nouveauProduit],
            },
          }
        }),
      )
    }
  }

  const handleRejeterProduitSignale = async (id: number) => {
    await rejeterProduitSignale(id)
    setProduitsSignales((current) => current.filter((p) => p.id !== id))
  }

  const handleAddFraisMaintenance = async (sejourId: number, input: NewFraisMaintenanceInput) => {
    const created = await createFraisMaintenance(sejourId, input)
    setSejours((current) =>
      current.map((s) =>
        s.id === sejourId ? { ...s, frais_maintenance: [...(s.frais_maintenance ?? []), created] } : s,
      ),
    )
  }

  const handleDeleteFraisMaintenance = async (id: number) => {
    await deleteFraisMaintenance(id)
    setSejours((current) =>
      current.map((s) => ({
        ...s,
        frais_maintenance: (s.frais_maintenance ?? []).filter((f) => f.id !== id),
      })),
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Séjours & ménage</h1>
      <p className="mt-1 text-sm text-gray-600">
        Créez un appartement, un séjour ou un compte agent, puis confirmez le checkout pour générer automatiquement une mission de ménage.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200">
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
        <button
          type="button"
          onClick={() => setActiveTab('catalogue')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            activeTab === 'catalogue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Catalogue ménage
        </button>
      </div>

      <div className="mt-6 space-y-6">
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
        {activeTab === 'catalogue' && (
          <>
            <CatalogueProduitsSection catalogue={produitsCatalogue} onCreate={handleCreateProduitCatalogue} />
            <ProduitsSignalesSection
              produitsSignales={produitsSignales}
              onValider={handleValiderProduitSignale}
              onRejeter={handleRejeterProduitSignale}
            />
          </>
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
            <SejourCard
              key={sejour.id}
              sejour={sejour}
              catalogue={produitsCatalogue}
              onCheckout={handleCheckout}
              onUpdateMissionProduits={handleUpdateMissionProduits}
              onSignalerProduit={handleSignalerProduit}
              onAddFraisMaintenance={handleAddFraisMaintenance}
              onDeleteFraisMaintenance={handleDeleteFraisMaintenance}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App
