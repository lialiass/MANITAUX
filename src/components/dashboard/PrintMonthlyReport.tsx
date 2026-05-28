// ============================================================
// MANITAUX — Composant d'impression mensuelle
//
// Ce composant est INVISIBLE à l'écran (display:none en media screen).
// Il n'apparaît que lors de l'impression (window.print()).
//
// La technique "visibility: hidden/visible" garantit que
// seul ce bloc est rendu sur papier, quel que soit le DOM parent.
// Aucune dépendance externe — uniquement window.print().
// ============================================================

import { createPortal }      from 'react-dom'
import { format, parseISO } from 'date-fns'
import { fr }               from 'date-fns/locale'

import {
  calcDayStats,
  minutesToReadable,
  type DayEntry,
  type MonthStats,
} from '../../lib/calculations'
import { txServiceHexColor }  from '../../lib/colors'
import { useProfileStore }    from '../../store/useProfileStore'
import { useAuthStore }       from '../../store/useAuthStore'

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface PrintMonthlyReportProps {
  monthLabel:           string
  monthEntries:         DayEntry[]
  monthStats:           MonthStats
  referenceRatePercent: number
}

// ------------------------------------------------------------
// Helpers inline
// ------------------------------------------------------------

function gapColor(gapMins: number): string {
  return gapMins >= 0 ? '#15803d' : '#dc2626'
}

function gapSign(gapMins: number): string {
  return gapMins >= 0 ? '+' : ''
}

// ------------------------------------------------------------
// Composant
// ------------------------------------------------------------

export default function PrintMonthlyReport({
  monthLabel,
  monthEntries,
  monthStats,
  referenceRatePercent,
}: PrintMonthlyReportProps) {
  const { displayName } = useProfileStore()
  const { user }        = useAuthStore()

  const conductorName = displayName || user?.email || '—'
  const printDate     = format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })

  // Journées triées chronologiquement avec leurs stats calculées
  const dayRows = [...monthEntries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => ({ entry, stats: calcDayStats(entry, referenceRatePercent) }))

  const hasData = monthStats.daysCount > 0

  // Le rapport est rendu directement dans <body> via un portail.
  // En print : body > *:not(#manitaux-print-report) → display:none
  // Aucun élément caché ne prend d'espace → une seule page, zéro doublon.
  return createPortal(
    <>
      {/* ── Styles impression ─────────────────────────────────
          @media screen  → masque le composant (display:none)
          @media print   → cache TOUS les autres enfants de body,
                           affiche uniquement ce rapport en flux normal
      ─────────────────────────────────────────────────────── */}
      <style>{`
        @media screen {
          #manitaux-print-report { display: none; }
        }
        @media print {
          html, body {
            background: white !important;
            color: #111 !important;
          }
          body > *:not(#manitaux-print-report) {
            display: none !important;
          }
          #manitaux-print-report {
            display: block !important;
            background: white !important;
            color: #111 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
            font-size: 10pt !important;
            line-height: 1.4 !important;
          }
          @page {
            size: A4 portrait;
            margin: 16mm 14mm;
          }
        }
      `}</style>

      {/* ── Rapport imprimable ────────────────────────────── */}
      <div id="manitaux-print-report">

        {/* ── En-tête ──────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '2.5px solid #111',
          paddingBottom: '10px',
          marginBottom: '14px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '18pt', fontWeight: 900, letterSpacing: '0.06em' }}>
                MANITAUX
              </span>
              <span style={{ fontSize: '11pt', color: '#555', fontWeight: 400 }}>
                — Récapitulatif mensuel
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '10pt', color: '#444' }}>
              <strong style={{ textTransform: 'capitalize' }}>{monthLabel}</strong>
              &nbsp;·&nbsp; Conducteur : <strong>{conductorName}</strong>
              &nbsp;·&nbsp; Taux de référence : <strong>{referenceRatePercent} %</strong>
            </p>
          </div>
          <div style={{ fontSize: '8pt', color: '#999', textAlign: 'right', lineHeight: 1.5 }}>
            <span>Imprimé le {printDate}</span>
          </div>
        </div>

        {/* ── Résumé du mois ───────────────────────────────── */}
        <div style={{
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '18px',
          backgroundColor: '#f9fafb',
        }}>
          <p style={{
            margin: '0 0 8px',
            fontSize: '7.5pt',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#6b7280',
          }}>
            Résumé du mois
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
            {[
              {
                label: 'Jours',
                value: hasData ? String(monthStats.daysCount) : '—',
                color: '#111',
              },
              {
                label: 'TxService moy.',
                value: hasData ? `${monthStats.avgServiceRatePercent.toFixed(1)} %` : '—',
                color: hasData ? txServiceHexColor(monthStats.avgServiceRatePercent) : '#111',
              },
              {
                label: 'Écart mensuel',
                value: hasData
                  ? `${gapSign(monthStats.monthlyGapMins)}${minutesToReadable(monthStats.monthlyGapMins)}`
                  : '—',
                color: hasData ? gapColor(monthStats.monthlyGapMins) : '#111',
              },
              {
                label: 'Total service',
                value: hasData ? minutesToReadable(monthStats.totalServiceMins) : '—',
                color: '#111',
              },
              {
                label: 'Total conduite',
                value: hasData ? minutesToReadable(monthStats.totalDrivingMins) : '—',
                color: '#111',
              },
              {
                label: 'Total amplitude',
                value: hasData ? minutesToReadable(monthStats.totalAmplitudeMins) : '—',
                color: '#111',
              },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: '7pt', color: '#9ca3af', textTransform: 'uppercase' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12pt', fontWeight: 800, color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Détail journalier ────────────────────────────── */}
        <p style={{
          margin: '0 0 6px',
          fontSize: '7.5pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#6b7280',
        }}>
          Détail journalier
        </p>

        {dayRows.length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '9pt' }}>
            Aucune journée saisie pour ce mois.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                {['Date', 'Horaires', 'Service', 'Conduite', 'Amplitude', 'TxService', 'Écart'].map(h => (
                  <th key={h} style={{
                    padding: '5px 8px',
                    textAlign: h === 'Date' || h === 'Horaires' ? 'left' : 'right',
                    fontSize: '7.5pt',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#6b7280',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayRows.map(({ entry, stats }, i) => (
                <tr
                  key={entry.id ?? entry.date}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb',
                  }}
                >
                  {/* Date */}
                  <td style={{ padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {format(parseISO(entry.date), 'E dd/MM', { locale: fr })}
                  </td>
                  {/* Horaires */}
                  <td style={{ padding: '4px 8px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {entry.startTime} → {entry.endTime}
                  </td>
                  {/* Service */}
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>
                    {minutesToReadable(stats.serviceMins)}
                  </td>
                  {/* Conduite */}
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {minutesToReadable(entry.drivingMins)}
                  </td>
                  {/* Amplitude */}
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    {stats.amplitudeMins !== null ? minutesToReadable(stats.amplitudeMins) : '—'}
                  </td>
                  {/* TxService */}
                  <td style={{
                    padding: '4px 8px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: txServiceHexColor(stats.serviceRatePercent),
                  }}>
                    {stats.serviceRatePercent.toFixed(1)} %
                  </td>
                  {/* Écart */}
                  <td style={{
                    padding: '4px 8px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: gapColor(stats.gapMins),
                  }}>
                    {gapSign(stats.gapMins)}{minutesToReadable(stats.gapMins)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Ligne de totaux */}
            {hasData && (
              <tfoot>
                <tr style={{ borderTop: '2px solid #d1d5db', backgroundColor: '#f3f4f6' }}>
                  <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 700, fontSize: '8.5pt' }}>
                    TOTAL — {monthStats.daysCount} jour{monthStats.daysCount > 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                    {minutesToReadable(monthStats.totalServiceMins)}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                    {minutesToReadable(monthStats.totalDrivingMins)}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                    {minutesToReadable(monthStats.totalAmplitudeMins)}
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: txServiceHexColor(monthStats.avgServiceRatePercent),
                  }}>
                    {monthStats.avgServiceRatePercent.toFixed(1)} % moy.
                  </td>
                  <td style={{
                    padding: '5px 8px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: gapColor(monthStats.monthlyGapMins),
                  }}>
                    {gapSign(monthStats.monthlyGapMins)}{minutesToReadable(monthStats.monthlyGapMins)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* ── Pied de page ─────────────────────────────────── */}
        <div style={{
          marginTop: '20px',
          paddingTop: '8px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '7.5pt',
          color: '#9ca3af',
          textAlign: 'center',
        }}>
          MANITAUX — Suivi conducteur · Document généré automatiquement · {printDate}
        </div>

      </div>
    </>,
    document.body
  )
}
