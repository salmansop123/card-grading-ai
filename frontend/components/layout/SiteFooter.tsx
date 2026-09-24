import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-card-text pt-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-12 md:grid-cols-4">
        <div>
          <p className="gradient-text text-2xl font-black">🃏 CardIQ</p>
          <p className="mt-3 text-sm text-gray-400">
            AI powered market intelligence for Pokémon TCG collectors.
          </p>
          <div className="mt-4 flex gap-3 text-xl">
            <span aria-hidden>🐦</span>
            <span aria-hidden>📘</span>
            <span aria-hidden>📸</span>
          </div>
        </div>
        <div>
          <h4 className="mb-4 font-bold text-violet-400">Product</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/dashboard" className="hover:text-violet-300">Dashboard</Link></li>
            <li><Link href="/upload" className="hover:text-violet-300">Upload Card</Link></li>
            <li><Link href="/search" className="hover:text-violet-300">Search Cards</Link></li>
            <li><Link href="/portfolio" className="hover:text-violet-300">Portfolio</Link></li>
            <li><Link href="/insights" className="hover:text-violet-300">AI Insights</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-bold text-violet-400">Company</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-violet-300">About Us</a></li>
            <li><a href="#" className="hover:text-violet-300">Blog</a></li>
            <li><a href="#" className="hover:text-violet-300">Careers</a></li>
            <li><a href="#" className="hover:text-violet-300">Press Kit</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-bold text-violet-400">Support</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-violet-300">Help Center</a></li>
            <li><Link href="/contact" className="hover:text-violet-300">Contact Us</Link></li>
            <li><a href="#" className="hover:text-violet-300">API Docs</a></li>
            <li><a href="#" className="hover:text-violet-300">Status Page</a></li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-700 px-6 py-6 text-sm text-gray-500 sm:flex-row">
        <p>© 2025 CardIQ. All rights reserved.</p>
        <p>Privacy Policy · Terms of Service · Cookie Policy</p>
      </div>
    </footer>
  );
}
