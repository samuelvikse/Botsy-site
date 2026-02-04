'use client'

import { useEffect, useState } from 'react'
import { motion, MotionProps, HTMLMotionProps, Variants } from 'framer-motion'

// Hook to detect if user prefers reduced motion
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Safe animation variants that respect reduced motion
export const safeAnimationVariants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
  },
  slideInRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } }
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }
} as const

// Reduced motion variants (instant transitions)
export const reducedMotionVariants = {
  fadeInUp: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } }
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } }
  },
  slideInLeft: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } }
  },
  slideInRight: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0 } }
  },
  staggerContainer: {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { duration: 0 } }
  }
} as const

// Helper to get the appropriate variants based on motion preference
export function getMotionSafeVariants(
  variantName: keyof typeof safeAnimationVariants,
  prefersReducedMotion: boolean
): Variants {
  return prefersReducedMotion
    ? reducedMotionVariants[variantName]
    : safeAnimationVariants[variantName]
}

// Type-safe motion component props
type MotionDivProps = HTMLMotionProps<'div'>

// Motion-safe wrapper component
interface MotionSafeProps extends Omit<MotionDivProps, 'variants'> {
  variantName?: keyof typeof safeAnimationVariants
  variants?: Variants
}

export function MotionSafe({
  variantName = 'fadeIn',
  variants: customVariants,
  children,
  ...props
}: MotionSafeProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const variants = customVariants || getMotionSafeVariants(variantName, prefersReducedMotion)

  return (
    <motion.div variants={variants} {...props}>
      {children}
    </motion.div>
  )
}
