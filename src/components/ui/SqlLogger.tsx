'use client'

interface SqlLoggerProps {
  sql: string | null
  visible?: boolean
}

export function SqlLogger({ sql, visible = true }: SqlLoggerProps): React.ReactElement | null {
  if (!sql || !visible) {
    return null
  }

  return (
    <div className="mt-4">
      <h4 className="font-medium text-gray-900 mb-2">Requête SQL générée :</h4>
      <div className="relative">
        <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-auto text-sm max-h-64">
          {sql}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(sql)}
          className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
        >
          Copier SQL
        </button>
      </div>
    </div>
  )
}