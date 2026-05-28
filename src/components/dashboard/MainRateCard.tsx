import type { MonthStats } from '../../lib/calculations'
import { txServiceOptimalHexColor, txServiceOptimalTextColor } from '../../lib/colors'

// ------------------------------------------------------------
// Jauge circulaire (anneau SVG)
// Tourne de -90° pour démarrer en haut.
// ------------------------------------------------------------

interface RingGaugeProps {
  value: number       // valeur actuelle (ex: 18.7)
  max: number         // valeur max de la jauge (ex: 30)
  color: string       // couleur HEX du remplissage
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}

function RingGauge({ value, max, color, size = 148, strokeWidth = 11, children }: RingGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r  = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const pct       = Math.min(Math.max(value / max, 0), 1)
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Piste de fond */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1a2d4a"
          strokeWidth={strokeWidth}
        />
        {/* Arc de progression */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      {/* Contenu centré */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {children}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Sous-composant : une ligne de stat sous la jauge
// ------------------------------------------------------------

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-slate-500 text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-white text-sm font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-slate-600 text-[10px]">{sub}</p>}
    </div>
  )
}

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface MainRateCardProps {
  monthStats: MonthStats
  referenceRatePercent: number
  monthLabel: string
}

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------

export default function MainRateCard({ monthStats, referenceRatePercent, monthLabel }: MainRateCardProps) {
  const currentRate = monthStats.avgServiceRatePercent
  const hasData     = monthStats.daysCount > 0

  // Couleur dynamique basée sur les seuils "sweet spot" (18–20 % optimal)
  const gaugeColor    = !hasData ? '#1e3560' : txServiceOptimalHexColor(currentRate)
  const rateTextColor = !hasData ? 'text-slate-600' : txServiceOptimalTextColor(currentRate)

  // Écart en points
  const diffPts = hasData ? currentRate - referenceRatePercent : null
  const diffDisplay = diffPts !== null
    ? `${diffPts > 0 ? '+' : ''}${diffPts.toFixed(1)} pt${Math.abs(diffPts) >= 2 ? 's' : ''}`
    : '—'

  // Statut textuel aligné sur les seuils sweet-spot + logique d'optimisation
  const statusLabel = !hasData                ? 'Aucune donnée'
    : currentRate < 14   ? 'Optimisation inutile'
    : currentRate < 18   ? 'Optimisation envisageable'
    : currentRate <= 20  ? 'Objectif atteint'
    : currentRate < 24   ? 'Optimisation envisageable'
    : currentRate <= 26  ? 'Optimisation inutile'
    :                      'Seuil dépassé'

  // Max jauge = 1.5 × référence
  const gaugeMax = referenceRatePercent * 1.5

  return (
    <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-3xl p-5 overflow-hidden relative">
      {/* Halo de fond coloré */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 40%, ${gaugeColor}, transparent 70%)` }}
      />

      {/* Label mois + statut */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">Taux de service</p>
          <p className="text-slate-600 text-[11px] capitalize mt-0.5">{monthLabel}</p>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            color: gaugeColor,
            backgroundColor: `${gaugeColor}18`,
            border: `1px solid ${gaugeColor}35`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Jauge + Logo CFTC */}
      <div className="flex items-center justify-center gap-6 mb-5 relative z-10">

        <RingGauge
          value={hasData ? currentRate : 0}
          max={gaugeMax}
          color={gaugeColor}
        >
          {/* Valeur centrale */}
          <p className={`text-3xl font-black tabular-nums leading-none ${rateTextColor}`}>
            {hasData ? `${currentRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mt-0.5">TxService</p>
        </RingGauge>

        {/* Logo CFTC — à droite de la jauge */}
        <div className="shrink-0 flex items-center justify-center">
          <img
            src="/cftc-logo.png"
            alt="Logo CFTC Fédération Transports Logistiques"
            className="w-[90px] sm:w-[120px] object-contain"
          />
        </div>

      </div>

      {/* Ligne de stats sous la jauge */}
      <div className="flex items-center justify-around border-t border-[#1a2d4a] pt-4 relative z-10">
        <StatPill
          label="Référence"
          value={`${referenceRatePercent.toFixed(1)} %`}
        />

        <div className="w-px h-8 bg-[#1a2d4a]" />

        <StatPill
          label="Écart"
          value={diffDisplay}
          sub={diffPts !== null && diffPts > 0 ? 'au-dessus' : diffPts !== null && diffPts < 0 ? 'en dessous' : undefined}
        />

        <div className="w-px h-8 bg-[#1a2d4a]" />

        <StatPill
          label="Jours"
          value={hasData ? String(monthStats.daysCount) : '—'}
          sub={hasData ? 'saisis' : undefined}
        />
      </div>
    </div>
  )
}
