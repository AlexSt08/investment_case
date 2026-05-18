import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InvestmentCase } from '../lib/supabase'

interface Props {
  case_: InvestmentCase
  delay?: number
}

const RATING_DOTS: Record<string, string> = {
  BUY: '▲',
  HOLD: '◆',
  SELL: '▼',
  WATCH: '◉',
}

export default function CaseCard({ case_, delay = 0 }: Props) {
  const company = case_.companies
  const sector = case_.sectors || case_.companies?.sectors
  const delayClass = delay ? `animate-in-delay-${Math.min(delay, 3)}` : 'animate-in'

  return (
    <Link href={`/analyse/${case_.slug}`} className={`card ${delayClass}`} style={{ animationDelay: `${delay * 100}ms` }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {company && (
            <span className="badge-ticker">{company.ticker}</span>
          )}
          {sector && (
            <span style={{
              fontSize: '0.7rem',
              color: sector.color || 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
            }}>
              {sector.name}
            </span>
          )}
        </div>
        {case_.rating && (
          <span className={`badge-rating ${case_.rating}`}>
            {RATING_DOTS[case_.rating]} {case_.rating}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.15rem',
        fontWeight: 600,
        lineHeight: 1.3,
        marginBottom: 10,
        color: 'var(--text-primary)',
      }}>
        {case_.title}
      </h2>

      {/* Excerpt */}
      {case_.excerpt && (
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 20,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {case_.excerpt}
        </p>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {case_.published_at
            ? format(new Date(case_.published_at), 'd MMM yyyy', { locale: fr })
            : '—'}
        </span>
        {case_.target_horizon && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Horizon : {case_.target_horizon}
          </span>
        )}
      </div>
    </Link>
  )
}
