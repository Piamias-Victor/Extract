'use client'

import type { KpiResult } from '@/types/kpi'

interface JsonDisplayProps {
  result: KpiResult | null
  loading?: boolean
}

export function JsonDisplay({ result, loading = false }: JsonDisplayProps): React.ReactElement | null {
  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Extraction en cours...</h3>
        <div className="bg-gray-100 p-4 rounded-md animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!result) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Résultat :</h3>
      
      {/* Métadonnées */}
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {result.executionTime !== undefined && (
            <div>
              <span className="font-medium">Temps d'exécution:</span>
              <span className="ml-2">{result.executionTime}ms</span>
            </div>
          )}
          {result.count !== undefined && (
            <div>
              <span className="font-medium">Nombre de lignes:</span>
              <span className="ml-2">{result.count}</span>
            </div>
          )}
          {result.sql && (
            <div>
              <span className="font-medium">SQL:</span>
              <span className="ml-2">Voir ci-dessous</span>
            </div>
          )}
        </div>
      </div>

      {/* Données JSON */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Données :</h4>
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm max-h-96">
            {JSON.stringify(result.data, null, 2)}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(result.data, null, 2))}
            className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
          >
            Copier
          </button>
        </div>
      </div>
    </div>
  )
}