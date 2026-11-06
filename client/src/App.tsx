import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/error-boundary";
import { CafeLoader } from "./components/cafe-loader";
import {
  LocalizationProvider,
  useLocalization,
} from "./lib/localization";

const LandingPage = lazy(() =>
  import("./pages/landing-page").then((module) => ({
    default: module.LandingPage,
  }))
);
const MenuPage = lazy(() =>
  import("./pages/menu-page").then((module) => ({ default: module.MenuPage }))
);
const StatusPage = lazy(() =>
  import("./pages/status-page").then((module) => ({
    default: module.StatusPage,
  }))
);
const NotFoundPage = lazy(() =>
  import("./pages/not-found-page").then((module) => ({
    default: module.NotFoundPage,
  }))
);
const StaffLoginPage = lazy(() =>
  import("./pages/staff/staff-login-page").then((module) => ({
    default: module.StaffLoginPage,
  }))
);
const StaffLayout = lazy(() =>
  import("./pages/staff/staff-layout").then((module) => ({
    default: module.StaffLayout,
  }))
);
const StaffDashboardPage = lazy(() =>
  import("./pages/staff/staff-dashboard-page").then((module) => ({
    default: module.StaffDashboardPage,
  }))
);
const StaffCallsPage = lazy(() =>
  import("./pages/staff/staff-calls-page").then((module) => ({
    default: module.StaffCallsPage,
  }))
);
const StaffBillsPage = lazy(() =>
  import("./pages/staff/staff-bills-page").then((module) => ({
    default: module.StaffBillsPage,
  }))
);
const StaffFinancePage = lazy(() =>
  import("./pages/staff/staff-finance-page").then((module) => ({
    default: module.StaffFinancePage,
  }))
);
const StaffMenuPage = lazy(() =>
  import("./pages/staff/staff-menu-page").then((module) => ({
    default: module.StaffMenuPage,
  }))
);
const StaffTablesPage = lazy(() =>
  import("./pages/staff/staff-tables-page").then((module) => ({
    default: module.StaffTablesPage,
  }))
);

function PageLoader() {
  const { translate: t } = useLocalization();

  return (
    <div className="grid min-h-screen place-items-center bg-stone-50">
      <div className="flex flex-col items-center gap-3 text-stone-500">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
        <span className="text-sm font-medium">{t("Loading…")}</span>
      </div>
    </div>
  );
}

/**
 * While a route chunk downloads, show the branded brew animation for table
 * menus so a QR scan never falls back to a generic spinner.
 */
function RouteFallback() {
  const { pathname } = useLocation();
  const tableMenu = pathname.match(/^\/table\/(\d+)\/?$/);

  if (tableMenu) {
    return <CafeLoader tableNumber={Number(tableMenu[1])} />;
  }

  return <PageLoader />;
}

export function App() {
  return (
    <LocalizationProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/table/:tableNumber" element={<MenuPage />} />
            <Route path="/table/:tableNumber/status" element={<StatusPage />} />
            <Route path="/admin/login" element={<StaffLoginPage />} />
            <Route path="/admin" element={<StaffLayout />}>
              <Route index element={<StaffDashboardPage />} />
              <Route path="calls" element={<StaffCallsPage />} />
              <Route path="bills" element={<StaffBillsPage />} />
              <Route path="finance" element={<StaffFinancePage />} />
              <Route path="menu" element={<StaffMenuPage />} />
              <Route path="tables" element={<StaffTablesPage />} />
            </Route>
            {/* Keep old bookmarks working. */}
            <Route
              path="/staff/login"
              element={<Navigate to="/admin/login" replace />}
            />
            <Route
              path="/staff/*"
              element={<Navigate to="/admin" replace />}
            />
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                borderRadius: "1rem",
                fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif",
              },
            }}
          />
        </BrowserRouter>
      </ErrorBoundary>
    </LocalizationProvider>
  );
}
