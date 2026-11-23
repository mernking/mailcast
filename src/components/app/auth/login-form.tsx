"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/logo";
import { apiFetch } from "@/components/app/use-api";

export default function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      toast.success("Signed in");
      const next = params.get("next");
      const target = next && next.startsWith("/dashboard") ? next : "/dashboard";
      // Full navigation guarantees the dashboard server layout sees the new cookie.
      window.location.assign(target);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="MailCast home">
            <Logo />
          </Link>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1 text-center">
            <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-muted">
              <LockKeyhole className="size-5" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your dashboard</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />
          </div>

          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              ← Back to website
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
