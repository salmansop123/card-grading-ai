"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[70px] border-b border-card-border bg-white transition-shadow duration-300",
        scrolled ? "shadow-[0_4px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm" : "shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="gradient-text text-2xl font-black">
          🃏 CardIQ
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="nav-link text-sm">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="btn-secondary px-5 py-2 text-sm">
            Sign In
          </Link>
          <Link href="/signup" className="btn-primary px-5 py-2 text-sm">
            Get Started Free
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-card-text md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-card-border bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-medium text-card-text-muted hover:text-violet-600"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link href="/login" className="btn-secondary w-full text-center text-sm" onClick={() => setMobileOpen(false)}>
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary w-full text-center text-sm" onClick={() => setMobileOpen(false)}>
              Get Started Free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
