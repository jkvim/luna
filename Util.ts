export function toKebabCase(str: string) {
  return str.replace(/[A-Z][a-z]*/g, (match, offset) =>
    [match.toLowerCase(), match !== str.slice(offset) ? "-" : ""].join("")
  )
}