'use client'

import { useFournisseurs } from '@/hooks/kpis/useFournisseurs'
import { JsonDisplay } from '@/components/ui/JsonDisplay'
import { SqlLogger } from '@/components/ui/SqlLogger'

export function FournisseursSearch(): React.ReactElement {
  const {
    filteredFournisseurs,
    loading,
    error,
    search,
    setSearch,
    sql,
    executionTime,
    count
  } = useFournisseurs()

  return (
    <div className="space-y-6">
      {/* Input de recherche */}
      <div>
        <label htmlFor="search-fournisseurs" className="block text-sm font-medium text-gray-700 mb-2">
          Rechercher un fournisseur :
        </label>
        <input
          type="text"
          id="search-fournisseurs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom du fournisseur, code ou pharmacie..."
          disabled={loading}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <p className="text-sm text-gray-500 mt-1">
          {loading ? 'Chargement...' : `${count} fournisseur(s) trouvé(s)`}
        </p>
      </div>

      {/* Gestion des erreurs */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Affichage des résultats */}
      {!loading && !error && (
        <>
          <JsonDisplay
            result={{
              data: filteredFournisseurs,
              sql: sql || undefined,
              executionTime: executionTime || undefined,
              count: count
            }}
            loading={loading}
          />
          
          <SqlLogger sql={sql} />
        </>
      )}

      {/* État de chargement */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-md animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
    </div>
  )
}