"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRefreshPrices, RefreshPricesProvider } from "@/hooks/useRefreshPrices";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PokemonDecor, PokemonScatter } from "@/components/shared/PokemonDecor";
import { Toast } from "@/components/shared/Toast";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
  { href: "/vault", label: "Collection", emoji: "📚" },
  { href: "/upload", label: "Add Card", emoji: "➕" },
  { href: "/search", label: "Search", emoji: "🔍" },
  { href: "/portfolio", label: "Portfolio", emoji: "💼" },
  { href: "/insights", label: "AI Advisor", emoji: "✨" },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/vault": "Collection",
  "/upload": "Add Card",
  "/search": "Search",
  "/portfolio": "Portfolio",
  "/insights": "AI Advisor",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/cards/")) return "Card Details";
  if (pathname.startsWith("/vault/trash")) return "Trash";
  if (pathname.startsWith("/vault")) return "Collection";
  return PAGE_TITLES[pathname] ?? "Dashboard";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card-bg">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  return (
    <RefreshPricesProvider>
      <DashboardShell user={user} onSignOut={signOut}>
        {children}
      </DashboardShell>
    </RefreshPricesProvider>
  );
}

function DashboardShell({
  children,
  user,
  onSignOut,
}: {
  children: React.ReactNode;
  user: { email?: string | null };
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshing, refresh, toast, clearToast } = useRefreshPrices();

  const handleSignOut = async () => {
    await onSignOut();
    router.replace("/login");
  };

  const initials = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="relative flex h-screen overflow-hidden bg-card-bg">
      <aside className="relative hidden h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-card-border bg-white md:flex">
        <PokemonDecor emoji="pikachuVibe" className="-right-2 bottom-24 z-0" size={56} opacity={0.38} animate="none" />
        <PokemonDecor emoji="pokeball" className="left-3 bottom-4 z-0" size={32} opacity={0.42} animate="bounce-slow" />
        <div className="flex h-16 items-center border-b border-card-border px-6">
          <Link href="/dashboard" className="gradient-text text-lg font-black">
            🃏 CardIQ
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-l-4 border-violet-600 bg-violet-50 font-semibold text-violet-700"
                    : "border-l-4 border-transparent text-card-text-muted hover:bg-violet-50 hover:text-violet-600"
                )}
              >
                <span className="text-base" aria-hidden>{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-card-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-card-text">{user.email}</p>
              <Link href="/dashboard" className="flex items-center gap-1 text-xs text-card-text-muted hover:text-violet-600">
                <Settings size={12} />
                Settings
              </Link>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-card-text-muted hover:text-card-red"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <PokemonDecor emoji="gengar" className="right-6 bottom-12 z-0 hidden xl:block" size={72} opacity={0.32} animate="float" flip />
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-card-border bg-white px-6">
          <PokemonDecor emoji="charizard" className="-left-2 top-1/2 z-0 -translate-y-1/2 hidden lg:block" size={40} opacity={0.32} animate="none" />
          <h1 className="text-lg font-bold text-card-text">{getPageTitle(pathname)}</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="btn-secondary-sm hidden disabled:opacity-60 sm:inline-flex"
            >
              {refreshing ? "Refreshing..." : "Refresh Prices"}
            </button>
            <button type="button" className="rounded-lg p-2 text-card-text-muted transition hover:text-violet-600" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="dashboard-themed relative min-h-0 flex-1 overflow-y-auto p-6">
          <PokemonScatter
            items={[
              { emoji: "bulbasaur", className: "left-4 top-40 z-0 hidden md:block", size: 56, opacity: 0.3, animate: "float" },
              { emoji: "mew", className: "left-2 bottom-20 z-0 hidden lg:block", size: 52, opacity: 0.28, animate: "float", style: { animationDelay: "1s" } },
            ]}
          />
          {children}
        </main>
      </div>
      <Toast message={toast} onClear={clearToast} />
    </div>
  );
}
