interface AvatarProps {
  name: string
  size?: number
}

export function Avatar({ name, size = 36 }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')

  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue}, 50%, 55%)`,
      }}
    >
      {initials || '?'}
    </div>
  )
}
