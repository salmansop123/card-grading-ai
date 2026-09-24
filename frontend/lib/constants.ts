export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const CARD_TYPES = ["pokemon"] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/vault", label: "Collection", icon: "LayoutDashboard" },
  { href: "/upload", label: "Add Card", icon: "Upload" },
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/portfolio", label: "Portfolio", icon: "PieChart" },
  { href: "/insights", label: "AI Advisor", icon: "Sparkles" },
] as const;
