import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-botsy font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botsy-lime focus-visible:ring-offset-2 focus-visible:ring-offset-botsy-dark disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-botsy-lime text-botsy-dark hover:bg-botsy-lime-light shadow-lime-glow-sm hover:shadow-lime-glow active:scale-[0.98]',
        secondary:
          'bg-botsy-dark-surface text-white border border-white/10 hover:border-botsy-lime/30 hover:bg-botsy-dark-surface/80',
        outline:
          'border border-white/20 text-white hover:border-botsy-lime/50 hover:text-botsy-lime bg-transparent',
        ghost:
          'text-white hover:text-botsy-lime hover:bg-white/5',
        link:
          'text-botsy-lime underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 text-sm',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
