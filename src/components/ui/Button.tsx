import { cn } from '@/lib/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.98]'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
  }
  const variants = {
    primary: 'bg-accent text-white hover:opacity-85',
    ghost: 'bg-transparent text-muted border border-[rgba(0,0,0,0.14)] hover:bg-surface2',
    danger: 'bg-status-red-bg text-status-red hover:opacity-85',
  }

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  )
}
