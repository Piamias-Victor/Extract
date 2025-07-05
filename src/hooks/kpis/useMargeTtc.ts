'use client'

import { useState } from 'react'
import type { MargeTtcResult, MargeTtcParams } from '@/lib/queries/marge-ttc'
import type { ApiResponse } from '@/types/api'

interface UseMargeTtcReturn {
  result: MargeTtcResult | null
  loading: boolean
  error: string | null
  sql: string | null
  executionTime: number | null
  calculateMargeTtc: (params: MargeTtcParams) => Promise<void>
}

export function useMargeTtc(): UseMargeTtcReturn {
  const [result, setResult] = useState<MargeTtcResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const calculateMargeTtc = async (params: MargeTtcParams): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kpis/marge-ttc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })

      const apiResult: ApiResponse<MargeTtcResult> = await response.json()

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erreur lors du calcul de la marge TTC')
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
    calculateMargeTtc
  }
}