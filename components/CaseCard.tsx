import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InvestmentCase } from '../lib/supabase'

interface Props {
  case_: InvestmentCase
  delay?: number
}

const RATING_ARROW: Record<string, string> = {
  BUY: '▲', HOLD: '◆', SELL: '▼', WATCH: '◉',
}

export default function CaseCard({ case_, delay = 0 }: Props) {
  const sector = case_.sectors
  const caseCompanies = case_.case_companies ?? []

  // Derive a primary rating: first company's rating, or global rating
  const primaryRating = caseCompanies[0]?.rating ?? case_.rating

  return (
    <Link
      href={`/analyse/${case_.slug}`}
      className="card animate-in"
      style={{ animationDelay: `${delay * 80}ms`, opacity: 0 }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 }}>

        {/* Tickers */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {caseCompanies.slice(0, 3).map(cc => cc.companies && (
            <span key={cc.id} className="badge-ticker" style={{ fontSize: '0.7rem' }}>
              {cc.companies.ticker}
            </span>
          ))}
          {caseCompanies.length > 3 && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              +{caseCompanies.length - 3}
            </span>
          )}
          {sector && (
            <span style={{ fontSize: '0.68rem', color: sector.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
              {sector.name}
            </span>
          )}
        </div>

        {/* Primary rating */}
        {primaryRating && (
          <span className={`badge-rating ${primaryRating}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
            {RATING_ARROW[primaryRating]} {primaryRating}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
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
          fontSize: '0.84rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 18,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {case_.excerpt}
        </p>
      )}

      {/* Multi-company ratings strip (if >1 company) */}
      {caseCompanies.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {caseCompanies.map(cc => cc.companies && cc.rating && (
            <span key={cc.id} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {cc.companies.ticker}
              <span className={`badge-rating ${cc.rating}`} style={{ fontSize: '0.6rem', marginLeft: 4, padding: '2px 6px' }}>
                {cc.rating}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {case_.published_at
            ? format(new Date(case_.published_at), 'd MMM yyyy', { locale: fr })
            : '—'}
        </span>
        {case_.target_horizon && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {case_.target_horizon}
          </span>
        )}
      </div>
    </Link>
  )
}
