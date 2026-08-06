import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: ReactNode
}

export function Button({ variant = 'primary', icon, children, className = '', ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className}`.trim()} {...props}>{icon}{children}</button>
}
