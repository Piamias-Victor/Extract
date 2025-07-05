'use client'

import type { KpiOption } from '@/types/kpi'

interface KpiSelectorProps {
  options: KpiOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function KpiSelector({ options, value, onChange, disabled = false }: KpiSelectorProps): React.ReactElement {
  return (
    <div className="mb-6">
      <label htmlFor="kpi-select" className="block text-sm font-medium text-gray-700 mb-2">
        Type d'extraction :
      </label>
      <select
        id="kpi-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Sélectionner un KPI...</option>
        {options.map((kpi) => (
          <option key={kpi.id} value={kpi.id}>
            {kpi.label}
          </option>
        ))}
      </select>
      
      {options.length === 0 && (
        <p className="text-sm text-gray-500 mt-1">
          Aucun KPI configuré pour le moment
        </p>
      )}
      
      {value && options.find(opt => opt.id === value) && (
        <p className="text-sm text-gray-600 mt-2">
          {options.find(opt => opt.id === value)?.description}
        </p>
      )}
    </div>
  )
}