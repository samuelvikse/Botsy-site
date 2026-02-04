'use client'

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

// Default blur placeholder matching Botsy dark theme
const DEFAULT_BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANR1PqKytNPiuLe4EssaiWJYo23KpAypY+AfJ9VqKdc2P1f+UpTJts5MCQV3/9k='

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder' | 'blurDataURL'> {
  /** Enable blur placeholder (default: true for non-SVG images) */
  enableBlur?: boolean
  /** Custom blur data URL */
  blurDataURL?: string
  /** Show loading state */
  showLoading?: boolean
}

/**
 * Optimized Image component with automatic blur placeholder,
 * proper sizing, and loading states.
 */
export function OptimizedImage({
  src,
  alt,
  enableBlur = true,
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  showLoading = false,
  className = '',
  onLoad,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)

  // Determine if we should use blur placeholder
  // SVGs don't benefit from blur placeholders
  const isSvg = typeof src === 'string' && src.endsWith('.svg')
  const shouldBlur = enableBlur && !isSvg

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    onLoad?.(event)
  }

  return (
    <div className={`relative ${showLoading && isLoading ? 'animate-pulse bg-white/5 rounded' : ''}`}>
      <Image
        src={src}
        alt={alt}
        placeholder={shouldBlur ? 'blur' : 'empty'}
        blurDataURL={shouldBlur ? blurDataURL : undefined}
        className={`${className} ${isLoading && showLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  )
}

// Export the default blur data URL for use elsewhere
export { DEFAULT_BLUR_DATA_URL as blurDataURL }
