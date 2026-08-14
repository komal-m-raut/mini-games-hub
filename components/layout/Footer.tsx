import Link from 'next/link';

const LINKS = [
  { href: '/#games', label: 'Games' },
  { href: '/daily', label: 'Daily' },
  { href: '/profile', label: 'Profile' },
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/contact', label: 'Contact' },
];

export function Footer() {
  return (
    <footer className="club-footer">
      <div className="page-container club-footer__inner">
        <div>
          <Link href="/" className="club-wordmark club-wordmark--footer">
            <span aria-hidden="true">T</span>
            <strong>Tiny Arcadium</strong>
          </Link>
          <p>Small games. Real bragging rights.</p>
        </div>
        <nav aria-label="Footer">
          {LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <p className="club-footer__legal">© {new Date().getFullYear()} Tiny Arcadium. Play fair.</p>
      </div>
    </footer>
  );
}
