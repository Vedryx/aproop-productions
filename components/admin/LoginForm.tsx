"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="admin-login">
      <Link className="admin-wordmark" href="/">
        APROOP<span>PRODUCTION</span>
      </Link>
      <div className="admin-login-card">
        <p className="admin-kicker">THE EDIT ROOM</p>
        <h1>Welcome back.</h1>
        <p>Sign in to manage the films and stories on your website.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(event.currentTarget);
            try {
              const result = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  password: form.get("password"),
                }),
              });
              const data = await result.json();
              if (!result.ok) throw new Error(data.error);
              router.replace("/admin");
              router.refresh();
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Unable to sign in.",
              );
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button className="admin-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>
        </form>
      </div>
      <Link className="admin-back" href="/">
        ← Back to website
      </Link>
    </main>
  );
}
