// Tiny classnames helper, replacing Svelte's `class:foo={cond}` directive.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
