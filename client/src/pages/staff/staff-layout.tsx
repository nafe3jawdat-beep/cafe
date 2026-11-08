import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  QrCode,
  ReceiptText,
  Settings2,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { api } from "../../lib/api";
import { cn, initials } from "../../lib/format";
import { useAuth, useLogout } from "../../hooks/use-auth";
import { useStaffRealtime } from "../../hooks/use-staff-realtime";
import { Brand } from "../../components/brand";
import { Spinner } from "../../components/ui/feedback";
import {
  LanguageSwitcher,
  useLocalization,
} from "../../lib/localization";

const navItems = [
  { to: "/admin", label: "Live orders", icon: LayoutDashboard, end: true },
  { to: "/admin/calls", label: "Service calls", icon: BellRing },
  { to: "/admin/bills", label: "Bills", icon: ReceiptText },
  { to: "/admin/finance", label: "Finance", icon: ChartNoAxesCombined },
  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/admin/tables", label: "Tables & QR", icon: QrCode },
  { to: "/admin/settings", label: "Settings", icon: Settings2 },
];

export function StaffLayout() {
  const { translate: t } = useLocalization();
  const auth = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { connected } = useStaffRealtime();

  const statsQuery = useQuery({
    queryKey: ["staff", "stats"],
    queryFn: () => api.staffStats(),
    enabled: auth.data?.role === "ADMIN",
    refetchInterval: 30_000,
  });

  if (auth.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-sm text-espresso-500">
          <Spinner className="h-6 w-6 text-espresso-500" />
          Opening the floor…
        </div>
      </div>
    );
  }

  if (auth.isError || auth.data?.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  const user = auth.data;
  const stats = statsQuery.data;
  const badges: Record<string, number | undefined> = {
    "/admin": stats?.activeOrders,
    "/admin/calls": stats?.openCalls,
    "/admin/bills": stats?.openBills,
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/admin/login", { replace: true }),
    });
  };

  return (
    <div className="min-h-screen bg-cream-100/60">
      <aside className="staff-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-espresso-900 text-cream-50 lg:flex">
        <div className="grain pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col p-5">
          <div className="flex items-center justify-between px-2 pt-1">
            <Brand inverted />
            <LanguageSwitcher />
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-sage-400" : "bg-gold-400"
              )}
            />
            <span className="text-xs font-semibold text-cream-200">
              {connected ? t("Live connection") : t("Reconnecting…")}
            </span>
            {connected ? (
              <Wifi className="ml-auto h-3.5 w-3.5 text-sage-400" />
            ) : (
              <WifiOff className="ml-auto h-3.5 w-3.5 text-gold-400" />
            )}
          </div>

          <nav className="mt-6 space-y-1" aria-label={t("Admin navigation")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const badge = badges[item.to];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "bg-cream-50 text-espresso-900 shadow-soft"
                        : "text-cream-300 hover:bg-white/[0.06] hover:text-cream-50"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{t(item.label)}</span>
                      {badge ? (
                        <span
                          className={cn(
                            "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.6rem] font-bold",
                            isActive
                              ? "bg-terracotta-500 text-white"
                              : "bg-terracotta-500/90 text-white"
                          )}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terracotta-500 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream-50">
                    {user.name}
                  </p>
                  <p className="truncate text-[0.65rem] font-medium text-cream-300/70">
                    {t("Administrator")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-semibold text-cream-300 transition hover:bg-white/[0.06] hover:text-cream-50 disabled:opacity-50"
              >
                {logout.isPending ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                {t("Sign out")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="staff-content lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-espresso-900/[0.06] bg-cream-100/85 px-4 backdrop-blur-xl lg:hidden">
          <Brand compact />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-espresso-900/10 bg-white/70 px-2.5 py-1.5 text-[0.65rem] font-semibold",
                connected ? "text-sage-600" : "text-gold-500"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-sage-500" : "bg-gold-400"
                )}
              />
              {connected ? t("Live") : t("Offline")}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="grid h-9 w-9 place-items-center rounded-full border border-espresso-900/10 bg-white/70 text-espresso-500"
              aria-label={t("Sign out")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-espresso-900/[0.08] bg-cream-50/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
        aria-label={t("Admin navigation")}
      >
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badge = badges[item.to];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.6rem] font-semibold transition",
                    isActive
                      ? "text-espresso-900"
                      : "text-espresso-300 hover:text-espresso-500"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "grid h-8 w-10 place-items-center rounded-xl transition",
                        isActive ? "bg-espresso-900 text-cream-50" : ""
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-center leading-tight">
                      {t(item.label).split(" ")[0]}
                    </span>
                    {badge ? (
                      <span className="absolute right-0.5 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-terracotta-500 px-0.5 text-[0.55rem] font-bold text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
