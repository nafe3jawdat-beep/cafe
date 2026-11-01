import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  QrCode,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Brand } from "../components/brand";
import { LanguageSwitcher, useLocalization } from "../lib/localization";

const features = [
  {
    icon: QrCode,
    title: "Scan your table",
    text: "Every QR code is tied to the right table — no app, no account.",
  },
  {
    icon: UtensilsCrossed,
    title: "Order in seconds",
    text: "Browse the live menu, add notes, and send the order to the kitchen.",
  },
  {
    icon: BellRing,
    title: "Service on demand",
    text: "Call a waiter, ask for water, or request the bill in one tap.",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState("");
  const { translate: t } = useLocalization();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const number = Number(tableNumber);
    if (!Number.isInteger(number) || number < 1) return;
    navigate(`/table/${number}`);
  };

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-terracotta-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-sage-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/admin/login" className="btn-ghost btn-sm">
              <ShieldCheck className="h-4 w-4" />
              {t("Admin")}
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-12 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              {t("A calmer way to order")}
            </p>
            <h1 className="mt-4 max-w-2xl text-balance font-display text-5xl font-semibold leading-[0.98] tracking-tight text-espresso-900 sm:text-6xl lg:text-7xl">
              {t("Scan. Sip.")}
              <br />
              <span className="text-terracotta-500">{t("Relax.")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-espresso-500 sm:text-lg">
              {t("The menu is on your table. Order what you love, add a note, and let us take care of the rest.")}
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 flex max-w-md flex-col gap-2 rounded-3xl border border-espresso-900/[0.08] bg-white/70 p-2 shadow-soft backdrop-blur-sm sm:flex-row"
            >
              <label htmlFor="table-number" className="sr-only">
                {t("Table number")}
              </label>
              <input
                id="table-number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t("Enter table number")}
                className="min-h-12 flex-1 rounded-2xl bg-transparent px-4 text-sm font-medium text-espresso-900 placeholder:text-espresso-300 focus:outline-none"
                value={tableNumber}
                onChange={(event) =>
                  setTableNumber(event.target.value.replace(/\D/g, ""))
                }
              />
              <button type="submit" className="btn-primary shrink-0">
                {t("Open menu")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-3 text-xs text-espresso-300">
              {t("Usually you'll land here by scanning the QR code on your table.")}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-espresso-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
                {t("No account needed")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
                {t("Live order updates")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
                {t("Pay at your table")}
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 rotate-3 rounded-[2.5rem] border border-espresso-900/[0.06] bg-white/30" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-espresso-900/[0.08] bg-white/80 p-5 shadow-lift backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-terracotta-600">
                    Table 05
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold text-espresso-900">
                    Window seat
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-espresso-900 text-cream-50">
                  <QrCode className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {[
                  ["Flat White", "$4.75"],
                  ["Basque Cheesecake", "$6.50"],
                  ["Sparkling Water", "$3.00"],
                ].map(([name, price]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-2xl border border-espresso-900/[0.06] bg-cream-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-espresso-900">
                      {t(name)}
                    </span>
                    <span className="text-sm font-bold text-espresso-500">
                      {price}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-espresso-900 px-4 py-3.5 text-cream-50">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-300">
                  {t("Total")}
                </span>
                <span className="font-display text-xl font-semibold">$14.25</span>
              </div>

              <button
                type="button"
                onClick={() => navigate("/table/5")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-espresso-900/10 py-3 text-xs font-bold uppercase tracking-[0.12em] text-espresso-700 transition hover:bg-cream-100"
              >
                {t("Try the demo table")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-t border-espresso-900/[0.07] pt-10 sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-3xl p-5">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/80 text-terracotta-600 shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-sm font-bold text-espresso-900">
                  {t(feature.title)}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-espresso-500">
                  {t(feature.text)}
                </p>
              </div>
            );
          })}
        </section>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-espresso-900/[0.07] pt-6 text-xs text-espresso-300 sm:flex-row">
          <span>© {new Date().getFullYear()} Brillo Cafe Ordering System</span>
          <span>{t("Built for independent cafés and restaurants.")}</span>
        </footer>
      </div>
    </main>
  );
}
