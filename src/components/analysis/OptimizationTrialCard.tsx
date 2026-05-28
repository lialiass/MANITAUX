import { TrendingUp, TrendingDown, Minus, Euro, Clock } from 'lucide-react'
import type { MonthStats } from '../../lib/calculations'
import {
  getHourlyMultiplier,
  calcRemainingBusinessDays,
  calcFinancialPotential,
  calcOptimizationStatus,
  minutesToReadable,
  type OptimizationStatus,
} from '../../lib/calculations'
import { currentMonthKey } from '../../lib/dateUtils'

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface OptimizationTrialCardProps {
  monthStats:  MonthStats
  monthKey:    string
  hourlyRate:  number
  amplitudeBonus: number
}

// ------------------------------------------------------------
// Helpers visuels
// ------------------------------------------------------------

const STATUS_CONFIG: Record<OptimizationStatus, {
  icon:       React.ReactNode
  label:      string
  sub:        string
  textClass:  string
  borderClass: string
  bgClass:    string
}> = {
  green: {
    icon:        <TrendingUp size={14} />,
    label:       'Prime atteignable',
    sub:         'Le solde couvre la prime d\'amplitude',
    textClass:   'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    bgClass:     'bg-emerald-500/8',
  },
  orange: {
    icon:        <Minus size={14} />,
    label:       'Récupération partielle',
    sub:         'Solde insuffisant pour couvrir la prime',
    textClass:   'text-amber-400',
    borderClass: 'border-amber-500/30',
    bgClass:     'bg-amber-500/8',
  },
  red: {
    icon:        <TrendingDown size={14} />,
    label:       'Aucune marge disponible',
    sub:         'Taux de service au-dessus de la référence',
    textClass:   'text-red-400',
    borderClass: 'border-red-500/30',
    bgClass:     'bg-red-500/8',
  },
}

// Palier lisible
function tierLabel(multiplier: number): string {
  if (multiplier >= 1.50) return 'Palier 3 — ×1.50'
  if (multiplier >= 1.25) return 'Palier 2 — ×1.25'
  return 'Palier 1 — ×1.00'
}

// Formatage monétaire
function eur(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------

export default function OptimizationTrialCard({
  monthStats,
  monthKey,
  hourlyRate,
  amplitudeBonus,
}: OptimizationTrialCardProps) {

  // ── Conditions d'affichage ────────────────────────────────
  const isCurrentMonth = monthKey === currentMonthKey()
  const today          = new Date()
  // Semaine ≥ 3 du mois (jour ≥ 15)
  const weekInMonth    = Math.ceil(today.getDate() / 7)
  const remainingDays  = calcRemainingBusinessDays(monthKey)

  const shouldShow =
    isCurrentMonth &&
    weekInMonth >= 3 &&
    remainingDays < 7 &&
    monthStats.daysCount > 0

  if (!shouldShow) return null

  // ── Calculs ───────────────────────────────────────────────
  const serviceHours = monthStats.totalServiceMins / 60
  const multiplier   = getHourlyMultiplier(serviceHours)
  const potential    = calcFinancialPotential(monthStats.monthlyGapMins, hourlyRate, multiplier)
  const status       = calcOptimizationStatus(monthStats.monthlyGapMins, amplitudeBonus, hourlyRate, multiplier)
  const cfg          = STATUS_CONFIG[status]

  const effectiveRate = hourlyRate * multiplier
  const gapPositive   = monthStats.monthlyGapMins > 0

  // ── Rendu ────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border p-4 space-y-4 ${cfg.borderClass} ${cfg.bgClass}`}>

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">Simulation d'optimisation</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-400 border border-slate-600/40 tracking-wide">
              Bêta
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Fin de mois · {remainingDays} jour{remainingDays > 1 ? 's' : ''} ouvré{remainingDays > 1 ? 's' : ''} restant{remainingDays > 1 ? 's' : ''}
          </p>
        </div>

        {/* Badge statut */}
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.textClass} ${cfg.borderClass} ${cfg.bgClass}`}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* Grille de métriques */}
      <div className="grid grid-cols-2 gap-3">

        {/* Solde disponible */}
        <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={11} className="text-slate-500" />
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Solde mois</p>
          </div>
          <p className={`text-lg font-black tabular-nums leading-tight ${gapPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {gapPositive ? '+' : ''}{minutesToReadable(monthStats.monthlyGapMins)}
          </p>
          <p className="text-slate-600 text-[10px] mt-0.5">
            {gapPositive ? 'minutes disponibles' : 'minutes de retard'}
          </p>
        </div>

        {/* Potentiel financier */}
        <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro size={11} className="text-slate-500" />
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Potentiel</p>
          </div>
          <p className={`text-lg font-black tabular-nums leading-tight ${cfg.textClass}`}>
            {gapPositive ? eur(potential) : '—'}
          </p>
          <p className="text-slate-600 text-[10px] mt-0.5">
            {gapPositive ? `à ${effectiveRate.toFixed(2)} €/h` : 'aucune marge'}
          </p>
        </div>
      </div>

      {/* Barre de progression : potentiel vs prime */}
      {gapPositive && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-slate-500 text-[10px]">
              Vs prime d'amplitude ({eur(amplitudeBonus)})
            </p>
            <p className={`text-[10px] font-bold tabular-nums ${cfg.textClass}`}>
              {Math.min(100, Math.round((potential / amplitudeBonus) * 100))} %
            </p>
          </div>
          <div className="h-1.5 bg-[#1a2d4a] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                status === 'green' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (potential / amplitudeBonus) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Palier + note */}
      <div className="space-y-1.5 pt-1 border-t border-[#1a2d4a]">
        <div className="flex items-center justify-between">
          <p className="text-slate-600 text-[10px]">{tierLabel(multiplier)}</p>
          <p className="text-slate-600 text-[10px]">
            {(serviceHours).toFixed(1)} h de service ce mois
          </p>
        </div>
        <p className="text-slate-600 text-[10px] italic">
          Estimation indicative basée sur vos données saisies.
        </p>
      </div>
    </div>
  )
}
