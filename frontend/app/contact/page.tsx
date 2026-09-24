"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PokemonScatter } from "@/components/shared/PokemonDecor";

const FAQS = [
  {
    q: "Is CardIQ really free to start?",
    a: "Yes the Collector plan is free forever with up to 25 cards and 10 AI scans per month. No credit card required.",
  },
  {
    q: "What card types do you support?",
    a: "CardIQ is built for Pokémon TCG only in this MVP including English and Japanese sets, promos, holos, illustration rares, and vintage Wizards of the Coast prints.",
  },
  {
    q: "How accurate is the AI card scanner?",
    a: "Our AI is trained for Pokémon TCG identification and achieves 99.2% accuracy on clear, well-lit card photos. For best results, photograph the card on a plain background with the full card visible.",
  },
];

const inputClass = "input-brand";

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Question");
  const [message, setMessage] = useState("");
  const [plans, setPlans] = useState({ free: false, investor: false, dealer: false });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSend = () => {
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    setTimeout(() => setStatus("success"), 1500);
  };

  const togglePlan = (key: keyof typeof plans) => {
    setPlans((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="relative min-h-screen gradient-bg-app">
      <PokemonScatter
        items={[
          { emoji: "pikachuVibe", className: "right-8 top-32", size: 72, opacity: 0.2 },
          { emoji: "pokeballSpin", className: "bottom-32 left-8", size: 56, opacity: 0.18, style: { animationDelay: "2s" } },
          { emoji: "gyarados", className: "right-1/4 top-1/2", size: 80, opacity: 0.12, flip: true, animate: "bounce-slow" },
        ]}
      />

      <Navbar />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <h1 className="gradient-text text-4xl font-black">Get in Touch 👋</h1>
          <p className="mt-4 text-lg text-card-text-muted">
            Have a question about your collection, our pricing, or want to partner with us? We&apos;d love to hear from you.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: "📧", title: "Email Us", line1: "support@cardiq.app", line2: "We reply within 24 hours on business days." },
              { icon: "💬", title: "Live Chat", line1: "Available Mon–Fri, 9am–6pm EST", line2: "Click the chat icon in the bottom right." },
              { icon: "🐦", title: "Twitter / X", line1: "@CardIQApp", line2: "Tweet us or DM we're pretty active." },
            ].map((c) => (
              <div key={c.title} className="card-shadow rounded-xl border-l-4 border-violet-500 bg-white p-5">
                <p className="font-bold text-card-text">{c.icon} {c.title}</p>
                <p className="mt-1 text-violet-600">{c.line1}</p>
                <p className="text-sm text-card-text-muted">{c.line2}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold text-card-text">Quick Answers</h2>
            {FAQS.map((faq, i) => (
              <div key={faq.q} className="border-b border-card-border py-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left font-semibold text-card-text"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <span className="text-violet-600">{openFaq === i ? "−" : "+"}</span>
                </button>
                <div className={`faq-answer text-sm text-card-text-muted ${openFaq === i ? "open" : ""}`}>
                  <p className="pt-2">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-shadow rounded-2xl border border-card-border bg-white p-8">
          {status === "success" ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="mb-4 text-card-green" size={48} />
              <p className="text-lg font-bold text-card-text">Message sent! We&apos;ll reply within 24 hours.</p>
            </div>
          ) : (
            <>
              <h2 className="mb-6 text-xl font-bold text-card-text">Send us a message</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-card-text">Full Name</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-card-text">Email Address</label>
                  <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-card-text">Subject</label>
                  <select className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option>General Question</option>
                    <option>Billing & Subscriptions</option>
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Partnership Inquiry</option>
                    <option>Press & Media</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-card-text">Message</label>
                  <textarea className={inputClass} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-card-text">I&apos;m interested in:</p>
                  <div className="space-y-2 text-sm text-card-text-muted">
                    {([
                      ["free", "Free Plan"],
                      ["investor", "Investor Plan"],
                      ["dealer", "Dealer/Enterprise Plan"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={plans[key]} onChange={() => togglePlan(key)} className="accent-violet-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                {status === "error" && (
                  <p className="text-sm text-card-red">
                    Something went wrong. Please email us directly at support@cardiq.app
                  </p>
                )}
                <button type="button" className="btn-primary w-full" onClick={handleSend} disabled={status === "loading"}>
                  {status === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={18} /> Sending...
                    </span>
                  ) : (
                    "Send Message →"
                  )}
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-card-text-muted">
                🔒 Your information is never shared or sold.
              </p>
            </>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
