import Link from 'next/link'
import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

const variantCls: Record<Variant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 border-transparent',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
}

const sizeCls: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

const base =
  'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

type ButtonProps = {
  variant?: Variant
  size?: Size
  href?: string
  className?: string
  children?: React.ReactNode
} & Omit<ComponentProps<'button'>, 'className'>

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const cls = `${base} ${variantCls[variant]} ${sizeCls[size]} ${className}`
  if (href) {
    return <Link href={href} className={cls}>{children}</Link>
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
