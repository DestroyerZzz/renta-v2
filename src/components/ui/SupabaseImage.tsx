'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface SupabaseImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  fallback?: React.ReactNode
  priority?: boolean
  quality?: number
  sizes?: string
  loading?: 'eager' | 'lazy'
}

/**
 * Optimized image component for Supabase storage images with improved loading performance.
 */
export default function SupabaseImage({
  src,
  alt,
  width = 500,
  height = 500,
  fill = false,
  className = '',
  fallback,
  priority = false,
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading: imageLoading
}: SupabaseImageProps) {
  const [error, setError] = useState(false)
  const isDataUrl = src?.startsWith('data:')
  const isSupabaseUrl = src?.includes('supabase')

  // Only add timestamp for development to prevent caching issues
  const isDev = process.env.NODE_ENV === 'development'
  const imageUrl = isSupabaseUrl && isDev && !src.includes('?')
    ? `${src}?t=${new Date().getTime()}`
    : src

  // Handle component mounting and cleanup
  useEffect(() => {
    setError(false)

    // Reset error state when src changes
    return () => {
      setError(false)
    }
  }, [src])

  // If image fails to load or there's no src, show the fallback
  if (error || !src) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback || <div className="text-gray-400">No image</div>}
      </div>
    )
  }

  const handleLoad = () => {
    // Image loaded successfully
  }

  const imageClasses = `${className} opacity-100 ${fill ? 'object-cover w-full h-full' : ''}`
  const loadingAttribute = imageLoading || (priority ? "eager" : "lazy")

  if (fill) {
    return (
      <div className="absolute inset-0">
        <Image
          src={imageUrl}
          alt={alt}
          fill={true}
          className={imageClasses}
          onError={() => setError(true)}
          onLoad={handleLoad}
          sizes={sizes}
          priority={priority}
          quality={quality}
          loading={loadingAttribute}
          unoptimized={!isDataUrl && isSupabaseUrl}
        />
      </div>
    )
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={imageClasses}
      onError={() => setError(true)}
      onLoad={handleLoad}
      sizes={sizes}
      priority={priority}
      quality={quality}
      loading={loadingAttribute}
      unoptimized={!isDataUrl && isSupabaseUrl} />
  )
}