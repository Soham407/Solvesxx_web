/**
 * Sanitizes user input for use in Supabase `.ilike` / `.like` queries.
 *
 * LIKE/ILIKE patterns treat `%` and `_` as wildcards. If user input contains
 * these characters, they will match unintended records. This utility escapes
 * them with a backslash so they are treated as literal characters.
 *
 * @example
 * sanitizeLikeInput("100% off") // "100\\% off"
 * sanitizeLikeInput("user_name") // "user\\_name"
 */
export function sanitizeLikeInput(input: string): string {
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%')   // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore
}
