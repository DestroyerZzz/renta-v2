'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SupabaseImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  fallback?: React.ReactNode
}

/**
 * Custom image component for Supabase storage images that handles errors
 * by providing fallbacks and bypasses Next.js optimization for Supabase URLs.
 */
export default function SupabaseImage({ 
  src, 
  alt, 
  width = 500, 
  height = 500, 
  fill = false, 
  className = '',
  fallback
}: SupabaseImageProps) {
  const [error, setError] = useState(false)
  const isDataUrl = src?.startsWith('data:')
  
  // If image fails to load or there's no src, show the fallback
  if (error || !src) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback || <div className="text-gray-400">No image</div>}
      </div>
    )
  }
  
  const imageClasses = `${className} ${fill ? 'object-cover w-full h-full' : ''}`

  if (fill) {
    return (
      <div className="absolute inset-0">
        <Image
          src={src}
          alt={alt}
          fill={true}
          className={imageClasses}
          onError={() => setError(true)}
          sizes="100vw"
          priority={true}
          unoptimized={!isDataUrl} // Skip optimization for external Supabase URLs
        />
      </div>
    )
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={imageClasses}
      onError={() => setError(true)}
      unoptimized={!isDataUrl} // Skip optimization for external Supabase URLs
    />
  )
}