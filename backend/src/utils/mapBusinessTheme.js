/**
 * Maps `business_themes` row to admin/guest interactive theme shape.
 * Primary storage: `theme` jsonb. Legacy multi-column rows are still read until migrated.
 */
import { mapBusinessThemeFromDbRow } from "./businessTheme.js";

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function mapBusinessThemeRow(row) {
  return mapBusinessThemeFromDbRow(row);
}
