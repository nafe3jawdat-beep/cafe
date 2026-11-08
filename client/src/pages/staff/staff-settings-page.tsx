import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  ExternalLink,
  LocateFixed,
  MapPin,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/format";
import { getCurrentCoordinates, LocationError } from "../../lib/geolocation";
import { useLocalization } from "../../lib/localization";
import type { CafeSettings, CafeSettingsPayload } from "../../types";
import { LocationPickerMap } from "../../components/location-picker-map";
import { EmptyState, Skeleton, Spinner } from "../../components/ui/feedback";

const TIMEZONE_SUGGESTIONS = [
  "UTC",
  "Asia/Amman",
  "Asia/Beirut",
  "Asia/Damascus",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneSuggestions =
  deviceTimezone && !TIMEZONE_SUGGESTIONS.includes(deviceTimezone)
    ? [deviceTimezone, ...TIMEZONE_SUGGESTIONS]
    : TIMEZONE_SUGGESTIONS;

interface SettingsFormState {
  latitude: string;
  longitude: string;
  radiusMeters: string;
  openingTime: string;
  closingTime: string;
  timezone: string;
  isGeoCheckEnabled: boolean;
}

function formFromSettings(settings: CafeSettings): SettingsFormState {
  return {
    latitude: settings.latitude === null ? "" : String(settings.latitude),
    longitude: settings.longitude === null ? "" : String(settings.longitude),
    radiusMeters: String(settings.radiusMeters),
    openingTime: settings.openingTime,
    closingTime: settings.closingTime,
    timezone: settings.timezone,
    isGeoCheckEnabled: settings.isGeoCheckEnabled,
  };
}

export function StaffSettingsPage() {
  const { translate: t } = useLocalization();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["staff", "settings"],
    queryFn: () => api.staffSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CafeSettingsPayload) => api.updateStaffSettings(payload),
    onSuccess: ({ settings }) => {
      queryClient.setQueryData(["staff", "settings"], { settings });
      toast.success(t("Café settings saved."), {
        description: settings.isGeoCheckEnabled
          ? t("The location gate is active for guests.")
          : t("The location gate is off. Guests can open the menu without sharing location."),
      });
    },
    onError: (error: Error) => {
      toast.error(t(error.message));
    },
  });

  if (settingsQuery.isLoading) {
    return <SettingsSkeleton />;
  }

  if (settingsQuery.isError) {
    return (
      <EmptyState
        icon={<Settings2 className="h-5 w-5" />}
        title="Couldn't load café settings"
        description={
          settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : undefined
        }
        action={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void settingsQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            {t("Try again")}
          </button>
        }
      />
    );
  }

  if (!settingsQuery.data) {
    return <SettingsSkeleton />;
  }

  const settings = settingsQuery.data.settings;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2">
        <p className="eyebrow">{t("Café settings")}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-espresso-900">
          {t("Location & hours")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-espresso-500">
          {t(
            "Choose where guests can open the menu, and when the café is accepting orders. The check runs on the server for every menu and order request."
          )}
        </p>
      </header>

      <SettingsSummary settings={settings} />

      <SettingsForm
        key={settings.updatedAt ?? "defaults"}
        settings={settings}
        saving={updateMutation.isPending}
        onSave={(payload) => updateMutation.mutate(payload)}
      />
    </div>
  );
}

function SettingsSummary({ settings }: { settings: CafeSettings }) {
  const { translate: t } = useLocalization();
  const hasLocation = settings.latitude !== null && settings.longitude !== null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        label={t("Location gate")}
        value={settings.isGeoCheckEnabled ? t("On") : t("Off")}
        tone={settings.isGeoCheckEnabled ? "sage" : "neutral"}
      />
      <SummaryCard
        icon={<Clock className="h-3.5 w-3.5" />}
        label={t("Service hours")}
        value={settings.isOpenNow ? t("Open now") : t("Closed now")}
        detail={`${settings.openingTime} – ${settings.closingTime}`}
        tone={settings.isOpenNow ? "sage" : "gold"}
      />
      <SummaryCard
        icon={<MapPin className="h-3.5 w-3.5" />}
        label={t("Café location")}
        value={
          hasLocation && settings.latitude !== null && settings.longitude !== null
            ? `${settings.latitude.toFixed(5)}, ${settings.longitude.toFixed(5)}`
            : t("Not set")
        }
        tone={hasLocation ? "neutral" : "terracotta"}
      />
      <SummaryCard
        icon={<LocateFixed className="h-3.5 w-3.5" />}
        label={t("Allowed radius")}
        value={`${settings.radiusMeters} m`}
        tone="neutral"
      />

      {settings.isGeoCheckEnabled && !hasLocation ? (
        <div className="flex items-start gap-3 rounded-2xl border border-terracotta-500/20 bg-terracotta-50 px-4 py-3 text-sm text-terracotta-700 sm:col-span-2 xl:col-span-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {t(
              "The location gate is on, but no café location is saved. Guests will be blocked until you set it."
            )}
          </p>
        </div>
      ) : null}
    </section>
  );
}

const summaryTones = {
  sage: "border-sage-500/20 bg-sage-50/90",
  gold: "border-gold-400/30 bg-gold-100/60",
  terracotta: "border-terracotta-500/20 bg-terracotta-50/90",
  neutral: "border-espresso-900/[0.07] bg-white/85",
};

function SummaryCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone: keyof typeof summaryTones;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4 shadow-soft backdrop-blur-sm",
        summaryTones[tone]
      )}
    >
      <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-espresso-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-xl font-semibold text-espresso-900">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 text-xs text-espresso-500">{detail}</p>
      ) : null}
    </div>
  );
}

function SettingsForm({
  settings,
  saving,
  onSave,
}: {
  settings: CafeSettings;
  saving: boolean;
  onSave: (payload: CafeSettingsPayload) => void;
}) {
  const { translate: t } = useLocalization();
  const [form, setForm] = useState(() => formFromSettings(settings));
  const [locating, setLocating] = useState(false);

  const initial = useMemo(() => formFromSettings(settings), [settings]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const update = <K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const latitude =
    form.latitude.trim() === "" ? null : Number(form.latitude);
  const longitude =
    form.longitude.trim() === "" ? null : Number(form.longitude);

  const validCoordinates =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const setLocation = (lat: number, lng: number) => {
    setForm((current) => ({
      ...current,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const fillFromDevice = () => {
    setLocating(true);
    getCurrentCoordinates({ force: true })
      .then((coordinates) => {
        setLocation(coordinates.lat, coordinates.lng);
        toast.success(t("Location filled from this device."));
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof LocationError && error.code === "denied"
            ? t(
                "Location permission was denied. Allow it for this site, then try again."
              )
            : t(
                "Couldn't read this device's location. Enter the coordinates manually."
              )
        );
      })
      .finally(() => setLocating(false));
  };

  const useDeviceTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) update("timezone", timezone);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const oneCoordinateMissing =
      (form.latitude.trim() === "") !== (form.longitude.trim() === "");
    if (oneCoordinateMissing) {
      toast.error(
        t("Enter both latitude and longitude, or leave both blank.")
      );
      return;
    }

    if (latitude !== null || longitude !== null) {
      if (!validCoordinates) {
        toast.error(t("Enter a valid latitude and longitude."));
        return;
      }
    }

    if (form.isGeoCheckEnabled && (latitude === null || longitude === null)) {
      toast.error(
        t("Set the café location before enabling the location check.")
      );
      return;
    }

    const radius = Number(form.radiusMeters);
    if (
      !Number.isInteger(radius) ||
      radius < 10 ||
      radius > 10_000
    ) {
      toast.error(t("Choose a radius between 10 and 10,000 metres."));
      return;
    }

    if (!form.openingTime || !form.closingTime) {
      toast.error(t("Set both opening and closing times."));
      return;
    }

    const timezone = form.timezone.trim();
    if (!timezone) {
      toast.error(t("Choose a timezone."));
      return;
    }

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      toast.error(t("Use a valid timezone, such as Asia/Amman."));
      return;
    }

    onSave({
      latitude,
      longitude,
      radiusMeters: radius,
      openingTime: form.openingTime.slice(0, 5),
      closingTime: form.closingTime.slice(0, 5),
      timezone,
      isGeoCheckEnabled: form.isGeoCheckEnabled,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cream-100 text-espresso-500">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-espresso-900">
                {t("Location gate")}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-espresso-500">
                {t(
                  "When this is on, guests must be inside the café and within your opening hours to view the menu or place an order."
                )}
              </p>
            </div>
          </div>

          <label className="flex shrink-0 cursor-pointer items-center gap-3 self-start">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={form.isGeoCheckEnabled}
              onChange={(event) =>
                update("isGeoCheckEnabled", event.target.checked)
              }
            />
            <span
              className={cn(
                "relative h-7 w-12 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-terracotta-400 peer-focus-visible:ring-offset-2",
                form.isGeoCheckEnabled ? "bg-sage-500" : "bg-espresso-900/15"
              )}
            >
              <span
                className={cn(
                  "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                  form.isGeoCheckEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </span>
            <span className="text-sm font-semibold text-espresso-900">
              {form.isGeoCheckEnabled ? t("On") : t("Off")}
            </span>
          </label>
        </div>

        {form.isGeoCheckEnabled && !validCoordinates ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-gold-400/30 bg-gold-100/50 px-3.5 py-2.5 text-xs leading-relaxed text-espresso-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
            {t(
              "Add the café's coordinates below before saving. Guests cannot be verified without them."
            )}
          </div>
        ) : null}
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          icon={<MapPin className="h-5 w-5" />}
          title={t("Café location")}
          description={t(
            "Place the pin where guests sit. The allowed radius is measured from this point."
          )}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label={t("Latitude")}
            hint={t("Between -90 and 90. Example: 31.953900")}
          >
            <input
              className="input"
              inputMode="decimal"
              value={form.latitude}
              onChange={(event) => update("latitude", event.target.value)}
              placeholder="31.953900"
            />
          </Field>
          <Field
            label={t("Longitude")}
            hint={t("Between -180 and 180. Example: 35.910600")}
          >
            <input
              className="input"
              inputMode="decimal"
              value={form.longitude}
              onChange={(event) => update("longitude", event.target.value)}
              placeholder="35.910600"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={fillFromDevice}
            disabled={locating}
          >
            {locating ? (
              <Spinner />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            {t("Use my current location")}
          </button>

          {validCoordinates ? (
            <a
              href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost btn-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("Open map")}
            </a>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <LocationPickerMap
            latitude={validCoordinates ? latitude : null}
            longitude={validCoordinates ? longitude : null}
            onChange={setLocation}
            className="overflow-hidden rounded-2xl border border-espresso-900/10"
          />
          <p className="text-xs leading-relaxed text-espresso-400">
            {t(
              "Click the map to place the pin, or drag the pin to adjust the café location."
            )}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field
            label={t("Allowed radius")}
            hint={t(
              "Guests outside this distance are blocked. 50–150 m works well for most cafés."
            )}
          >
            <div className="flex items-center gap-2">
              <input
                className="input"
                type="number"
                min={10}
                max={10_000}
                step={10}
                value={form.radiusMeters}
                onChange={(event) =>
                  update("radiusMeters", event.target.value)
                }
              />
              <span className="text-sm text-espresso-500">m</span>
            </div>
          </Field>

          <div className="flex flex-wrap gap-2">
            {[50, 100, 200].map((radius) => (
              <button
                key={radius}
                type="button"
                className={cn(
                  "btn-secondary btn-sm",
                  Number(form.radiusMeters) === radius &&
                    "border-espresso-900/30 bg-cream-100"
                )}
                onClick={() => update("radiusMeters", String(radius))}
              >
                {radius} m
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeading
          icon={<Clock className="h-5 w-5" />}
          title={t("Opening hours")}
          description={t(
            "The menu and ordering are only available during this window. Times use the café's timezone."
          )}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t("Opens at")}>
            <input
              className="input"
              type="time"
              value={form.openingTime}
              onChange={(event) => update("openingTime", event.target.value)}
              required
            />
          </Field>
          <Field label={t("Closes at")}>
            <input
              className="input"
              type="time"
              value={form.closingTime}
              onChange={(event) => update("closingTime", event.target.value)}
              required
            />
          </Field>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-espresso-400">
          {t(
            "Set both times to the same value for 24-hour service. A closing time earlier than opening time covers overnight hours."
          )}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field
            label={t("Timezone")}
            hint={t("Use an IANA timezone, for example Asia/Amman.")}
          >
            <input
              className="input"
              list="cafe-timezones"
              value={form.timezone}
              onChange={(event) => update("timezone", event.target.value)}
              placeholder="Asia/Amman"
            />
            <datalist id="cafe-timezones">
              {timezoneSuggestions.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </Field>

          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={useDeviceTimezone}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {t("Use this device's timezone")}
          </button>
        </div>
      </section>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-espresso-500">
          {dirty ? (
            <>
              <TriangleAlert className="h-4 w-4 text-gold-500" />
              {t("Unsaved changes")}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-sage-500" />
              {t("All changes saved")}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={!dirty || saving}
            onClick={() => setForm(initial)}
          >
            {t("Reset")}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!dirty || saving}
          >
            {saving ? <Spinner /> : <Save className="h-4 w-4" />}
            {saving ? t("Saving…") : t("Save changes")}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cream-100 text-espresso-500">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold text-espresso-900">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-espresso-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs leading-relaxed text-espresso-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-3xl" />
    </div>
  );
}
