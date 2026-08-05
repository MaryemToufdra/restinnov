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
  fetchDashboard,
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
import { DashboardSection } from './components/DashboardSection'
import { NouveauSejourForm } from './components/NouveauSejourForm'
import { NouvelAgentForm } from './components/NouvelAgentForm'
import { NouvelAgentMaintenanceForm } from './components/NouvelAgentMaintenanceForm'
import { NouvelAppartementForm } from './components/NouvelAppartementForm'
import { ProduitsSignalesSection } from './components/ProduitsSignalesSection'
import { SejourCard } from './components/SejourCard'
import type {
  Agent,
  Appartement,
  ChecklistModele,
  DashboardData,
  ProduitCatalogue,
  ProduitMenageSignale,
  Sejour,
} from './types'

type Tab = 'dashboard' | 'sejour' | 'appartement' | 'agent' | 'agent-maintenance' | 'catalogue'

const NAV_ITEMS: [Tab, string][] = [
  ['dashboard', 'Dashboard'],
  ['sejour', 'Séjours'],
  ['appartement', 'Appartements'],
  ['agent', 'Agent de ménage'],
  ['agent-maintenance', 'Agent de maintenance'],
  ['catalogue', 'Catalogue ménage'],
]

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [checklistModeles, setChecklistModeles] = useState<ChecklistModele[]>([])
  const [agentsMenage, setAgentsMenage] = useState<Agent[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<ProduitCatalogue[]>([])
  const [produitsSignales, setProduitsSignales] = useState<ProduitMenageSignale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

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

  useEffect(() => {
    if (activeTab !== 'dashboard') return

    let cancelled = false
    setDashboardError(null)
    setDashboardLoading(true)
    fetchDashboard()
      .then((data) => {
        if (!cancelled) setDashboardData(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDashboardError(err instanceof Error ? err.message : 'Impossible de charger le dashboard.')
        }
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab])

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
    <div className="flex min-h-screen">
      <nav className="w-64 shrink-0 border-r border-gray-200 bg-white px-4 py-8">
        <h1 className="px-2 text-xl font-bold text-gray-900">Séjours & ménage</h1>
        <ul className="mt-6 space-y-1">
          {NAV_ITEMS.map(([tab, label]) => (
            <li key={tab}>
              <button
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="min-w-0 flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900">{NAV_ITEMS.find(([tab]) => tab === activeTab)?.[1]}</h2>

        <div className="mt-6 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardSection
              data={dashboardData}
              loading={dashboardLoading}
              error={dashboardError}
              onNavigateToAppartements={() => setActiveTab('appartement')}
            />
          )}
          {activeTab === 'sejour' && (
            <>
              <NouveauSejourForm appartements={appartements} onSubmit={handleCreateSejour} />

              <div>
                {loading && <p className="mt-2 text-sm text-gray-500">Chargement...</p>}
                {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
                {!loading && !loadError && sejours.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">Aucun séjour pour le moment.</p>
                )}

                <ul className="mt-3 space-y-3" aria-label="Liste des séjours">
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
            </>
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
          {activeTab === 'agent-maintenance' && (
            <NouvelAgentMaintenanceForm onSubmit={handleCreateUtilisateur} />
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
      </main>
    </div>
  )
}

export default App
