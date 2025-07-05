import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAnalyseMarge, type AnalyseMargeParams, type AnalyseMargeResult } from '@/lib/queries/analyse-marge'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyseMargeResult>>> {
  try {
    const body = await request.json() as AnalyseMargeParams

    // Validation des paramètres obligatoires
    if (typeof body.seuil_marge !== 'number' || !body.mode) {
      return NextResponse.json({
        success: false,
        error: 'Les paramètres seuil_marge (number) et mode ("dessous"|"dessus") sont obligatoires'
      }, { status: 400 })
    }

    // Validation du seuil de marge
    if (body.seuil_marge < 0 || body.seuil_marge > 100) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil de marge doit être entre 0 et 100%'
      }, { status: 400 })
    }

    // Validation du mode
    if (body.mode !== 'dessous' && body.mode !== 'dessus') {
      return NextResponse.json({
        success: false,
        error: 'Le mode doit être "dessous" ou "dessus"'
      }, { status: 400 })
    }

    const result = await getAnalyseMarge({ client: supabase }, body)

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data[0] || null,
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