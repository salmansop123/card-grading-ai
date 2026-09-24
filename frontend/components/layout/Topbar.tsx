"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Topbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="text-sm text-muted-foreground">Pokémon Card Market Intelligence</div>
      <div className="flex items-center gap-4">
        <span className="text-sm">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
