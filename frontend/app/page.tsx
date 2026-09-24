import fs from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PokemonDecor, PokemonScatter } from "@/components/shared/PokemonDecor";
import type { PokemonEmojiKey } from "@/lib/pokemon-emojis";

function cardImageExists(filename: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "cards", filename));
}

const HERO_CARDS = [
  {
    file: "charizard.jpg",
    name: "Charizard",
    setLine: "Legendary Collection • 3/110 Holo",
    priceBadge: "$214 raw",
    gradient: "from-orange-500 via-red-500 to-rose-600",
    left: 0,
    top: 40,
    rotate: -4,
    zIndex: 20,
    delay: "0s",
  },
  {
    file: "gengar.jpg",
    name: "Gengar",
    setLine: "Generations • 35/83",
    priceBadge: "$31 raw",
    gradient: "from-purple-600 via-violet-700 to-indigo-900",
    left: 175,
    top: 0,
    rotate: 2,
    zIndex: 30,
    delay: "0.8s",
  },
  {
    file: "pikachu.jpg",
    name: "Pikachu",
    setLine: "Illustrator Promo • 1998",
    priceBadge: "$375K+ raw",
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    left: 350,
    top: 32,
    rotate: 5,
    zIndex: 10,
    delay: "1.6s",
  },
] as const;

function HeroTradingCard({ card }: { card: (typeof HERO_CARDS)[number] }) {
  const hasImage = cardImageExists(card.file);

  return (
    <div
      className="absolute animate-float-rotate"
      style={{
        left: card.left,
        top: card.top,
        zIndex: card.zIndex,
        animationDelay: card.delay,
      }}
    >
      <div
        className="transition-transform duration-500 hover:scale-[1.02]"
        style={{ transform: `rotate(${card.rotate}deg)` }}
      >
        {hasImage ? (
          <div className="hero-card relative h-[340px] w-[240px] overflow-hidden rounded-2xl border border-white/50 bg-white/20 shadow-xl backdrop-blur-sm">
            <Image src={`/cards/${card.file}`} alt={card.name} fill className="object-cover" sizes="240px" priority />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-10">
              <p className="text-base font-black text-white drop-shadow-sm">{card.name}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium leading-tight text-white/85">{card.setLine}</span>
                <span className="shrink-0 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">{card.priceBadge}</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`hero-card relative flex h-[340px] w-[240px] flex-col overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br p-4 text-white backdrop-blur-md ${card.gradient}`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
            <p className="relative z-10 text-xl font-black drop-shadow-sm">{card.name}</p>
            <div className="relative z-10 flex flex-1 items-center justify-center text-5xl drop-shadow-lg">🃏</div>
            <div className="relative z-10 flex items-center justify-between rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm backdrop-blur-md">
              <span className="font-medium">{card.setLine}</span>
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-purple-700">{card.priceBadge}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TICKER_LINE =
  "Charizard Legendary Collection Holo · $213.81 ▲ 23.2%  |  Gengar Generations #35 · $30.79 ▲ 4.1%  |  Pikachu Illustrator Promo · $375K+ ▲ 12.8%  |  Charizard ex 151 SIR #199 · $400.14 ▲ 5.5%  |  Blastoise Base Set Holo · $280.00 ▲ 7.8%  |  Mew ex 151 · $45.00 ▼ 2.1%  |  Umbreon VMAX Alt Art · $320.00 ▲ 6.4%  |  Lugia V Alt Art · $210.00 ▲ 3.9%  |  ";

const FEATURE_COLORS: Record<string, string> = {
  "card-red": "#FF3B5C",
  "card-blue": "#1A73E8",
  "card-purple": "#8B5CF6",
  "card-teal": "#00C9B1",
  "card-orange": "#FF6B35",
  "card-gold": "#7C3AED",
};

const FEATURES: { emoji: string; pokemon: PokemonEmojiKey; color: string; title: string; desc: string }[] = [
  { emoji: "🔍", pokemon: "pikachuYa", color: "card-red", title: "AI Card Scanner", desc: "Upload any Pokémon card image and our AI vision model instantly identifies the card name, set, number, rarity, edition, and condition hints. No manual tagging ever." },
  { emoji: "📊", pokemon: "pokeballThrow", color: "card-blue", title: "Live Price Tracking", desc: "Real time ungraded and graded Pokémon prices from eBay sold listings and PriceCharting. See raw, PSA 8, PSA 9, and PSA 10 values updated every 6 hours." },
  { emoji: "💎", pokemon: "mew", color: "card-purple", title: "Grading ROI Calculator", desc: "Should you grade that card? Our AI calculates the exact ROI you'd get from PSA grading, factoring in grading fees and current grade premiums." },
  { emoji: "📈", pokemon: "gyarados", color: "card-teal", title: "Portfolio Analytics", desc: "Track your entire collection's value over time. See total gain/loss, top performers, biggest drops, and portfolio concentration insights." },
  { emoji: "🤖", pokemon: "gengar", color: "card-orange", title: "AI Market Insights", desc: "Get AI generated buy/hold/sell signals for each card based on price velocity, market demand, volatility patterns, and recent sales trends." },
  { emoji: "⚡", pokemon: "charizard", color: "card-gold", title: "Instant eBay Sales Data", desc: "See the last 10 actual eBay sold listings for any Pokémon card, filtered for condition and recency. Know what buyers are actually paying today." },
];

export default function HomePage() {
  const imagesFound = {
    charizard: cardImageExists("charizard.jpg"),
    gengar: cardImageExists("gengar.jpg"),
    pikachu: cardImageExists("pikachu.jpg"),
  };

  return (
    <div className="min-h-screen bg-card-bg text-card-text">
      <Navbar />

      {/* SECTION 1: HERO */}
      <section className="gradient-bg-hero relative overflow-hidden px-6 py-28 md:py-36 lg:min-h-[88vh] lg:flex lg:items-center">
        {/* Subtle background blur blobs */}
        <div className="pointer-events-none absolute -left-24 top-16 h-[28rem] w-[28rem] rounded-full bg-purple-500/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-16 top-1/4 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-8 left-1/3 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" aria-hidden />

        <PokemonScatter
          items={[
            { emoji: "pikachuVibe", className: "left-4 bottom-12", size: 72, opacity: 0.75, animate: "float", style: { animationDelay: "0.5s" } },
            { emoji: "pokeballThrow", className: "right-8 top-20", size: 48, opacity: 0.6, animate: "float-rotate", style: { animationDelay: "1.2s" } },
            { emoji: "charmander", className: "left-1/4 top-8", size: 56, opacity: 0.5, flip: true, style: { animationDelay: "2s" } },
          ]}
        />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div className="animate-slide-up max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md">
              🚀 <span className="gradient-text-accent font-semibold">Pokémon First</span>
              <span className="text-slate-300">·</span>
              RealTime Prices
            </span>

            <h1 className="mt-8 text-4xl font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-[3.25rem] lg:text-6xl">
              The{" "}
              <span className="gradient-text-accent">Smartest</span>
              <br className="hidden sm:block" />
              {" "}Way to Track Your
              <br className="hidden sm:block" />
              {" "}Pokémon Collection
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
              Upload any Pokémon TCG card. Our AI identifies it instantly and shows you real ungraded and graded market prices from eBay and PriceCharting.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/signup" className="btn-primary">
                Start Free Today →
              </Link>
              <a href="#how-it-works" className="btn-glass">
                Watch Demo
              </a>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {[
                  "bg-gradient-to-br from-purple-500 to-violet-600",
                  "bg-gradient-to-br from-blue-500 to-indigo-600",
                  "bg-gradient-to-br from-pink-500 to-rose-500",
                  "bg-gradient-to-br from-cyan-500 to-teal-500",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md ${bg}`}
                  >
                    {["MT", "SK", "DR", "JC"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Join <span className="font-semibold text-slate-700">12,000+</span> Pokémon collectors tracking{" "}
                <span className="font-semibold text-slate-700">$50M+</span> in cards
              </p>
            </div>
          </div>

          <div className="relative hidden min-h-[420px] md:flex md:items-center md:justify-center">
            <div className="hero-stack-glow pointer-events-none absolute h-80 w-96" aria-hidden />
            <div className="relative h-[380px] w-[590px] [perspective:1200px]">
              {HERO_CARDS.map((card) => (
                <HeroTradingCard key={card.name} card={card} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: STATS */}
      <section className="relative bg-white py-16">
        <PokemonDecor emoji="bulbasaur" className="right-6 bottom-4 hidden md:block" size={80} opacity={0.35} />
        <PokemonDecor emoji="pokeball" className="left-8 top-6" size={40} opacity={0.25} animate="bounce-slow" />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {[
            { n: "50,000+", l: "Cards Tracked Daily", d: "0s" },
            { n: "$2.4M+", l: "Portfolio Value Managed", d: "0.1s" },
            { n: "99.2%", l: "AI Identification Accuracy", d: "0.2s" },
            { n: "< 3 sec", l: "Average Scan Time", d: "0.3s" },
          ].map((s) => (
            <div
              key={s.l}
              className="animate-pop-in border-l-4 border-violet-500 pl-6 opacity-0"
              style={{ animationDelay: s.d, animationFillMode: "forwards" }}
            >
              <p className="gradient-text-accent text-4xl font-black md:text-5xl">{s.n}</p>
              <p className="mt-2 text-card-text-muted">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section id="how-it-works" className="relative bg-card-surface-2 px-6 py-20">
        <PokemonDecor emoji="snorlax" className="right-4 bottom-8 hidden lg:block" size={100} opacity={0.3} animate="none" />
        <h2 className="section-heading">From Card to Market Value in 3 Steps</h2>
        <p className="section-sub">No manual tagging. No guesswork. Just upload and go.</p>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            { n: 1, e: "📸", t: "Upload Your Pokémon Card", d: "Drag and drop or take a photo of any Pokémon TCG card vintage holos, modern ex cards, promos, and Japanese prints.", pokemon: "pokeballSuccess" as PokemonEmojiKey },
            { n: 2, e: "🤖", t: "AI Identifies It Instantly", d: "Our computer vision AI reads the card name, set, rarity, year, and condition hints in under 3 seconds.", pokemon: "pikachuYa" as PokemonEmojiKey },
            { n: 3, e: "📊", t: "Get Real Market Prices", d: "We pull live eBay sold listings and PriceCharting data, then calculate a weighted accurate market value.", pokemon: "growlithe" as PokemonEmojiKey },
          ].map((step, i) => (
            <div key={step.n} className="card-shadow card-hover-lift relative rounded-2xl bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:card-shadow-hover">
              <PokemonDecor emoji={step.pokemon} className="right-3 top-3" size={48} opacity={0.85} style={{ animationDelay: `${i}s` }} />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-lg font-black text-white">
                {step.n}
              </div>
              <div className="mb-4 text-4xl">{step.e}</div>
              <h3 className="mb-2 text-xl font-bold text-card-text">{step.t}</h3>
              <p className="text-card-text-muted">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: FEATURES */}
      <section id="features" className="relative bg-white px-6 py-20">
        <PokemonDecor emoji="squirtleChill" className="left-4 top-12 hidden md:block" size={90} opacity={0.25} flip />
        <h2 className="section-heading">Everything a Serious Pokémon Collector Needs</h2>
        <p className="section-sub">Built for trainers who treat their Pokémon cards as investments.</p>
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="relative rounded-2xl border border-card-border bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:card-shadow-hover"
              style={{ borderLeftWidth: "4px", borderLeftColor: FEATURE_COLORS[f.color] }}
            >
              <PokemonDecor emoji={f.pokemon} className="right-2 top-2" size={44} opacity={0.8} style={{ animationDelay: `${i * 0.3}s` }} />
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: `${FEATURE_COLORS[f.color]}33` }}
              >
                {f.emoji}
              </div>
              <h3 className="text-lg font-bold text-card-text">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-card-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6: LIVE TICKER */}
      <section className="relative flex items-center overflow-hidden bg-card-text py-4">
        <PokemonDecor emoji="pikachuDance" className="right-4 top-1/2 -translate-y-1/2 hidden sm:block" size={36} opacity={0.5} animate="none" />
        <span className="shrink-0 px-4 font-bold text-violet-400">LIVE PRICES</span>
        <div className="ticker-wrap flex-1">
          <div className="ticker-track text-sm">
            <span className="mx-4 text-white">{TICKER_LINE}</span>
            <span className="mx-4 text-white">{TICKER_LINE}</span>
          </div>
        </div>
      </section>

      {/* SECTION 7: PRICING */}
      <section id="pricing" className="relative bg-card-surface-2 px-6 py-20">
        <PokemonDecor emoji="gyarados" className="right-8 top-8" size={72} opacity={0.45} flip />
        <PokemonDecor emoji="snorlax" className="left-8 top-12 hidden md:block" size={88} opacity={0.35} style={{ animationDelay: "1.5s" }} />
        <h2 className="section-heading">Simple, Transparent Pricing</h2>
        <p className="section-sub">Start free. Upgrade when your collection grows.</p>
        <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-3">
          {/* Free */}
          <div className="card-shadow rounded-2xl border border-card-border bg-white p-8">
            <p className="font-bold text-card-teal">Collector</p>
            <p className="mt-4 text-5xl font-black text-card-text">$0<span className="text-lg font-normal text-card-text-muted">/month</span></p>
            <p className="text-sm text-card-text-muted">Forever free</p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Up to 25 cards in portfolio", "AI card scanning (10 scans/month)", "Basic price tracking", "Raw card prices only", "Manual price refresh"].map((t) => (
                <li key={t} className="text-card-text">✓ {t}</li>
              ))}
              {["Grading ROI calculator", "AI market insights", "Price history charts", "eBay sold listings feed"].map((t) => (
                <li key={t} className="text-card-text-light line-through">✗ {t}</li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary mt-8 block text-center">Get Started Free</Link>
          </div>

          {/* Pro */}
          <div className="relative scale-105 rounded-2xl border-2 border-violet-500 bg-violet-50 p-8 card-shadow">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1 text-sm font-bold text-white">⭐ Most Popular</span>
            <p className="font-bold text-violet-600">Investor</p>
            <p className="mt-4 text-5xl font-black text-card-text">$12<span className="text-lg font-normal text-card-text-muted">/month</span></p>
            <p className="text-sm text-card-text-muted">Billed monthly</p>
            <p className="text-xs text-card-teal">$9/mo billed annually</p>
            <ul className="mt-6 space-y-2 text-sm text-card-text">
              {["Unlimited cards in portfolio", "AI card scanning (unlimited)", "Real-time price tracking", "Raw + PSA 8/9/10 pricing tiers", "Auto price refresh every 6 hours", "Grading ROI calculator", "AI market insights per card", "30-day price history charts", "Last 10 eBay sold listings per card"].map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
              {["Portfolio AI advisor", "API access"].map((t) => (
                <li key={t} className="text-card-text-light line-through">✗ {t}</li>
              ))}
            </ul>
            <Link href="/signup" className="btn-primary mt-8 block text-center">Start 14-Day Free Trial</Link>
            <p className="mt-2 text-center text-xs text-card-text-muted">No credit card required</p>
          </div>

          {/* Enterprise */}
          <div className="card-shadow rounded-2xl border border-card-border border-l-4 border-l-card-purple bg-white p-8">
            <p className="font-bold text-card-purple">Dealer</p>
            <p className="mt-4 text-5xl font-black text-card-text">$39<span className="text-lg font-normal text-card-text-muted">/month</span></p>
            <p className="text-sm text-card-text-muted">Billed monthly</p>
            <p className="text-xs text-card-teal">$29/mo billed annually</p>
            <ul className="mt-6 space-y-2 text-sm text-card-text">
              {["Everything in Investor", "Portfolio AI advisor (weekly reports)", "90-day price history charts", "Price alerts (email + push)", "Bulk card import via CSV", "API access for developers", "Priority email support", "Early access to new features", "Multi-user team access (up to 5)"].map((t) => (
                <li key={t}>✓ {t}</li>
              ))}
            </ul>
            <Link href="/contact" className="mt-8 block rounded-xl border-2 border-card-purple bg-white px-8 py-3 text-center font-bold text-card-purple transition hover:bg-card-purple hover:text-white">
              Contact Sales
            </Link>
          </div>
        </div>
        <p className="mt-10 text-center text-sm text-card-text-muted">
          All plans include SSL encryption, daily backups, and 99.9% uptime SLA. Cancel anytime.
        </p>
      </section>

      {/* SECTION 9: TESTIMONIALS */}
      <section className="relative bg-white px-6 py-20">
        <PokemonDecor emoji="squirtleJam" className="left-6 bottom-6 hidden lg:block" size={70} opacity={0.3} />
        <h2 className="section-heading">Collectors Love CardIQ</h2>
        <p className="section-sub">Real results from real collectors.</p>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {[
            { q: "I found out my Charizard Base Set holo was worth 3x what I paid for it CardIQ's eBay data showed me exactly what it sold for last week. Incredible tool.", name: "Marcus T.", role: "Pokémon Collector, 12 years", init: "MT", bg: "bg-card-red", pokemon: "charizardStill" as PokemonEmojiKey },
            { q: "The grading ROI calculator alone is worth the subscription. It told me exactly which 4 cards in my collection were worth sending to PSA. Made back the annual fee in one grading submission.", name: "Sarah K.", role: "Pokémon Card Investor", init: "SK", bg: "bg-card-blue", pokemon: "mew" as PokemonEmojiKey },
            { q: "I run a Pokémon dealing business and the portfolio tracker with live eBay data is my daily tool. Saves me hours of manual price research every single week.", name: "David R.", role: "Pokémon Card Dealer", init: "DR", bg: "bg-card-purple", pokemon: "pokeballSpin" as PokemonEmojiKey },
          ].map((t, i) => (
            <div key={t.name} className="card-shadow relative rounded-2xl border border-card-border bg-white p-6 transition hover:-translate-y-1 hover:card-shadow-hover">
              <PokemonDecor emoji={t.pokemon} className="right-3 bottom-3" size={40} opacity={0.7} animate="none" style={{ animationDelay: `${i * 0.4}s` }} />
              <span className="absolute left-4 top-2 text-6xl text-violet-300 opacity-40">&ldquo;</span>
              <p className="mb-2 text-violet-500">⭐⭐⭐⭐⭐</p>
              <p className="relative z-10 text-sm text-card-text-muted">{t.q}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${t.bg}`}>{t.init}</div>
                <div>
                  <p className="font-bold text-card-text">{t.name}</p>
                  <p className="text-xs text-card-text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 10: CTA BANNER */}
      <section className="px-4 pb-8 md:px-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-blue-600 to-pink-500 py-20 text-center">
          <PokemonScatter
            items={[
              { emoji: "charizard", className: "left-[8%] top-[18%]", size: 56, opacity: 0.55, style: { animationDelay: "0s" } },
              { emoji: "pikachuDance", className: "left-[28%] top-[62%]", size: 48, opacity: 0.5, style: { animationDelay: "0.5s" } },
              { emoji: "pokeball", className: "left-[48%] top-[22%]", size: 40, opacity: 0.45, animate: "bounce-slow", style: { animationDelay: "1s" } },
              { emoji: "squirtleJam", className: "left-[68%] top-[55%]", size: 52, opacity: 0.5, flip: true, style: { animationDelay: "1.5s" } },
              { emoji: "mew", className: "left-[85%] top-[30%]", size: 44, opacity: 0.5, style: { animationDelay: "2s" } },
            ]}
          />
          <h2 className="relative z-10 text-3xl font-black text-white md:text-4xl">
            Ready to Know What Your Pokémon Cards Are Worth?
          </h2>
          <p className="relative z-10 mt-4 text-lg text-white/70">
            Join 12,000+ Pokémon collectors. Free to start. No credit card.
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="rounded-xl bg-white px-8 py-3 font-bold text-violet-700 transition hover:bg-violet-50">
              Create Free Account →
            </Link>
            <a href="#pricing" className="rounded-xl border-2 border-white px-8 py-3 font-bold text-white transition hover:bg-white/20">
              See Pricing
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      <span className="sr-only" data-card-images={JSON.stringify(imagesFound)} />
    </div>
  );
}
