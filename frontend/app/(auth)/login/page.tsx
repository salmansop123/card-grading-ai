"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { PokemonScatter } from "@/components/shared/PokemonDecor";
import { POKEMON_EMOJIS } from "@/lib/pokemon-emojis";
import { AuthNavbar } from "@/components/layout/AuthNavbar";

const BULLETS = [
  "AI Pokémon card identification from any image",
  "Real-time ungraded & graded eBay + PriceCharting data",
  "Pokémon portfolio tracking with grading ROI",
];

const inputClass = "input-brand";

function AuthCardFan() {
  const cards = [
    { name: "Charizard", image: POKEMON_EMOJIS.charizardStill.src, gradient: "from-orange-400 to-red-600", rotate: "-rotate-[6deg]", top: "top-12", left: "left-4", delay: "0s" },
    { name: "Pikachu", image: POKEMON_EMOJIS.pikachuDance.src, gradient: "from-blue-500 to-purple-600", rotate: "rotate-0", top: "top-20", left: "left-24", delay: "1s" },
    { name: "Mew", image: POKEMON_EMOJIS.mew.src, gradient: "from-purple-600 to-indigo-800", rotate: "rotate-[6deg]", top: "top-28", left: "left-44", delay: "2s" },
  ];

  return (
    <div className="relative mx-auto h-64 w-72">
      {cards.map((card) => (
        <div
          key={card.name}
          className={`absolute ${card.top} ${card.left} ${card.rotate} z-10 h-44 w-32 animate-float`}
          style={{ animationDelay: card.delay }}
        >
          <div className="card-shadow flex h-full flex-col overflow-hidden rounded-xl border-4 border-violet-400 bg-gradient-to-br p-3 text-white">
            <div className={`flex flex-1 flex-col bg-gradient-to-br ${card.gradient} rounded-lg p-2`}>
              <p className="text-xs font-black">{card.name}</p>
              <div className="flex flex-1 items-center justify-center p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} alt="" className="max-h-full max-w-full object-contain drop-shadow-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gradient-bg-app">
      <AuthNavbar />
      <div className="flex flex-1">
        <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-blue-50 to-pink-50 p-12 lg:flex">
        <PokemonScatter
          items={[
            { emoji: "pikachuYa", className: "right-12 top-16", size: 64, opacity: 0.55 },
            { emoji: "pokeballThrow", className: "left-16 top-32", size: 48, opacity: 0.5, style: { animationDelay: "1s" } },
            { emoji: "charmander", className: "bottom-24 right-24", size: 56, opacity: 0.5, style: { animationDelay: "2s" } },
          ]}
        />
        <div className="relative z-10">
          <AuthCardFan />
          <h2 className="mt-8 text-2xl font-black text-card-text">Your collection. Your market edge.</h2>
          <ul className="mt-6 space-y-3">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-card-text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-teal/20 text-xs font-bold text-card-teal">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        </div>

        <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-bold text-card-text">Welcome back</h1>
          <p className="mt-2 text-card-text-muted">Sign in to your collection dashboard</p>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-card-text">Email</label>
              <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-card-text">Password</label>
                <a href="#" className="text-sm text-card-teal hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-card-text-light hover:text-card-text" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-card-red">{error}</p>}
            <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {loading ? (<><Loader2 size={18} className="animate-spin" /> Signing in...</>) : "Sign In"}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-card-border" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-card-text-muted">or continue with</span></div>
          </div>

          <button type="button" className="flex w-full items-center justify-center gap-3 rounded-xl border border-card-border py-3 font-medium text-card-text transition hover:bg-card-surface-2">
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-card-text-muted">
            New to CardIQ?{" "}
            <Link href="/signup" className="font-semibold text-violet-600 hover:underline">Sign up free →</Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
