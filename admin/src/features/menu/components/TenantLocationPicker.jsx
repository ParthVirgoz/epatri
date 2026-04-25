/**
 * Pick current outlet when the account has one or more locations (V2+).
 */
export default function TenantLocationPicker({ locations, value, onChange, disabled }) {
  if (!locations?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#dbdbdb] bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Outlet</p>
      <select
        className="w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm text-[#262626] focus:border-[#a8a8a8] focus:bg-white focus:outline-none disabled:opacity-50"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
            {loc.is_primary ? " (primary)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
