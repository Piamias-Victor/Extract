'use client'

import { useState } from 'react'
import type { CaTtcResult, CaTtcParams } from '@/lib/queries/ca-ttc'
import type { ApiResponse } from '@/types/api'

interface UseCaTtcReturn {
  result: CaTtcResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  calculateCaTtc: (params: CaTtcParams) => Promise<void>
}

export function useCaTtc(): UseCaTtcReturn {
  const [result, setResult] = useState<CaTtcResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const calculateCaTtc = async (params: CaTtcParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/ca-ttc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<CaTtcResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors du calcul du CA TTC')
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
    calculateCaTtc
  }
}