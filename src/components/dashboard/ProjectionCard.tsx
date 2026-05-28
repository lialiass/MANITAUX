import { Sparkles } from 'lucide-react'
import { minutesToReadable, type ProjectionResult } from '../../lib/calculations'

interface ProjectionCardProps {
  projection: ProjectionResult | null
}

function ProjRow({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a2d4a]/60 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  )
}

export default function ProjectionCard({ projection }: ProjectionCardProps) {
  if (!projection) {
    return (
      <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={14} className="text-slate-600" />
          <p className="text-white font-semibold text-sm">Projection fin de mois</p>
        </div>
        <p className="text-slate-600 text-sm">
          Disponible dès qu'une journée est saisie ce mois-ci.
        </p>
      </div>
    )
  }

  const {
    projectedDrivingMins,
    projectedWorkMins,
    projectedServiceMins,
    projectedServiceRatePercent,
    projectedGapMins,
    daysRemaining,
    daysWorked,
  } = projection

  const gapMins    = projectedGapMins ?? 0
  const gapColor   = gapMins >= 0 ? 'text-emerald-400' : 'text-red-400'
  const gapDisplay = `${gapMins >= 0 ? '+' : ''}${minutesToReadable(gapMins)}`

  return (
    <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl overflow-hidden">
      {/* Header avec badge */}
      <div className="px-4 py-3 border-b border-[#1a2d4a] flex items-center justify-between bg-[#111e35]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          <p className="text-white font-semibold text-sm">Projection fin de mois</p>
        </div>
        <span className="bg-blue-500/15 border border-blue-500/25 text-blue-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
          {daysRemaining === 0
            ? 'Dernier jour'
            : `${daysRemaining} j ouvré${daysRemaining > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Corps */}
      <div className="px-4 py-3">
        {/* Hypothèse */}
        <p className="text-slate-600 text-xs mb-3">
          {daysRemaining === 0
            ? `Projection basée sur ${daysWorked} jour${daysWorked > 1 ? 's' : ''} saisis — dernier jour`
            : `Projection basée sur ${daysWorked} jour${daysWorked > 1 ? 's' : ''} saisis et ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} ouvré${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`
          }
        </p>

        <ProjRow label="Conduite estimée"  value={minutesToReadable(projectedDrivingMins)} />
        <ProjRow label="Travail estimé"    value={minutesToReadable(projectedWorkMins)} />
        <ProjRow label="Service estimé"    value={minutesToReadable(projectedServiceMins)} />
        <ProjRow
          label="TxService projeté"
          value={`${projectedServiceRatePercent.toFixed(2)} %`}
        />
        <ProjRow
          label="Écart projeté"
          value={gapDisplay}
          color={gapColor}
        />
      </div>
    </div>
  )
}
