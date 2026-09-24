"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { PokemonScatter } from "@/components/shared/PokemonDecor";
import { POKEMON_EMOJIS } from "@/lib/pokemon-emojis";

const BULLETS = [
  "AI Pokémon card identification from any image",
  "Real-time ungraded & graded eBay + PriceCharting data",
  "Pokémon portfolio tracking with grading ROI",
];

function getPasswordStrength(password: string): { segments: number; label: string; colors: string[] } {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const segments = checks.filter(Boolean).length;
  const colors = ["bg-card-red", "bg-card-orange", "bg-card-yellow", "bg-card-green"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { segments, label: labels[Math.max(0, segments - 1)] || "Weak", colors };
}

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
        <div key={card.name} className={`absolute ${card.top} ${card.left} ${card.rotate} z-10 h-44 w-32 animate-float`} style={{ animationDelay: card.delay }}>
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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (!email.trim() || !password) return;

    setLoading(true);
    try {
      await signUp(email, password, fullName);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen gradient-bg-app">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-50 via-blue-50 to-pink-50 p-12 lg:flex">
        <PokemonScatter
          items={[
            { emoji: "gengar", className: "right-12 top-16", size: 70, opacity: 0.45 },
            { emoji: "squirtleJam", className: "left-12 top-28", size: 60, opacity: 0.5, style: { animationDelay: "1s" } },
            { emoji: "bulbasaur", className: "bottom-8 left-20", size: 64, opacity: 0.4, style: { animationDelay: "2s" } },
          ]}
        />
        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <AuthCardFan />
          <h2 className="mt-8 text-2xl font-black text-card-text">Join thousands of Pokémon collectors using AI to track card values.</h2>
          <ul className="mt-6 space-y-3">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-card-text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card-teal/20 text-xs font-bold text-card-teal">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 card-shadow rounded-xl bg-white/80 p-5">
          <p className="text-sm italic text-card-text-muted">&ldquo;This platform paid for itself in the first week. Found 3 cards worth grading.&rdquo;</p>
          <p className="mt-2 text-sm font-semibold text-violet-600">@pokecollector_uk ⭐⭐⭐⭐⭐</p>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="gradient-text text-2xl font-black">🃏 CardIQ</Link>
          <h1 className="mt-8 text-2xl font-bold text-card-text">Create your account</h1>
          <p className="mt-2 text-card-text-muted">Start tracking your collection today</p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-card-text">Full Name</label>
              <input id="fullName" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-card-text">Email</label>
              <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-card-text">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-card-text-light" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength.segments ? strength.colors[strength.segments - 1] : "bg-card-border"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-card-text-muted">{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-card-text">Confirm Password</label>
              <input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-card-text-muted">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-violet-600" />
              <span>I agree to the <a href="#" className="text-card-teal hover:underline">Terms of Service</a> and <a href="#" className="text-card-teal hover:underline">Privacy Policy</a></span>
            </label>
            {error && <p className="text-sm text-card-red">{error}</p>}
            <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {loading ? (<><Loader2 size={18} className="animate-spin" /> Creating account...</>) : "Create Account"}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-card-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
