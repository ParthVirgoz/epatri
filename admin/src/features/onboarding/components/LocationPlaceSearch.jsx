import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

function toFiniteNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasCoords(v) {
  return Number.isFinite(Number(v?.latitude)) && Number.isFinite(Number(v?.longitude));
}

function buildMapsUrl(v) {
  if (!v) return null;
  if (hasCoords(v)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${Number(v.latitude)},${Number(v.longitude)}`
    )}`;
  }
  const txt = String(v.address_text || "").trim();
  if (!txt) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(txt)}`;
}

function suggestedLabel(brandName, outletName) {
  const b = String(brandName || "").trim();
  const o = String(outletName || "").trim();
  if (b && o) return `${b} - ${o}`;
  if (b) return b;
  if (o) return o;
  return "Brand name - outlet name";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Browser-friendly reverse geocode (no key). Falls back to caller-supplied placeholder on failure. */
function areaNameFromReverseGeocodePayload(data) {
  if (!data || typeof data !== "object") return "";
  const locality = String(data.locality || "").trim();
  const city = String(data.city || "").trim();
  const state = String(data.principalSubdivision || "").trim();
  const line =
    locality && city && locality !== city ? `${locality}, ${city}` : locality || city || "";
  if (line && state) return `${line}, ${state}`;
  if (line) return line;
  if (state) return state;
  const country = String(data.countryName || "").trim();
  if (country) return country;
  return "";
}

async function fetchAreaNameFromCoordinates(lat, lng) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
    lat
  )}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return areaNameFromReverseGeocodePayload(data);
}

function MapClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapInvalidateWhenVisible() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * Required location input: landmark/address + latitude + longitude.
 * @param {{ latitude?: number | null, longitude?: number | null, address_text?: string | null } | null} value
 * @param {(next: { latitude?: number | null, longitude?: number | null, address_text?: string | null } | null) => void} onChange
 */
export default function LocationPlaceSearch({
  value,
  onChange,
  inputId = "place-search",
  brandName = "",
  outletName = "",
}) {
  const [manualAddress, setManualAddress] = useState(String(value?.address_text || ""));
  const [manualLat, setManualLat] = useState(value?.latitude != null ? String(value.latitude) : "");
  const [manualLng, setManualLng] = useState(value?.longitude != null ? String(value.longitude) : "");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);

  const mapUrl = useMemo(() => buildMapsUrl(value), [value]);
  const defaultAddressPlaceholder = useMemo(
    () => suggestedLabel(brandName, outletName),
    [brandName, outletName]
  );
  const hasSavedCoords = hasCoords(value);
  const prevDerivedLabelRef = useRef(defaultAddressPlaceholder);
  const lastAutoAddressRef = useRef(defaultAddressPlaceholder);
  const autoManagedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setManualAddress(String(value?.address_text || ""));
    setManualLat(value?.latitude != null ? String(value.latitude) : "");
    setManualLng(value?.longitude != null ? String(value.longitude) : "");
  }, [value?.address_text, value?.latitude, value?.longitude]);

  useEffect(() => {
    const prevDerived = String(prevDerivedLabelRef.current || "").trim();
    const nextDerived = String(defaultAddressPlaceholder || "").trim();
    const currentSaved = String(value?.address_text || "").trim();
    const lastAuto = String(lastAutoAddressRef.current || "").trim();

    if (!autoManagedRef.current) {
      // If parent value still matches auto-generated text, keep it in auto mode.
      const manualNow = String(manualAddress || "").trim();
      const manualLooksCustom =
        manualNow.length > 0 && manualNow !== prevDerived && manualNow !== lastAuto;
      if (!manualLooksCustom && currentSaved && (currentSaved === prevDerived || currentSaved === lastAuto)) {
        autoManagedRef.current = true;
      }
      prevDerivedLabelRef.current = nextDerived;
      return;
    }

    if (nextDerived && String(manualAddress || "").trim() !== nextDerived) {
      setManualAddress(nextDerived);
    }

    if (value && nextDerived && currentSaved !== nextDerived) {
      onChange({
        ...value,
        address_text: nextDerived,
      });
    }
    lastAutoAddressRef.current = nextDerived;
    prevDerivedLabelRef.current = nextDerived;
  }, [defaultAddressPlaceholder, value?.address_text, manualAddress]);

  useEffect(() => {
    if (!hasSavedCoords) return;
    const lat = Number(value.latitude);
    const lng = Number(value.longitude);
    setMapCenter([clamp(lat, -90, 90), clamp(lng, -180, 180)]);
  }, [hasSavedCoords, value?.latitude, value?.longitude]);

  /** Commit typed landmark + coordinates to parent when all fields are valid (replaces a separate Save button). */
  useEffect(() => {
    setGeoError("");
    const address = String(manualAddress || "").trim();
    const lat = toFiniteNumber(manualLat);
    const lng = toFiniteNumber(manualLng);
    if (!address || lat == null || lng == null) {
      return () => {};
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      const warn = window.setTimeout(() => {
        setGeoError("Latitude must be between -90 and 90, longitude between -180 and 180.");
      }, 400);
      return () => window.clearTimeout(warn);
    }
    if (
      value &&
      hasCoords(value) &&
      Number(value.latitude) === lat &&
      Number(value.longitude) === lng &&
      String(value.address_text || "").trim() === address
    ) {
      return () => {};
    }
    const id = window.setTimeout(() => {
      setGeoError("");
      onChangeRef.current({
        latitude: lat,
        longitude: lng,
        address_text: address,
      });
      autoManagedRef.current = false;
      setMapCenter([lat, lng]);
    }, 450);
    return () => window.clearTimeout(id);
  }, [manualAddress, manualLat, manualLng, value?.address_text, value?.latitude, value?.longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Location permission is not available in this browser.");
      return;
    }
    setGeoError("");
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          const typed = String(manualAddress || "").trim();
          try {
            if (typed) {
              onChange({
                latitude: lat,
                longitude: lng,
                address_text: typed,
              });
              autoManagedRef.current = false;
              setManualLat(String(lat));
              setManualLng(String(lng));
              setMapCenter([lat, lng]);
              return;
            }

            if (!String(defaultAddressPlaceholder || "").trim()) {
              setGeoError("Enter a landmark/address (or outlet details) before using current location.");
              return;
            }

            let addressText = defaultAddressPlaceholder;
            try {
              const inferred = await fetchAreaNameFromCoordinates(lat, lng);
              if (String(inferred || "").trim()) addressText = String(inferred).trim();
            } catch {
              /* keep defaultAddressPlaceholder */
            }

            onChange({
              latitude: lat,
              longitude: lng,
              address_text: addressText,
            });
            autoManagedRef.current = true;
            lastAutoAddressRef.current = addressText;
            setManualAddress(addressText);
            setManualLat(String(lat));
            setManualLng(String(lng));
            setMapCenter([lat, lng]);
          } finally {
            setGeoBusy(false);
          }
        })();
      },
      () => {
        setGeoBusy(false);
        setGeoError("Could not access your location. Allow permission or enter manually.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const clear = () => {
    onChange(null);
    setManualAddress("");
    setManualLat("");
    setManualLng("");
    setGeoError("");
    setMapOpen(false);
    autoManagedRef.current = false;
  };

  const setFromMap = (lat, lng) => {
    const safeLat = Number(clamp(lat, -90, 90).toFixed(7));
    const safeLng = Number(clamp(lng, -180, 180).toFixed(7));
    const address = String(manualAddress || "").trim() || defaultAddressPlaceholder;
    onChange({
      latitude: safeLat,
      longitude: safeLng,
      address_text: address,
    });
    if (!String(manualAddress || "").trim()) {
      autoManagedRef.current = true;
      lastAutoAddressRef.current = defaultAddressPlaceholder;
      setManualAddress(defaultAddressPlaceholder);
    } else {
      autoManagedRef.current = false;
      lastAutoAddressRef.current = address;
    }
    setManualLat(String(safeLat));
    setManualLng(String(safeLng));
    setMapCenter([safeLat, safeLng]);
  };

  return (
    <div className="relative space-y-2">
      <div className="rounded-lg border border-[#ececec] bg-[#fcfcfc] p-2.5">
        <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-[#737373]">
          Location (required)
        </label>
        <p className="mb-2 text-[11px] leading-snug text-[#8e8e8e]">
          All three are required: landmark/address, latitude, and longitude. Use current location or the map to set
          coordinates; when all fields are valid they save automatically.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            id={inputId}
            type="text"
            value={manualAddress}
            onChange={(e) => {
              setManualAddress(e.target.value);
              autoManagedRef.current = false;
              setGeoError("");
            }}
            className="sm:col-span-2 rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
            placeholder={defaultAddressPlaceholder}
          />
          <input
            type="text"
            value={manualLat}
            onChange={(e) => {
              setManualLat(e.target.value);
              setGeoError("");
            }}
            className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
            placeholder="Latitude (required)"
          />
          <input
            type="text"
            value={manualLng}
            onChange={(e) => {
              setManualLng(e.target.value);
              setGeoError("");
            }}
            className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
            placeholder="Longitude (required)"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMapOpen((o) => !o)}
            className="rounded-lg border border-(--brand-e)/35 bg-(--brand-e-muted) px-3 py-1.5 text-xs font-semibold text-(--brand-e) hover:bg-(--brand-e)/20"
          >
            {mapOpen ? "Hide map" : "Open map"}
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoBusy}
            className="rounded-lg border border-[#ffb96b] bg-[#faf3ec] px-3 py-1.5 text-xs font-semibold text-brand-patri hover:bg-[#fdead6] disabled:opacity-50"
          >
            {geoBusy ? "Detecting..." : "Use current location"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-(--brand-patri)/35 bg-(--brand-patri-muted) px-3 py-1.5 text-xs font-semibold text-(--brand-patri) hover:bg-(--brand-patri)/20"
            onClick={clear}
          >
            Clear
          </button>
        </div>
        {geoError ? <p className="mt-1 text-[11px] text-(--brand-patri-dark)">{geoError}</p> : null}
      </div>

      {value ? (
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-xs text-[#14532d]">
          <p className="leading-snug">
            <span className="font-semibold">Saved: </span>
            {String(value.address_text || "").trim() ||
              `${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`}
          </p>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-semibold text-[#166534] underline decoration-[#166534]/40"
            >
              Open in Google Maps
            </a>
          ) : null}
        </div>
      ) : null}

      {mapOpen ? (
        <div className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-white">
          <div className="space-y-1 border-b border-[#efefef] px-3 py-2 text-[11px] text-[#737373]">
            <p className="font-semibold text-[#525252]">Tap the map to set latitude and longitude (Leaflet + OpenStreetMap).</p>
            <p className="leading-snug text-[#8e8e8e]">
              OSM roads can lag new layouts. After saving, use <span className="font-semibold">Open in Google Maps</span>{" "}
              above for the most up-to-date imagery and directions.
            </p>
          </div>
          <MapContainer
            center={mapCenter}
            zoom={hasSavedCoords ? 16 : 5}
            className="h-48 w-full"
            scrollWheelZoom
          >
            <MapInvalidateWhenVisible />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickPicker onPick={setFromMap} />
            {hasSavedCoords ? (
              <CircleMarker
                center={[Number(value.latitude), Number(value.longitude)]}
                radius={9}
                pathOptions={{ color: "#059669", fillColor: "#059669", fillOpacity: 0.4 }}
              />
            ) : null}
          </MapContainer>
        </div>
      ) : null}
    </div>
  );
}
