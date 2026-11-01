import { Link } from "react-router-dom";
import { ArrowLeft, Coffee } from "lucide-react";
import { Brand } from "../components/brand";
import {
  LanguageSwitcher,
  useLocalization,
} from "../lib/localization";

export function NotFoundPage() {
  const { translate: t } = useLocalization();

  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="card w-full max-w-md p-8 text-center">
        <Brand className="justify-center" />
        <div className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-cream-200 text-espresso-500">
          <Coffee className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-espresso-900">
          {t("Table not found")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-espresso-500">
          {t("This page may have moved, or the QR code is no longer active. Ask a staff member for help.")}
        </p>
        <Link to="/" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          {t("Back to start")}
        </Link>
      </div>
    </main>
  );
}
