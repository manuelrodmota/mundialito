import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'gold' | 'primary' | 'ghost'
export type ButtonSize = 'base' | 'big'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Game action button — three intent weights: gold (primary CTA), primary (standard), ghost (secondary). */
export function Button({
  variant = 'primary',
  size = 'base',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'big' ? 'btn-big' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
