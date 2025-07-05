import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAllFournisseurs } from '@/lib/queries/fournisseurs'
import type { ApiResponse } from '@/types/api'
import type { FournisseurWithPharmacie } from '@/lib/queries/fournisseurs'

export async function GET(): Promise<NextResponse<ApiResponse<FournisseurWithPharmacie[]>>> {
  try {
    const result = await getAllFournisseurs({ client: supabase })

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      sql: result.metadata.sql,
      executionTime: result.metadata.executionTime,
      count: result.metadata.count
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 })
  }
}