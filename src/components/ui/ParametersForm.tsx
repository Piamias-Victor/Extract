'use client'

import { useState } from 'react'
import type { KpiParameters } from '@/types/kpi'

interface ParameterField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
}

interface ParametersFormProps {
  fields: ParameterField[]
  values: KpiParameters
  onChange: (values: KpiParameters) => void
  disabled?: boolean
}

export function ParametersForm({ 
  fields, 
  values, 
  onChange, 
  disabled = false 
}: ParametersFormProps): React.ReactElement {
  const [localValues, setLocalValues] = useState<KpiParameters>(values)

  const handleChange = (key: string, value: string | number | Date | null): void => {
    const newValues = { ...localValues, [key]: value }
    setLocalValues(newValues)
    onChange(newValues)
  }

  if (fields.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres :</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-500">
            Aucun paramètre requis pour cette extraction
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Paramètres :</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                id={field.key}
                value={String(localValues[field.key] || '')}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Sélectionner...</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                type="date"
                id={field.key}
                value={String(localValues[field.key] || '')}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                id={field.key}
                value={String(localValues[field.key] || '')}
                onChange={(e) => handleChange(field.key, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            ) : (
              <input
                type="text"
                id={field.key}
                value={String(localValues[field.key] || '')}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}