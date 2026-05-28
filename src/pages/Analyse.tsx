import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useDaysStore }        from '../store/useDaysStore'
import { useRateForYear, useSettingsStore } from '../store/useSettingsStore'
import { calcDayStats, calcMonthStats } from '../lib/calculations'
import {
  currentMonthKey,
  prevMonthKey,
  nextMonthKey,
  formatMonthKey,
  isCurrentOrFutureMonth,
} from '../lib/dateUtils'

import AnalysisSummary    from '../components/analysis/AnalysisSummary'
import MonthlyRateChart   from '../components/analysis/MonthlyRateChart'
import GapEvolutionChart  from '../components/analysis/GapEvolutionChart'
import DrivingWorkChart   from '../components/analysis/DrivingWorkChart'
import AmplitudeChart     from '../components/analysis/AmplitudeChart'
import DayRankingCard          from '../components/analysis/DayRankingCard'
import OptimizationTrialCard  from '../components/analysis/OptimizationTrialCard'

// ------------------------------------------------------------
// Type partagé — point de données pour tous les graphiques
// Exporté pour être importé dans chaque composant enfant.
// ------------------------------------------------------------

export interface ChartDataPoint {
  /** Libellé axe X — numéro du jour, ex. "1", "14" */
  label: string
  /** Date ISO complète — "2026-04-14" */
  dateISO: string
  /** TxService en % */
  txService: number
  /** Écart en minutes (signé) */
  gapMins: number
  /** Conduite en minutes */
  drivingMins: number
  /** Travail annexe en minutes */
  workMins: number
  /** Service total en minutes */
  serviceMins: number
  /** Amplitude en minutes (null si non calculable) */
  amplitudeMins: number | null
  /** TxAmp en % (null si non calculable) */
  amplitudeRatePercent: number | null
}

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------

export default function Analyse() {
  const { days }                    = useDaysStore()
  const { hourlyRate, amplitudeBonus } = useSettingsStore()

  // ── Sélecteur de mois ─────────────────────────────────────
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const canGoNext  = !isCurrentOrFutureMonth(monthKey)
  const monthLabel = formatMonthKey(monthKey)
  const monthYear  = parseInt(monthKey.slice(0, 4), 10)

  // ── Taux de référence de l'année affichée ─────────────────
  const referenceRatePercent = useRateForYear(monthYear)

  // ── Journées du mois (triées par date croissante) ─────────
  const monthEntries = useMemo(
    () =>
      days
        .filter((d) => d.date.startsWith(monthKey))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [days, monthKey]
  )

  // ── Stats mensuelles agrégées ─────────────────────────────
  const monthStats = useMemo(
    () => calcMonthStats(monthEntries, referenceRatePercent),
    [monthEntries, referenceRatePercent]
  )

  // ── Points de données pour les graphiques ─────────────────
  const chartData = useMemo<ChartDataPoint[]>(
    () =>
      monthEntries.map((entry) => {
        const s = calcDayStats(entry, referenceRatePercent)
        return {
          label:               String(parseInt(entry.date.slice(8), 10)), // "01" → "1"
          dateISO:             entry.date,
          txService:           parseFloat(s.serviceRatePercent.toFixed(2)),
          gapMins:             s.gapMins,
          drivingMins:         entry.drivingMins,
          workMins:            entry.workMins,
          serviceMins:         s.serviceMins,
          amplitudeMins:       s.amplitudeMins,
          amplitudeRatePercent: s.amplitudeRatePercent,
        }
      }),
    [monthEntries, referenceRatePercent]
  )

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Titre ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Analyse</h2>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{monthLabel}</p>
        </div>

        {/* Sélecteur de mois */}
        <div className="flex items-center gap-1 bg-[#0e1628] border border-[#1a2d4a] rounded-xl px-1 py-1">
          <button
            onClick={() => setMonthKey(prevMonthKey(monthKey))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162440] transition-colors active:scale-95"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-white text-xs font-semibold px-1 tabular-nums capitalize min-w-[80px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => canGoNext && setMonthKey(nextMonthKey(monthKey))}
            disabled={!canGoNext}
            className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
              canGoNext
                ? 'text-slate-400 hover:text-white hover:bg-[#162440]'
                : 'text-slate-700 cursor-not-allowed'
            }`}
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Résumé clé ─────────────────────────────────────── */}
      <AnalysisSummary
        monthStats={monthStats}
        chartData={chartData}
        referenceRatePercent={referenceRatePercent}
      />

      {/* ── Taux de service journalier ─────────────────────── */}
      <MonthlyRateChart
        data={chartData}
        referenceRatePercent={referenceRatePercent}
      />

      {/* ── Écart journalier ──────────────────────────────── */}
      <GapEvolutionChart data={chartData} />

      {/* ── Conduite vs. travail ──────────────────────────── */}
      <DrivingWorkChart data={chartData} />

      {/* ── Amplitude ────────────────────────────────────── */}
      <AmplitudeChart data={chartData} />

      {/* ── Classement des journées ───────────────────────── */}
      <DayRankingCard chartData={chartData} />

      {/* ── Optimisation financière (fin de mois uniquement) ─ */}
      <OptimizationTrialCard
        monthStats={monthStats}
        monthKey={monthKey}
        hourlyRate={hourlyRate}
        amplitudeBonus={amplitudeBonus}
      />

    </div>
  )
}
