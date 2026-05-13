// Module-level singleton so nav direction is readable at render time
// without React context overhead.
export const navDir = { current: 0 }

export const NAV_ORDER = ['/', '/templates', '/settings']

export function getNavDirection(fromPath: string, toPath: string): number {
  const from = NAV_ORDER.findIndex(r =>
    r === '/' ? fromPath === '/' : fromPath.startsWith(r)
  )
  const to = NAV_ORDER.indexOf(toPath)
  if (from === -1 || to === -1) return 0
  return to > from ? 1 : -1
}
