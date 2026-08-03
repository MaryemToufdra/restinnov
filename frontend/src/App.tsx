import { useEffect, useState } from 'react'
import { checkoutSejour, createSejour, fetchAppartements, fetchSejours } from './api'
import { NouveauSejourForm } from './components/NouveauSejourForm'
import { SejourCard } from './components/SejourCard'
import type { Appartement, Sejour } from './types'

function App() {
  const [appartements, setAppartements] = useState<Appartement[]>([])
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = async () => {
    setLoadError(null)
    try {
      const [appartementsData, sejoursData] = await Promise.all([
        fetchAppartements(),
        fetchSejours(),
      ])
      setAppartements(appartementsData)
      setSejours(sejoursData)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSejour = async (input: {
    appartement_id: number
    date_arrivee: string
    date_depart: string
    nom_voyageur: string
  }) => {
    const sejour = await createSejour(input)
    setSejours((current) => [sejour, ...current])
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
        Créez un séjour et confirmez son checkout pour générer automatiquement une mission de ménage.
      </p>

      <div className="mt-6">
        <NouveauSejourForm appartements={appartements} onSubmit={handleCreateSejour} />
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
