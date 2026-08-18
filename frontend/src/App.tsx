import { useEffect, useState } from 'react'
import {
  checkoutSejour,
  createAppartement,
  createChecklistModele,
  createChecklistModeleItem,
  createProduitCatalogue,
  createProprietaire,
  createSejour,
  createUtilisateur,
  deleteChecklistModeleItem,
  deplacerChecklistModeleItem,
  fetchAppartements,
  fetchChecklistModeles,
  fetchDashboard,
  fetchProduitsCatalogue,
  fetchProduitsSignales,
  fetchProprietaires,
  fetchUtilisateurs,
  rejeterProduitSignale,
  updateAppartement,
  updateSejour,
  updateUtilisateur,
  validerProduitSignale,
  type NewAppartementInput,
  type NewProduitCatalogueInput,
  type NewProprietaireInput,
  type NewSejourInput,
  type NewUtilisateurInput,
  type ValiderProduitSignaleInput,
} from './api'
import { AgentsMenageListeSection } from './components/AgentsMenageListeSection'
import { AppartementsListeSection } from './components/AppartementsListeSection'
import { CatalogueProduitsSection } from './components/CatalogueProduitsSection'
import { DashboardSection } from './components/DashboardSection'
import { HistoriqueMenageSection } from './components/HistoriqueMenageSection'
import { NotificationBell } from './components/NotificationBell'
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
  Proprietaire,
  Sejour,
  SejourStatut,
  TicketMaintenanceStatut,
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
  | 'menage-historique'
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
      ['menage-historique', 'Historique'],
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
  'menage-historique': 'Ménage',
  'maintenance-agent': 'Maintenance',
  'maintenance-tickets': 'Maintenance',
}

function groupKeyForTab(tab: Tab): string | null {
  return NAV_GROUPS.find((group) => group.tabs.some(([t]) => t === tab))?.key ?? null
}

function getGroupIcon(key: string, isActive: boolean) {
  const className = `mr-3 h-5 w-5 shrink-0 transition-colors duration-200 ${
    isActive ? 'text-indigo-600' : 'text-gray-400'
  }`

  switch (key) {
    case 'sejours':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0h10a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zM4 12h16" />
        </svg>
      )
    case 'appartements':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'menage':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.8 15.9L9 18.75l-.8-2.85a4.5 4.5 0 00-3.1-3.1L2.25 12l2.85-.8a4.5 4.5 0 003.1-3.1L9 5.25l.8 2.85a4.5 4.5 0 003.1 3.1l2.85.8-2.85.8a4.5 4.5 0 00-3.1 3.1z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 3.75v3M16.5 5.25h3" />
        </svg>
      )
    case 'maintenance':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 00-5.09 4.99L4 17v3h3l5.71-5.61a4 4 0 004.99-5.09l-2.62 2.62-2-2z" />
        </svg>
      )
    default:
      return null
  }
}

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([])
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
  const [pendingTicketStatutFilter, setPendingTicketStatutFilter] = useState<TicketMaintenanceStatut | ''>('')
  const { user, logout } = useAuth()

  usePwaIdentity('manager')

  const navigateTo = (tab: Tab) => {
    setActiveTab(tab)
    setExpandedGroup(groupKeyForTab(tab))
    setPendingSejourId(null)
    setPendingStatutFilter('')
    setPendingTicketStatutFilter('')
  }

  const handleNavigateToSejourDetail = (sejourId: number) => {
    navigateTo('sejour-liste')
    setPendingSejourId(sejourId)
  }

  const handleNavigateToSejoursListe = (statut?: SejourStatut) => {
    navigateTo('sejour-liste')
    if (statut) setPendingStatutFilter(statut)
  }

  const handleNavigateToTicketsMaintenance = (statut?: TicketMaintenanceStatut) => {
    navigateTo('maintenance-tickets')
    if (statut) setPendingTicketStatutFilter(statut)
  }

  const loadData = async () => {
    setLoadError(null)
    try {
      const [
        appartementsData,
        proprietairesData,
        checklistModelesData,
        agentsMenageData,
        produitsCatalogueData,
        produitsSignalesData,
      ] = await Promise.all([
        fetchAppartements(),
        fetchProprietaires(),
        fetchChecklistModeles(),
        fetchUtilisateurs({ role: 'menage' }),
        fetchProduitsCatalogue(),
        fetchProduitsSignales('en_attente'),
      ])
      setAppartements(appartementsData)
      setProprietaires(proprietairesData)
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

  // Used after a checkout from the Dashboard's "Départs prévus aujourd'hui"
  // banner, so the departed sejour disappears from the list right away
  // instead of waiting for the next tab switch.
  const handleDashboardCheckout = async (sejourId: number) => {
    await checkoutSejour(sejourId)
    const data = await fetchDashboard()
    setDashboardData(data)
  }

  // Refresh the appartement list every time "Nouveau séjour" opens, so its
  // selector reflects the current computed statut (an appartement excluded
  // for being "maintenance" must disappear as soon as that becomes true,
  // not just at initial page load).
  useEffect(() => {
    if (activeTab !== 'sejour-creer') return

    let cancelled = false
    fetchAppartements()
      .then((data) => {
        if (!cancelled) setAppartements(data)
      })
      .catch(() => {})

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

  const handleCreateProprietaire = async (input: NewProprietaireInput) => {
    const proprietaire = await createProprietaire(input)
    setProprietaires((current) => [...current, proprietaire].sort((a, b) => a.nom.localeCompare(b.nom)))
    return proprietaire
  }

  const handleCreateChecklistModele = async (nom: string) => {
    const modele = await createChecklistModele(nom)
    setChecklistModeles((current) => [...current, modele].sort((a, b) => a.nom.localeCompare(b.nom)))
    return modele
  }

  const handleAddChecklistModeleItem = async (checklistModeleId: number, libelle: string, photo?: File | null) => {
    const item = await createChecklistModeleItem(checklistModeleId, libelle, photo)
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

  // Both the sidebar sub-item clicks and toggleGroup's default-tab jump can
  // land directly on a create/edit tab without going through the dedicated
  // "+ Nouveau"/pencil handlers (setEditingX(...) + navigateTo(...)) that
  // normally keep a "creer" tab's form in sync with what's highlighted.
  // Without this, e.g. clicking "Créer un séjour" directly while an edit
  // was in progress left editingSejour set, so the form still showed
  // "Modifier le séjour" -- highlighted entry and displayed screen no
  // longer matched. "menage-agent" is included because it's also the
  // "menage" group's defaultTab, so toggleGroup can jump there too.
  const clearEditingStateFor = (tab: Tab) => {
    if (tab === 'sejour-creer') setEditingSejour(null)
    if (tab === 'appartement-creer') setEditingAppartement(null)
    if (tab === 'menage-agent') setEditingUtilisateur(null)
  }

  const handleSidebarNavigate = (tab: Tab) => {
    clearEditingStateFor(tab)
    navigateTo(tab)
  }

  const toggleGroup = (group: NavGroup) => {
    if (expandedGroup === group.key) {
      setExpandedGroup(null)
      return
    }

    setExpandedGroup(group.key)
    if (groupKeyForTab(activeTab) !== group.key) {
      clearEditingStateFor(group.defaultTab)
      setActiveTab(group.defaultTab)
    }
  }

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white p-5 select-none shadow-xs">
        <div className="flex items-center justify-center py-4 mb-6">
          <img src="/logo.png" alt="RestInnov" className="h-10 w-auto" />
        </div>

        <ul className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          <li>
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className={`flex w-full items-center rounded-lg py-2.5 pr-3 text-left text-sm font-medium border-l-4 transition-all duration-200 ease-in-out cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50/80 text-indigo-700 border-indigo-600 pl-2.5 shadow-xs'
                  : 'text-gray-600 border-transparent pl-2.5 hover:bg-gray-50 hover:text-gray-900 hover:pl-3.5'
              }`}
            >
              <svg className={`mr-3 h-5 w-5 shrink-0 transition-colors duration-200 ${
                activeTab === 'dashboard' ? 'text-indigo-600' : 'text-gray-400'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Dashboard</span>
            </button>
          </li>

          {NAV_GROUPS.map((group) => {
            const isExpanded = expandedGroup === group.key
            const isActiveGroup = groupKeyForTab(activeTab) === group.key

            return (
              <li key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={isExpanded}
                  className={`flex w-full items-center justify-between rounded-lg py-2.5 pr-3 text-left text-sm font-medium border-l-4 transition-all duration-200 ease-in-out cursor-pointer ${
                    isActiveGroup
                      ? 'bg-indigo-50/80 text-indigo-700 border-indigo-600 pl-2.5'
                      : 'text-gray-600 border-transparent pl-2.5 hover:bg-gray-50 hover:text-gray-900 hover:pl-3.5'
                  }`}
                >
                  <span className="flex items-center">
                    {getGroupIcon(group.key, isActiveGroup)}
                    <span>{group.label}</span>
                  </span>
                  <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-600' : 'text-gray-400'}`} aria-hidden="true">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
                {isExpanded && (
                  <ul className="mt-1 space-y-1 pl-7 border-l border-gray-100 ml-5 animate-slide-down">
                    {group.tabs.map(([tab, label]) => {
                      const isActiveTab = activeTab === tab
                      return (
                        <li key={tab}>
                          <button
                            type="button"
                            onClick={() => handleSidebarNavigate(tab)}
                            className={`block w-full rounded-md py-1.5 px-3 text-left text-sm transition-all duration-150 ease-in-out cursor-pointer ${
                              isActiveTab
                                ? 'bg-indigo-50/60 text-indigo-700 font-semibold shadow-xs'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:pl-4'
                            }`}
                          >
                            {label}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="flex w-full items-center rounded-lg py-2.5 pr-3 pl-2.5 text-left text-sm font-medium border-l-4 border-transparent text-gray-600 transition-all duration-200 ease-in-out hover:bg-red-50 hover:text-red-600 hover:border-red-500 hover:pl-3.5 cursor-pointer"
          >
            <svg className="mr-3 h-5 w-5 shrink-0 text-gray-400 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{SECTION_TITLES[activeTab]}</h2>
          
          <div className="flex items-center gap-4">
            <NotificationBell
              onNavigateToSejour={handleNavigateToSejourDetail}
              onNavigateToTicketsMaintenance={() => handleNavigateToTicketsMaintenance('ouvert')}
            />
            
            {/* User Profile Area */}
            <div className="relative group">
              <button 
                type="button" 
                className="flex items-center gap-3 rounded-full bg-white border border-gray-200 py-1.5 pl-1.5 pr-4 hover:border-gray-300 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {user?.nom.split(' ').map(n => n[0]).join('') ?? 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.nom ?? 'Utilisateur'}</span>
              </button>
              
              {/* Dropdown Menu - Simple implementation */}
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white border border-gray-100 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                <button 
                  onClick={() => { void logout() }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
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
              onCheckout={handleDashboardCheckout}
              onNavigateToTicketsMaintenance={() => handleNavigateToTicketsMaintenance('ouvert')}
              onNavigateToResolutionsAValider={() => handleNavigateToTicketsMaintenance('resolu_en_attente_validation')}
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
              proprietaires={proprietaires}
              onSubmit={handleSubmitAppartement}
              onCreateProprietaire={handleCreateProprietaire}
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
          {activeTab === 'menage-historique' && <HistoriqueMenageSection appartements={appartements} />}
          {activeTab === 'maintenance-agent' && (
            <NouvelAgentMaintenanceForm onSubmit={handleCreateUtilisateur} />
          )}
          {activeTab === 'maintenance-tickets' && (
            <TicketsMaintenanceSection appartements={appartements} initialStatutFilter={pendingTicketStatutFilter} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
