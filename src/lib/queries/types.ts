import type { SupabaseClient } from '@/lib/supabase'

export interface QueryConfig {
  client: SupabaseClient
  pharmacieId?: number
  dateDebut?: string
  dateFin?: string
}

export interface QueryMetadata {
  sql: string
  executionTime: number
  count: number
}

export interface QueryResponse<T = unknown> {
  data: T[]
  metadata: QueryMetadata
  error?: string
}

export type QueryFunction<T = unknown, P = Record<string, unknown>> = (
  config: QueryConfig,
  params?: P
) => Promise<QueryResponse<T>>