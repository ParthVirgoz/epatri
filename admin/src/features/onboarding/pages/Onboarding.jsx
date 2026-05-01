import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { checkOnboardingSlugAvailabilityApi, setupOnboardingApi } from "../../menu/pages/menu.api";
import { useAuthStore } from "../../auth/auth.store";
import LocationPlaceSearch from "../components/LocationPlaceSearch";

const MIN_SLUG_LENGTH = 5;
const BRAND_SLUG_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

function normalizeSlug(input) {
  return String(input || "").trim().toLowerCase();
}

function hasValidCoords(v) {
  return (
    v?.latitude != null &&
    v?.longitude != null &&
    Number.isFinite(Number(v.latitude)) &&
    Number.isFinite(Number(v.longitude))
  );
}

function hasRequiredLocation(v) {
  return hasValidCoords(v) && String(v?.address_text || "").trim().length > 0;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(user?.business_name || user?.shop_name || "");
  const [businessSlug, setBusinessSlug] = useState(
    () => (user?.business_slug ? String(user.business_slug).toLowerCase() : "")
  );
  const [singleArea, setSingleArea] = useState("");
  const [singleGeo, setSingleGeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const finishSubmitLockRef = useRef(false);
  const [slugCheck, setSlugCheck] = useState({
    status: "idle",
    checkedSlug: "",
    message: "",
  });

  const slugPreview = useMemo(() => normalizeSlug(businessSlug), [businessSlug]);

  const slugFormatValid = useMemo(
    () => Boolean(slugPreview && BRAND_SLUG_RE.test(slugPreview)),
    [slugPreview],
  );

  const slugCharsRemaining = useMemo(() => {
    if (!slugPreview || !slugFormatValid) return null;
    const n = MIN_SLUG_LENGTH - slugPreview.length;
    return n > 0 ? n : 0;
  }, [slugPreview, slugFormatValid]);

  const isBrandStepReady = useMemo(() => {
    if (!businessName.trim()) return false;
    if (!slugPreview) return false;
    if (!BRAND_SLUG_RE.test(slugPreview)) return false;
    if (slugPreview.length < MIN_SLUG_LENGTH) return false;
    if (slugCheck.checkedSlug !== slugPreview) return false;
    return slugCheck.status === "available" || slugCheck.status === "error";
  }, [businessName, slugPreview, slugCheck.checkedSlug, slugCheck.status]);

  const isLocationStepReady = useMemo(() => {
    if (!businessName.trim()) return false;
    if (!slugPreview || !BRAND_SLUG_RE.test(slugPreview) || slugPreview.length < MIN_SLUG_LENGTH) return false;
    if (slugCheck.checkedSlug !== slugPreview) return false;
    if (slugCheck.status !== "available" && slugCheck.status !== "error") return false;

    return hasRequiredLocation(singleGeo);
  }, [
    businessName,
    slugPreview,
    slugCheck.checkedSlug,
    slugCheck.status,
    singleGeo,
  ]);

  const slugInputShellClass = useMemo(() => {
    const base =
      "flex min-h-[46px] w-full items-stretch overflow-hidden rounded-xl border bg-[#fafafa] transition-colors";
    if (!slugPreview) return `${base} border-[var(--app-border)]`;
    if (!BRAND_SLUG_RE.test(slugPreview)) return `${base} border-red-300 bg-red-50/40`;
    if (slugPreview.length < MIN_SLUG_LENGTH) return `${base} border-amber-300/90 bg-amber-50/40`;
    switch (slugCheck.status) {
      case "checking":
        return `${base} border-slate-300 bg-white`;
      case "available":
        return `${base} border-emerald-400/90 bg-emerald-50/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]`;
      case "taken":
      case "invalid":
        return `${base} border-red-300 bg-red-50/40`;
      case "error":
        return `${base} border-amber-300 bg-amber-50/30`;
      default:
        return `${base} border-[var(--app-border)]`;
    }
  }, [slugPreview, slugCheck.status]);

  const SlugStatusIcon = () => {
    if (!slugPreview) {
      return <span className="h-4 w-4" aria-hidden />;
    }
    if (!BRAND_SLUG_RE.test(slugPreview)) {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold leading-none text-white shadow-sm" title="Invalid characters" aria-label="Invalid characters">
          ×
        </span>
      );
    }
    if (slugPreview.length < MIN_SLUG_LENGTH) {
      const more = MIN_SLUG_LENGTH - slugPreview.length;
      const label = more === 1 ? "Need 1 more character" : `Need ${more} more characters`;
      return (
        <span
          className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1.5 text-[10px] font-semibold leading-none text-amber-900"
          title={label}
          aria-label={label}
        >
          {more}
        </span>
      );
    }
    if (slugCheck.status === "checking") {
      return (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700"
          aria-label="Checking availability"
        />
      );
    }
    if (slugCheck.status === "available") {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold leading-none text-white shadow-sm" title="Available" aria-label="Available">
          ✓
        </span>
      );
    }
    if (slugCheck.status === "taken" || slugCheck.status === "invalid") {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold leading-none text-white shadow-sm" title="Not available" aria-label="Not available">
          ×
        </span>
      );
    }
    if (slugCheck.status === "error") {
      return (
        <span className="text-[10px] font-semibold text-amber-800" title={slugCheck.message}>
          !
        </span>
      );
    }
    return <span className="h-4 w-4" aria-hidden />;
  };

  const checkSlug = async (slugValue) => {
    const normalized = normalizeSlug(slugValue);
    if (!normalized) {
      setSlugCheck({
        status: "idle",
        checkedSlug: "",
        message: "",
      });
      return null;
    }
    if (!BRAND_SLUG_RE.test(normalized)) {
      setSlugCheck({
        status: "invalid",
        checkedSlug: normalized,
        message: "Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.",
      });
      return false;
    }
    if (!normalized || normalized.length < MIN_SLUG_LENGTH) {
      setSlugCheck({
        status: "invalid",
        checkedSlug: normalized,
        message: `Use at least ${MIN_SLUG_LENGTH} letters or numbers.`,
      });
      return false;
    }

    setSlugCheck((prev) =>
      prev.checkedSlug === normalized && prev.status === "available"
        ? prev
        : { status: "checking", checkedSlug: normalized, message: "Checking availability..." }
    );

    const [data, err] = await checkOnboardingSlugAvailabilityApi(normalized);
    if (err) {
      setSlugCheck({
        status: "error",
        checkedSlug: normalized,
        message: "Could not check right now. You can still continue and we will verify on submit.",
      });
      return null;
    }

    const isAvailable = Boolean(data?.available);
    setSlugCheck({
      status: isAvailable ? "available" : "taken",
      checkedSlug: String(data?.slug || normalized),
      message: String(data?.message || (isAvailable ? "Available" : "This username is already taken.")),
    });
    return isAvailable;
  };

  useEffect(() => {
    const normalized = slugPreview;
    if (!normalized) {
      setSlugCheck({ status: "idle", checkedSlug: "", message: "" });
      return;
    }

    if (!BRAND_SLUG_RE.test(normalized)) {
      setSlugCheck({
        status: "invalid",
        checkedSlug: normalized,
        message: "Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.",
      });
      return;
    }

    if (normalized.length < MIN_SLUG_LENGTH) {
      setSlugCheck({
        status: "invalid",
        checkedSlug: normalized,
        message: `Use at least ${MIN_SLUG_LENGTH} letters or numbers.`,
      });
      return;
    }

    const t = setTimeout(() => {
      checkSlug(normalized);
    }, 450);

    return () => clearTimeout(t);
  }, [slugPreview]);

  const goNext = async () => {
    if (step === 0) {
      if (!slugPreview) {
        toast.error("Enter a username for your public link.");
        return;
      }
      if (!BRAND_SLUG_RE.test(slugPreview)) {
        toast.error(
          "Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.",
        );
        return;
      }
      if (slugPreview.length < MIN_SLUG_LENGTH) {
        const more = MIN_SLUG_LENGTH - slugPreview.length;
        toast.error(
          more === 1 ? "Add 1 more character to your username." : `Add ${more} more characters to your username.`,
        );
        return;
      }
      if (slugCheck.status === "checking") {
        toast.error("Checking username availability. Please wait a moment.");
        return;
      }
      let available = slugCheck.checkedSlug === slugPreview ? slugCheck.status === "available" : null;
      if (available == null) {
        available = await checkSlug(slugPreview);
      }
      if (available === false) {
        toast.error("This username is already taken. Please choose another.");
        return;
      }
      if (!businessName.trim()) {
        toast.error("Business name is required");
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!isLocationStepReady) {
        toast.error("Add complete location details before continuing.");
        return;
      }
      await handleSubmit();
    }
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (finishSubmitLockRef.current) return;
    finishSubmitLockRef.current = true;
    setLoading(true);
    const slug = slugPreview;
    try {
      if (!businessName.trim()) {
        toast.error("Business name is required.");
        return;
      }
      if (!slug) {
        toast.error("Enter a username for your public link.");
        return;
      }
      if (!BRAND_SLUG_RE.test(slug)) {
        toast.error(
          "Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.",
        );
        return;
      }
      if (slug.length < MIN_SLUG_LENGTH) {
        const more = MIN_SLUG_LENGTH - slug.length;
        toast.error(
          more === 1 ? "Add 1 more character to your username." : `Add ${more} more characters to your username.`,
        );
        return;
      }
      const available = await checkSlug(slug);
      if (available === false) {
        toast.error("This username is already taken. Please choose another.");
        return;
      }

      if (!hasRequiredLocation(singleGeo)) {
        toast.error("Location is required: add landmark/address, latitude, and longitude.");
        return;
      }
      const additional_locations = [];
      const primaryName = businessName.trim();
      const primaryArea = singleArea.trim() || null;
      const primaryGeoPayload = singleGeo;

      const [, err] = await setupOnboardingApi({
        business_name: businessName.trim(),
        business_slug: slug,
        is_multi_outlet: false,
        primary_location_name: primaryName,
        primary_location_area: primaryArea,
        primary_location_latitude: primaryGeoPayload?.latitude ?? null,
        primary_location_longitude: primaryGeoPayload?.longitude ?? null,
        primary_location_address_text: primaryGeoPayload?.address_text ?? null,
        additional_locations,
      });
      if (err) {
        toast.error(err);
        return;
      }
      await refreshUser();
      toast.success("You are all set");
      navigate("/app/menu", { replace: true });
    } finally {
      finishSubmitLockRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
      <div>
        <h2 className="text-lg font-semibold text-[#262626]">Set up your business</h2>
        <p className="mt-1 text-sm text-[#737373]">A few short steps to set your brand and location.</p>
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/95 p-3 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)]">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 0, title: "Brand", subtitle: "Slug + identity" },
            { key: 1, title: "Location", subtitle: "Where you serve" },
          ].map((item) => {
            const active = step === item.key;
            const done = step > item.key;
            return (
              <div
                key={item.key}
                className={`rounded-xl border px-3 py-2.5 transition ${active
                    ? "border-(--brand-e)/35 bg-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    : done
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-[#e7e7e7] bg-[#fafafa]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${active
                        ? "bg-(--brand-e) text-white"
                        : done
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-[#6b7280] border border-[#d7d7d7]"
                      }`}
                  >
                    {done ? "✓" : item.key + 1}
                  </span>
                  <p className={`text-sm font-semibold ${active ? "text-[#14532d]" : "text-[#374151]"}`}>{item.title}</p>
                </div>
                <p className={`mt-1 text-[11px] ${active ? "text-[#3f6212]" : "text-[#8b8b8b]"}`}>{item.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {step === 0 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void goNext();
          }}
          className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business username / slug</p>
            <div className={slugInputShellClass}>
              <input
                value={businessSlug}
                onChange={(e) => setBusinessSlug(e.target.value.toLowerCase())}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm font-mono text-[#111827] outline-none placeholder:text-[#9ca3af]"
                placeholder="your-brand"
                autoComplete="off"
                aria-invalid={
                  Boolean(slugPreview && !BRAND_SLUG_RE.test(slugPreview)) ||
                  slugCheck.status === "taken" ||
                  slugCheck.status === "invalid"
                }
                aria-describedby="slug-field-hint"
              />
              <div className="flex shrink-0 items-center gap-2 border-l border-[#e5e7eb] bg-white/60 px-2.5 py-1.5">
                <SlugStatusIcon />
              </div>
            </div>
            <p id="slug-field-hint" className="mt-1.5 text-xs text-[#8e8e8e]">
              {slugCheck.status === "error" ? (
                <span className="text-amber-800">{slugCheck.message}</span>
              ) : slugPreview && !BRAND_SLUG_RE.test(slugPreview) ? (
                <span className="text-red-600">
                  Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.
                </span>
              ) : slugCharsRemaining ? (
                <span className="text-amber-800">
                  Add {slugCharsRemaining} more character{slugCharsRemaining === 1 ? "" : "s"} to continue.
                </span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business name</p>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[#fafafa] px-3 py-2 text-sm"
              placeholder="Shown on your public menu"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!isBrandStepReady}
              className="flex-1 rounded-lg bg-(--brand-e) py-2.5 text-sm font-semibold text-white hover:bg-(--brand-e-dark) disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </form>
      ) : null}

      {step === 1 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void goNext();
          }}
          className="space-y-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Location details</p>
          <p className="text-sm text-[#737373]">Location is required: landmark/address + latitude + longitude.</p>
          <input
            value={singleArea}
            onChange={(e) => setSingleArea(e.target.value)}
            className="w-full rounded-lg border border-[var(--app-border)] bg-[#fafafa] px-3 py-2 text-sm"
            placeholder="e.g. Vesu, Kamrej, City centre"
          />
          <LocationPlaceSearch
            inputId="onb-single-place"
            value={singleGeo}
            onChange={setSingleGeo}
            brandName={businessName}
            outletName={singleArea}
          />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[#262626] hover:bg-[#fafafa]"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!isLocationStepReady}
              className="flex-1 rounded-lg bg-(--brand-e) py-2.5 text-sm font-semibold text-white hover:bg-(--brand-e-dark) disabled:opacity-40"
            >
              {loading ? "Creating…" : "Finish and open admin"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
