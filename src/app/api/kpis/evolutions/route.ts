import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEvolutions, type EvolutionsParams, type EvolutionsResult } from '@/lib/queries/evolutions'
import type { ApiResponse } from '@/types/api'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<EvolutionsResult>>> {
  try {
    const body = await request.json() as EvolutionsParams

    // Validation des paramètres obligatoires
    if (!body.date_debut_courante || !body.date_fin_courante || 
        !body.date_debut_comparaison || !body.date_fin_comparaison) {
      return NextResponse.json({
        success: false,
        error: 'Toutes les dates sont obligatoires (début/fin pour chaque période)'
      }, { status: 400 })
    }

    // Validation du format des dates
    const dates = [
      body.date_debut_courante,
      body.date_fin_courante,
      body.date_debut_comparaison,
      body.date_fin_comparaison
    ]

    for (const dateStr of dates) {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return NextResponse.json({
          success: false,
          error: `Format de date invalide: ${dateStr}. Utilisez YYYY-MM-DD`
        }, { status: 400 })
      }
    }

    // Validation cohérence des périodes
    const dateCouranteDebut = new Date(body.date_debut_courante)
    const dateCouranteFin = new Date(body.date_fin_courante)
    const dateComparaisonDebut = new Date(body.date_debut_comparaison)
    const dateComparaisonFin = new Date(body.date_fin_comparaison)

    if (dateCouranteDebut > dateCouranteFin) {
      return NextResponse.json({
        success: false,
        error: 'La date de début de la période courante doit être antérieure à la date de fin'
      }, { status: 400 })
    }

    if (dateComparaisonDebut > dateComparaisonFin) {
      return NextResponse.json({
        success: false,
        error: 'La date de début de la période de comparaison doit être antérieure à la date de fin'
      }, { status: 400 })
    }

    const result = await getEvolutions({ client: supabase }, body)

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