import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InvestmentCase } from '../lib/supabase'

interface Props { case_: InvestmentCase; delay?: number }

const RATING_ARROW: Record<string, string> = { BUY: '▲', HOLD: '◆', SELL: '▼', WATCH: '◉' }

export default function CaseCard({ case_, delay = 0 }: Props) {
  const sector = case_.sectors
  const caseCompanies = case_.case_companies ?? []
  const primaryRating = caseCompanies[0]?.rating ?? case_.rating

  return (
    <Link
      href={`/analyse/${case_.slug}`}
      className="card animate-in"
      style={{ animationDelay: `${delay * 80}ms`, opacity: 0, textDecoration: 'none', color: 'inherit' }}
    >
      {/* Kicker */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        {caseCompanies.slice(0, 2).map(cc => cc.companies && (
          <span key={cc.id} className="badge-ticker" style={{ fontSize: '0.65rem' }}>
            {cc.companies.ticker}
          </span>
        ))}
        {caseCompanies.length > 2 && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            +{caseCompanies.length - 2}
          </span>
        )}
        {sector && (
          <span className="ft-kicker" style={{ fontSize: '0.65rem' }}>{sector.name}</span>
        )}
        {primaryRating && (
          <span className={`badge-rating ${primaryRating}`} style={{ fontSize: '0.62rem', marginLeft: 'auto' }}>
            {RATING_ARROW[primaryRating]} {primaryRating}
          </span>
        )}
      </div>

      {/* Headline */}
      <h2 className="card-title" style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.05rem',
        fontWeight: 600,
        lineHeight: 1.25,
        marginBottom: 8,
        color: 'var(--text-primary)',
        transition: 'color 0.15s',
      }}>
        {case_.title}
      </h2>

      {/* Standfirst */}
      {case_.excerpt && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          fontWeight: 300,
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          marginBottom: 12,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {case_.excerpt}
        </p>
      )}

      {/* Dateline */}
      <div className="ft-dateline" style={{ marginTop: 'auto' }}>
        {case_.published_at
          ? format(new Date(case_.published_at), 'd MMM yyyy', { locale: fr })
          : '—'}
        {case_.target_horizon && ` · ${case_.target_horizon}`}
      </div>
    </Link>
  )
}
