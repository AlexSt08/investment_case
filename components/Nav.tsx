import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/secteurs', label: 'Secteurs' },
  { href: '/tickers', label: 'Tickers' },
  { href: '/analyses', label: 'Analyses' },
]

export default function Nav() {
  const router = useRouter()
  return (
    <nav>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          α<span>Alex</span>
        </Link>
        <ul className="nav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={
                  router.pathname === href ||
                  (router.pathname.startsWith(href + '/') && href !== '/')
                    ? 'active' : ''
                }
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
