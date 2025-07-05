'use client'

import { useState } from 'react'
import type { AnalyseSaisonnaliteResult, AnalyseSaisonnaliteParams } from '@/lib/queries/analyse-saisonnalite'
import type { ApiResponse } from '@/types/api'

interface UseAnalyseSaisonnaliteReturn {
  result: AnalyseSaisonnaliteResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  analyserSaisonnalite: (params?: AnalyseSaisonnaliteParams) => Promise<void>
}

export function useAnalyseSaisonnalite(): UseAnalyseSaisonnaliteReturn {
  const [result, setResult] = useState<AnalyseSaisonnaliteResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const analyserSaisonnalite = async (params: AnalyseSaisonnaliteParams = {}): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/analyse-saisonnalite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<AnalyseSaisonnaliteResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors de l\'analyse de saisonnalité')
      }

      setResult(apiResult.data || null)
      setSql(apiResult.sql || null)
      setExecutionTime(apiResult.executionTime || null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return {
    result,
    loading,
    error,
    sql,
    executionTime,
    analyserSaisonnalite
  }
}