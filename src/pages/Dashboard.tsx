import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, PlusCircle, History, BarChart2, Settings, Printer, Download } from 'lucide-react'
import { parseISO } from 'date-fns'
import { isThisWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

import {
  calcDayStats,
  calcMonthStats,
  calcMonthProjection,
  minutesToReadable,
  type DayEntry,
} from '../lib/calculations'
import { useDaysStore }     from '../store/useDaysStore'
import { useRateForYear }   from '../store/useSettingsStore'
import {
  currentMonthKey,
  prevMonthKey,
  nextMonthKey,
  formatMonthKey,
  isCurrentOrFutureMonth,
} from '../lib/dateUtils'

import MainRateCard        from '../components/dashboard/MainRateCard'
import PrintMonthlyReport from '../components/dashboard/PrintMonthlyReport'
import GapCard        from '../components/dashboard/GapCard'
import TotalsCard     from '../components/dashboard/TotalsCard'
import TodayCard      from '../components/dashboard/TodayCard'
import WeekCard       from '../components/dashboard/WeekCard'
import ProjectionCard from '../components/dashboard/ProjectionCard'
import type { Page }  from '../App'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ------------------------------------------------------------
// Composant bouton d'action rapide
// ------------------------------------------------------------

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  accent?: boolean
}

function QuickAction({ icon, label, onClick, accent }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all active:scale-95 ${
        accent
          ? 'bg-blue-600/15 border-blue-500/30 text-blue-300 hover:bg-blue-600/25'
          : 'bg-[#0e1628] border-[#1a2d4a] text-slate-400 hover:text-slate-200 hover:border-[#243e6a]'
      }`}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  )
}

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface DashboardProps {
  onNavigate: (page: Page) => void
}

// ------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { days } = useDaysStore()

  // ── Sélecteur de mois ────────────────────────────────────
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const monthYear = parseInt(monthKey.slice(0, 4), 10)
  const referenceRatePercent = useRateForYear(monthYear)
  const canGoNext  = !isCurrentOrFutureMonth(monthKey)
  const monthLabel = formatMonthKey(monthKey)

  // ── Journées filtrées par mois ────────────────────────────
  const monthEntries = useMemo(
    () => days.filter(d => d.date.startsWith(monthKey)),
    [days, monthKey]
  )

  // ── Stats du mois ─────────────────────────────────────────
  const monthStats = useMemo(
    () => calcMonthStats(monthEntries, referenceRatePercent),
    [monthEntries]
  )

  // ── Journée d'aujourd'hui ─────────────────────────────────
  const today = todayISO()
  const todayEntry: DayEntry | undefined = useMemo(
    () =>
      [...days]
        .filter(d => d.date === today)
        .sort((a, b) => (b.id ?? '').localeCompare(a.id ?? ''))[0],
    [days, today]
  )
  const todayStats = useMemo(
    () => (todayEntry ? calcDayStats(todayEntry, referenceRatePercent) : null),
    [todayEntry]
  )

  // ── Semaine en cours (toujours ISO semaine courante) ──────
  const weekEntries = useMemo(
    () => days.filter(d => isThisWeek(parseISO(d.date), { locale: fr, weekStartsOn: 1 })),
    [days]
  )
  const weekStats = useMemo(
    () => calcMonthStats(weekEntries, referenceRatePercent),
    [weekEntries]
  )

  // ── Projection fin de mois ───────────────────────────────
  const projection = useMemo(
    () => calcMonthProjection(monthEntries, monthKey, referenceRatePercent),
    [monthEntries, monthKey]
  )

  // ── Impression (boîte de dialogue navigateur) ────────────
  function handlePrintMonth() {
    window.print()
  }

  // ── Téléchargement PDF direct (sans boîte impression) ────
  async function handleDownloadMonthPDF() {
    if (monthStats.daysCount === 0) return
    const reportEl = document.getElementById('manitaux-print-report')
    if (!reportEl) return

    // Chargement dynamique des librairies (ne pèse pas sur le bundle initial)
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    // Conteneur temporaire hors-écran (visible pour html2canvas, pas display:none)
    const container = document.createElement('div')
    Object.assign(container.style, {
      position:   'fixed',
      top:        '0',
      left:       '-9999px',
      width:      '794px',   // ~A4 à 96 dpi
      background: 'white',
      color:      '#111',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      fontSize:   '10pt',
      lineHeight: '1.4',
      padding:    '40px 50px',
      boxSizing:  'border-box',
    })
    container.innerHTML = reportEl.innerHTML
    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, {
        scale:           2,
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
      })

      const imgData  = canvas.toDataURL('image/png')
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW    = pdf.internal.pageSize.getWidth()   // 210 mm
      const pageH    = pdf.internal.pageSize.getHeight()  // 297 mm
      const imgH     = (canvas.height * pageW) / canvas.width  // hauteur totale en mm

      // Page 1
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH)

      // Pages supplémentaires si le rapport déborde
      let remaining = imgH - pageH
      let yOffset   = -pageH
      while (remaining > 0) {
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, yOffset, pageW, imgH)
        remaining -= pageH
        yOffset   -= pageH
      }

      // Nom du fichier — "manitaux-recap-mai-2026.pdf"
      const safeName = monthLabel
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')  // enlève les accents
        .replace(/\s+/g, '-')
        .toLowerCase()
      pdf.save(`manitaux-recap-${safeName}.pdf`)

    } finally {
      document.body.removeChild(container)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Titre + sélecteur de mois ──────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-xl font-bold">Tableau de bord</h2>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{monthLabel}</p>
        </div>

        {/* Navigation mois */}
        <div className="flex items-center gap-1 bg-[#0e1628] border border-[#1a2d4a] rounded-xl px-1 py-1">
          <button
            onClick={() => setMonthKey(prevMonthKey(monthKey))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162440] transition-colors active:scale-95"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-white text-xs font-semibold px-1 tabular-nums capitalize min-w-[80px] text-center">
            {formatMonthKey(monthKey)}
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

      {/* ── Carte principale — taux de service ─────────── */}
      <MainRateCard
        monthStats={monthStats}
        referenceRatePercent={referenceRatePercent}
        monthLabel={monthLabel}
      />

      {/* ── Écart mensuel cumulé + gap (grille 2 cols) ──── */}
      <div className="grid grid-cols-2 gap-3">
        <GapCard monthStats={monthStats} />

        {/* Mini-résumé rapide conduite/jours */}
        <div className="bg-[#0e1628] border border-[#1a2d4a] rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-slate-400 text-[11px] uppercase tracking-widest font-medium leading-tight">
            Conduite<br />du mois
          </p>
          <div>
            <p className="text-white text-3xl font-black tabular-nums leading-none">
              {monthStats.daysCount > 0
                ? minutesToReadable(monthStats.totalDrivingMins)
                : '—'}
            </p>
            {monthStats.daysCount > 0 && (
              <p className="text-slate-500 text-xs mt-1">
                {monthStats.daysCount} jour{monthStats.daysCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Aujourd'hui ────────────────────────────────── */}
      <TodayCard
        todayEntry={todayEntry}
        todayStats={todayStats}
        onAddDay={() => onNavigate('saisie')}
      />

      {/* ── Totaux du mois ─────────────────────────────── */}
      <TotalsCard monthStats={monthStats} monthLabel={monthLabel} />

      {/* ── Semaine en cours ───────────────────────────── */}
      <WeekCard weekStats={weekStats} />

      {/* ── Projection fin de mois ─────────────────────── */}
      <ProjectionCard projection={projection} />

      {/* ── Actions rapides ────────────────────────────── */}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-3 px-1">Actions rapides</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<PlusCircle size={22} />}
            label="Ajouter une journée"
            onClick={() => onNavigate('saisie')}
            accent
          />
          <QuickAction
            icon={<History size={22} />}
            label="Historique"
            onClick={() => onNavigate('historique')}
          />
          <QuickAction
            icon={<BarChart2 size={22} />}
            label="Analyse"
            onClick={() => onNavigate('analyse')}
          />
          <QuickAction
            icon={<Settings size={22} />}
            label="Paramètres"
            onClick={() => onNavigate('parametres')}
          />
        </div>

        {/* Boutons impression / téléchargement — sous les 4 actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={handlePrintMonth}
            disabled={monthStats.daysCount === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#1a2d4a] bg-[#0e1628] text-slate-400 hover:text-slate-200 hover:border-[#243e6a] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Printer size={16} />
            <span className="text-[12px] font-medium">Imprimer</span>
          </button>

          <button
            onClick={handleDownloadMonthPDF}
            disabled={monthStats.daysCount === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#1a2d4a] bg-[#0e1628] text-slate-400 hover:text-slate-200 hover:border-[#243e6a] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Download size={16} />
            <span className="text-[12px] font-medium">Télécharger</span>
          </button>
        </div>
      </div>

      {/* ── Rapport imprimable (invisible à l'écran) ────── */}
      <PrintMonthlyReport
        monthLabel={monthLabel}
        monthEntries={monthEntries}
        monthStats={monthStats}
        referenceRatePercent={referenceRatePercent}
      />

    </div>
  )
}
