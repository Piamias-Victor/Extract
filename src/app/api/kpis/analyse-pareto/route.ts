import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAnalysePareto, type AnalyseParetoParams, type AnalyseParetoResult } from '@/lib/queries/analyse-pareto'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyseParetoResult>>> {
  try {
    const body = await request.json() as AnalyseParetoParams

    // Validation des paramètres obligatoires
    if (typeof body.seuil_pareto !== 'number' || !body.date_debut || !body.date_fin) {
      return NextResponse.json({
        success: false,
        error: 'Les paramètres seuil_pareto (number), date_debut et date_fin sont obligatoires'
      }, { status: 400 })
    }

    // Validation du seuil Pareto
    if (body.seuil_pareto < 1 || body.seuil_pareto > 100) {
      return NextResponse.json({
        success: false,
        error: 'Le seuil Pareto doit être entre 1 et 100%'
      }, { status: 400 })
    }

    // Validation du format des dates
    const dateDebut = new Date(body.date_debut)
    const dateFin = new Date(body.date_fin)
    
    if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Format de date invalide. Utilisez YYYY-MM-DD'
      }, { status: 400 })
    }

    if (dateDebut > dateFin) {
      return NextResponse.json({
        success: false,
        error: 'La date de début doit être antérieure à la date de fin'
      }, { status: 400 })
    }

    const result = await getAnalysePareto({ client: supabase }, body)

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