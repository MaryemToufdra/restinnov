import { useEffect, useState } from 'react'
import {
  createAppartement,
  createChecklistModele,
  createChecklistModeleItem,
  createProduitCatalogue,
  createSejour,
  createUtilisateur,
  deleteChecklistModeleItem,
  deplacerChecklistModeleItem,
  fetchAppartements,
  fetchChecklistModeles,
  fetchDashboard,
  fetchProduitsCatalogue,
  fetchProduitsSignales,
  fetchUtilisateurs,
  rejeterProduitSignale,
  updateAppartement,
  updateSejour,
  updateUtilisateur,
  validerProduitSignale,
  type NewAppartementInput,
  type NewProduitCatalogueInput,
  type NewSejourInput,
  type NewUtilisateurInput,
  type ValiderProduitSignaleInput,
} from './api'
import { AgentsMenageListeSection } from './components/AgentsMenageListeSection'
import { AppartementsListeSection } from './components/AppartementsListeSection'
import { CatalogueProduitsSection } from './components/CatalogueProduitsSection'
import { DashboardSection } from './components/DashboardSection'
import { NouveauSejourForm } from './components/NouveauSejourForm'
import { NouvelAgentForm } from './components/NouvelAgentForm'
import { NouvelAgentMaintenanceForm } from './components/NouvelAgentMaintenanceForm'
import { NouvelAppartementForm } from './components/NouvelAppartementForm'
import { ProduitsSignalesSection } from './components/ProduitsSignalesSection'
import { SejoursListeSection } from './components/SejoursListeSection'
import { TicketsMaintenanceSection } from './components/TicketsMaintenanceSection'
import { useAuth } from './auth/AuthContext'
import { usePwaIdentity } from './pwa/usePwaIdentity'
import type {
  Agent,
  Appartement,
  ChecklistModele,
  DashboardData,
  ProduitCatalogue,
  ProduitMenageSignale,
  Sejour,
  SejourStatut,
} from './types'

type Tab =
  | 'dashboard'
  | 'sejour-creer'
  | 'sejour-liste'
  | 'appartement-creer'
  | 'appartement-liste'
  | 'menage-agent'
  | 'menage-agents-liste'
  | 'menage-catalogue'
  | 'maintenance-agent'
  | 'maintenance-tickets'

interface NavGroup {
  key: string
  label: string
  tabs: [Tab, string][]
  defaultTab: Tab
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'sejours',
    label: 'Séjours',
    tabs: [
      ['sejour-creer', 'Créer un séjour'],
      ['sejour-liste', 'Liste des séjours'],
    ],
    defaultTab: 'sejour-liste',
  },
  {
    key: 'appartements',
    label: 'Appartements',
    tabs: [
      ['appartement-creer', 'Créer un appartement'],
      ['appartement-liste', 'Liste des appartements'],
    ],
    defaultTab: 'appartement-liste',
  },
  {
    key: 'menage',
    label: 'Ménage',
    tabs: [
      ['menage-agent', 'Ajouter un agent ménage'],
      ['menage-agents-liste', 'Liste des agents'],
      ['menage-catalogue', 'Catalogue ménage'],
    ],
    defaultTab: 'menage-agent',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    tabs: [
      ['maintenance-agent', 'Ajouter un agent maintenance'],
      ['maintenance-tickets', 'Tickets de maintenance'],
    ],
    defaultTab: 'maintenance-agent',
  },
]

const SECTION_TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  'sejour-creer': 'Séjours',
  'sejour-liste': 'Séjours',
  'appartement-creer': 'Appartements',
  'appartement-liste': 'Appartements',
  'menage-agent': 'Ménage',
  'menage-agents-liste': 'Ménage',
  'menage-catalogue': 'Ménage',
  'maintenance-agent': 'Maintenance',
  'maintenance-tickets': 'Maintenance',
}

function groupKeyForTab(tab: Tab): string | null {
  return NAV_GROUPS.find((group) => group.tabs.some(([t]) => t === tab))?.key ?? null
}

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [checklistModeles, setChecklistModeles] = useState<ChecklistModele[]>([])
  const [agentsMenage, setAgentsMenage] = useState<Agent[]>([])
  const [produitsCatalogue, setProduitsCatalogue] = useState<ProduitCatalogue[]>([])
  const [produitsSignales, setProduitsSignales] = useState<ProduitMenageSignale[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [editingSejour, setEditingSejour] = useState<Sejour | null>(null)
  const [editingAppartement, setEditingAppartement] = useState<Appartement | null>(null)
  const [editingUtilisateur, setEditingUtilisateur] = useState<Agent | null>(null)
  const [pendingSejourId, setPendingSejourId] = useState<number | null>(null)
  const [pendingStatutFilter, setPendingStatutFilter] = useState<SejourStatut | ''>('')
  const { logout } = useAuth()

  usePwaIdentity('manager')

  const navigateTo = (tab: Tab) => {
    setActiveTab(tab)
    setExpandedGroup(groupKeyForTab(tab))
    setPendingSejourId(null)
    setPendingStatutFilter('')
  }

  const handleNavigateToSejourDetail = (sejourId: number) => {
    navigateTo('sejour-liste')
    setPendingSejourId(sejourId)
  }

  const handleNavigateToSejoursListe = (statut?: SejourStatut) => {
    navigateTo('sejour-liste')
    if (statut) setPendingStatutFilter(statut)
  }

  const loadData = async () => {
    setLoadError(null)
    try {
      const [appartementsData, checklistModelesData, agentsMenageData, produitsCatalogueData, produitsSignalesData] =
        await Promise.all([
          fetchAppartements(),
          fetchChecklistModeles(),
          fetchUtilisateurs({ role: 'menage' }),
          fetchProduitsCatalogue(),
          fetchProduitsSignales('en_attente'),
        ])
      setAppartements(appartementsData)
      setChecklistModeles(checklistModelesData)
      setAgentsMenage(agentsMenageData)
      setProduitsCatalogue(produitsCatalogueData)
      setProduitsSignales(produitsSignalesData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Impossible de charger les données.')
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

  const handleSubmitSejour = async (input: NewSejourInput) => {
    if (editingSejour) {
      await updateSejour(editingSejour.id, input)
      setEditingSejour(null)
    } else {
      await createSejour(input)
    }
    navigateTo('sejour-liste')
  }

  const handleCancelSejourForm = () => {
    if (editingSejour) {
      setEditingSejour(null)
      navigateTo('sejour-liste')
    }
  }

  const handleEditSejour = (sejour: Sejour) => {
    setEditingSejour(sejour)
    navigateTo('sejour-creer')
  }

  const handleSubmitAppartement = async (input: NewAppartementInput) => {
    if (editingAppartement) {
      const appartement = await updateAppartement(editingAppartement.id, input)
      setAppartements((current) =>
        current.map((a) => (a.id === appartement.id ? appartement : a)).sort((a, b) => a.nom.localeCompare(b.nom)),
      )
      setEditingAppartement(null)
    } else {
      const appartement = await createAppartement(input)
      setAppartements((current) => [...current, appartement].sort((a, b) => a.nom.localeCompare(b.nom)))
    }
    navigateTo('appartement-liste')
  }

  const handleCancelAppartementForm = () => {
    if (editingAppartement) {
      setEditingAppartement(null)
      navigateTo('appartement-liste')
    }
  }

  const handleEditAppartement = (appartement: Appartement) => {
    setEditingAppartement(appartement)
    navigateTo('appartement-creer')
  }

  const handleCreateChecklistModele = async (nom: string) => {
    const modele = await createChecklistModele(nom)
    setChecklistModeles((current) => [...current, modele].sort((a, b) => a.nom.localeCompare(b.nom)))
    return modele
  }

  const handleAddChecklistModeleItem = async (checklistModeleId: number, libelle: string) => {
    const item = await createChecklistModeleItem(checklistModeleId, libelle)
    setChecklistModeles((current) =>
      current.map((m) => (m.id === checklistModeleId ? { ...m, items: [...(m.items ?? []), item] } : m)),
    )
  }

  const handleDeplacerChecklistModeleItem = async (itemId: number, direction: 'haut' | 'bas') => {
    const updatedItems = await deplacerChecklistModeleItem(itemId, direction)
    const checklistModeleId = updatedItems[0]?.checklist_modele_id
    if (checklistModeleId == null) return
    setChecklistModeles((current) => current.map((m) => (m.id === checklistModeleId ? { ...m, items: updatedItems } : m)))
  }

  const handleDeleteChecklistModeleItem = async (itemId: number) => {
    await deleteChecklistModeleItem(itemId)
    setChecklistModeles((current) =>
      current.map((m) => ({ ...m, items: (m.items ?? []).filter((i) => i.id !== itemId) })),
    )
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

  const handleSubmitUtilisateur = async (input: NewUtilisateurInput) => {
    if (editingUtilisateur) {
      const updated = await updateUtilisateur(editingUtilisateur.id, {
        nom: input.nom,
        telephone: input.telephone,
        adresse: input.adresse ?? null,
        password: input.password ?? null,
      })
      setAgentsMenage((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)).sort((a, b) => a.nom.localeCompare(b.nom)),
      )
      setEditingUtilisateur(null)
      navigateTo('menage-agents-liste')
    } else {
      await handleCreateUtilisateur(input)
    }
  }

  const handleCancelUtilisateurForm = () => {
    if (editingUtilisateur) {
      setEditingUtilisateur(null)
      navigateTo('menage-agents-liste')
    }
  }

  const handleEditUtilisateur = (agent: Agent) => {
    setEditingUtilisateur(agent)
    navigateTo('menage-agent')
  }

  const handleCreateProduitCatalogue = async (input: NewProduitCatalogueInput) => {
    const produit = await createProduitCatalogue(input)
    setProduitsCatalogue((current) => [...current, produit].sort((a, b) => a.nom.localeCompare(b.nom)))
  }

  const handleValiderProduitSignale = async (id: number, input: ValiderProduitSignaleInput) => {
    const updated = await validerProduitSignale(id, input)
    setProduitsSignales((current) => current.filter((p) => p.id !== id))

    const nouveauProduit = updated.produit_catalogue
    if (nouveauProduit) {
      setProduitsCatalogue((current) => [...current, nouveauProduit].sort((a, b) => a.nom.localeCompare(b.nom)))
    }
  }

  const handleRejeterProduitSignale = async (id: number) => {
    await rejeterProduitSignale(id)
    setProduitsSignales((current) => current.filter((p) => p.id !== id))
  }

  const toggleGroup = (group: NavGroup) => {
    if (expandedGroup === group.key) {
      setExpandedGroup(null)
      return
    }

    setExpandedGroup(group.key)
    if (groupKeyForTab(activeTab) !== group.key) {
      setActiveTab(group.defaultTab)
    }
  }

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-8">
        <h1 className="px-2 text-xl font-bold text-gray-900">Séjours & ménage</h1>
        <ul className="mt-6 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
          </li>

          {NAV_GROUPS.map((group) => {
            const isExpanded = expandedGroup === group.key
            const isActiveGroup = groupKeyForTab(activeTab) === group.key

            return (
              <li key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={isExpanded}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium ${
                    isActiveGroup
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {group.label}
                  <span className="text-xs" aria-hidden="true">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>
                {isExpanded && (
                  <ul className="mt-1 space-y-1 pl-3">
                    {group.tabs.map(([tab, label]) => (
                      <li key={tab}>
                        <button
                          type="button"
                          onClick={() => navigateTo(tab)}
                          className={`block w-full rounded-md px-3 py-1.5 text-left text-sm ${
                            activeTab === tab
                              ? 'bg-indigo-50 text-indigo-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            void logout()
          }}
          className="mt-auto rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          Déconnexion
        </button>
      </nav>

      <main className="min-w-0 flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900">{SECTION_TITLES[activeTab]}</h2>
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}

        <div className="mt-6 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardSection
              data={dashboardData}
              loading={dashboardLoading}
              error={dashboardError}
              onNavigateToAppartements={() => navigateTo('appartement-liste')}
              onNavigateToSejour={handleNavigateToSejourDetail}
              onNavigateToSejoursListe={handleNavigateToSejoursListe}
            />
          )}
          {activeTab === 'sejour-creer' && (
            <NouveauSejourForm
              appartements={appartements}
              onSubmit={handleSubmitSejour}
              onCancel={handleCancelSejourForm}
              sejourToEdit={editingSejour}
            />
          )}
          {activeTab === 'sejour-liste' && (
            <SejoursListeSection
              appartements={appartements}
              catalogue={produitsCatalogue}
              onNavigateToCreer={() => {
                setEditingSejour(null)
                navigateTo('sejour-creer')
              }}
              onEditSejour={handleEditSejour}
              initialSejourId={pendingSejourId}
              initialStatutFilter={pendingStatutFilter}
            />
          )}
          {activeTab === 'appartement-creer' && (
            <NouvelAppartementForm
              checklistModeles={checklistModeles}
              agentsMenage={agentsMenage}
              onSubmit={handleSubmitAppartement}
              onCreateChecklistModele={handleCreateChecklistModele}
              onAddChecklistModeleItem={handleAddChecklistModeleItem}
              onDeplacerChecklistModeleItem={handleDeplacerChecklistModeleItem}
              onDeleteChecklistModeleItem={handleDeleteChecklistModeleItem}
              onCancel={handleCancelAppartementForm}
              appartementToEdit={editingAppartement}
            />
          )}
          {activeTab === 'appartement-liste' && (
            <AppartementsListeSection
              onNavigateToCreer={() => {
                setEditingAppartement(null)
                navigateTo('appartement-creer')
              }}
              onEditAppartement={handleEditAppartement}
            />
          )}
          {activeTab === 'menage-agent' && (
            <NouvelAgentForm
              appartements={appartements}
              onSubmit={handleSubmitUtilisateur}
              onCancel={handleCancelUtilisateurForm}
              agentToEdit={editingUtilisateur}
            />
          )}
          {activeTab === 'menage-agents-liste' && (
            <AgentsMenageListeSection onEditAgent={handleEditUtilisateur} onAgentsChanged={loadData} />
          )}
          {activeTab === 'menage-catalogue' && (
            <>
              <CatalogueProduitsSection catalogue={produitsCatalogue} onCreate={handleCreateProduitCatalogue} />
              <ProduitsSignalesSection
                produitsSignales={produitsSignales}
                onValider={handleValiderProduitSignale}
                onRejeter={handleRejeterProduitSignale}
              />
            </>
          )}
          {activeTab === 'maintenance-agent' && (
            <NouvelAgentMaintenanceForm onSubmit={handleCreateUtilisateur} />
          )}
          {activeTab === 'maintenance-tickets' && <TicketsMaintenanceSection />}
        </div>
      </main>
    </div>
  )
}

export default App
