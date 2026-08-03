export type SejourStatut = 'a_venir' | 'en_cours' | 'termine'

export type MissionStatut = 'a_faire' | 'en_cours' | 'conforme' | 'non_conforme'

export interface Appartement {
  id: number
  nom: string
  adresse: string
  statut: string
}

export interface Agent {
  id: number
  nom: string
  role: string
  telephone: string | null
}

export interface MissionMenage {
  id: number
  sejour_id: number
  agent_id: number | null
  statut: MissionStatut
  agent: Agent | null
}

export interface Sejour {
  id: number
  appartement_id: number
  date_arrivee: string
  date_depart: string
  nom_voyageur: string
  statut: SejourStatut
  appartement?: Appartement
  mission_menage?: MissionMenage | null
}
