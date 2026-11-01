import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, useLogin } from "../../hooks/use-auth";
import { Brand } from "../../components/brand";
import { Spinner } from "../../components/ui/feedback";
import {
  LanguageSwitcher,
  useLocalization,
} from "../../lib/localization";

export function StaffLoginPage() {
  const { translate: t } = useLocalization();
  const navigate = useNavigate();
  const auth = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (auth.data?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success(t("Welcome back."));
          navigate("/admin", { replace: true });
        },
        onError: (mutationError: Error) => {
          setError(mutationError.message);
        },
      }
    );
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-espresso-900 p-10 text-cream-50 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-terracotta-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sage-500/10 blur-3xl" />
        <div className="grain pointer-events-none absolute inset-0 opacity-60" />

        <div className="flex items-center justify-between">
          <Brand inverted />
          <LanguageSwitcher />
        </div>

        <div className="relative max-w-md">
          <p className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-terracotta-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t("The floor, in sync")}
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight xl:text-6xl">
            {t("Every table.")}
            <br />
            {t("Every order.")}
            <br />
            <span className="text-terracotta-400">{t("One live view.")}</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-cream-300 xl:text-base">
            {t("Orders, service requests, and bills arrive in real time — so your team can spend less time checking screens and more time on the floor.")}
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            ["Live", "orders"],
            ["Instant", "calls"],
            ["Simple", "billing"],
          ].map(([title, subtitle]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
            >
              <p className="font-display text-lg font-semibold text-cream-50">
                {t(title)}
              </p>
              <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cream-300/70">
                {t(subtitle)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col px-5 py-6 sm:px-10 lg:justify-center lg:px-14 xl:px-20">
        <div className="flex items-center justify-between lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/" className="btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4" />
              {t("Guest")}
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 w-full max-w-md lg:mt-0">
          <div className="hidden lg:block">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-espresso-500 transition hover:text-espresso-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("Back to the guest menu")}
            </Link>
          </div>

          <div className="mt-6 lg:mt-10">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-espresso-900 text-cream-50 shadow-soft">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-espresso-900">
              {t("Admin sign in")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-espresso-500">
              {t("Access the admin dashboard. Accounts are created by the café owner.")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                {t("Email address")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-300" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-11"
                  placeholder="you@cafe.local"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                {t("Password")}
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-300" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="input px-11"
                  placeholder={t("Your password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-espresso-300 transition hover:bg-cream-100 hover:text-espresso-700"
                  aria-label={t(showPassword ? "Hide password" : "Show password")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
              >
                {t(error)}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={login.isPending}
            >
              {login.isPending ? <Spinner /> : <ShieldCheck className="h-4 w-4" />}
              {login.isPending ? t("Signing in…") : t("Sign in to admin")}
            </button>
          </form>

          {import.meta.env.DEV ? (
            <div className="mt-6 rounded-2xl border border-dashed border-espresso-900/15 bg-white/50 p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-espresso-300">
                {t("Local demo account")}
              </p>
              <div className="mt-2 space-y-1 text-xs text-espresso-500">
                <p>
                  <span className="font-semibold text-espresso-700">
                    {t("Administrator")}
                  </span>{" "}
                  · admin@cafe.local / Admin123!
                </p>
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[0.7rem] leading-relaxed text-espresso-300">
            {t("Protected by rate limiting and secure, HTTP-only session cookies.")}
          </p>
        </div>
      </section>
    </main>
  );
}
