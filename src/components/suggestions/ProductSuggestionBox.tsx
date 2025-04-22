'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'

/**
 * Type for suggestion product data
 */
export type SuggestionProductData = {
  title: string
  description: string | null
  tag: string | null
  image_url: string | null
  count: number
}

/**
 * Props for the product suggestion box component
 */
export type ProductSuggestionBoxProps = {
  inputValue: string
  onSelectSuggestion: (product: SuggestionProductData) => void
  className?: string
  excludeUserId?: string
}

/**
 * ProductSuggestionBox component displays suggestions for products
 * as the user types in the product title field
 */
const ProductSuggestionBox = (props: ProductSuggestionBoxProps) => {
  const { inputValue, onSelectSuggestion, className = '', excludeUserId } = props
  const [suggestions, setSuggestions] = useState<SuggestionProductData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!inputValue || inputValue.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Search for products with similar titles
        const { data, error } = await supabase
          .from('products')
          .select('title, description, tag, image_url')
          .ilike('title', `%${inputValue}%`)
          .limit(5)

        if (error) throw error

        if (data && data.length > 0) {
          // Group similar products and count occurrences
          const productMap = new Map<string, SuggestionProductData>()
          
          data.forEach((product) => {
            const key = `${product.title?.toLowerCase() || ''}`
            
            if (!productMap.has(key)) {
              productMap.set(key, {
                title: product.title || '',
                description: product.description,
                tag: product.tag,
                image_url: product.image_url,
                count: 1
              })
            } else {
              const existing = productMap.get(key)!
              productMap.set(key, {
                ...existing,
                count: existing.count + 1
              })
            }
          })
          
          // Convert map to array and sort by count (most used first)
          const suggestionsList = Array.from(productMap.values())
            .sort((a, b) => b.count - a.count)
            
          setSuggestions(suggestionsList)
        } else {
          setSuggestions([])
        }
      } catch (err) {
        console.error('Error fetching product suggestions:', err)
        setError('Failed to load suggestions')
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [inputValue, supabase, excludeUserId])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([])
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (suggestions.length === 0 && !isLoading) {
    return null
  }

  return (
    <div 
      ref={suggestionsRef}
      className={`absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg ${className}`}
    >
      {isLoading ? (
        <div className="p-2 text-sm text-gray-500 animate-pulse">
          Загрузка предложений...
        </div>
      ) : error ? (
        <div className="p-2 text-sm text-red-500">
          {error}
        </div>
      ) : (
        <ul className="max-h-60 overflow-auto">
          {suggestions.map((product, index) => (
            <li 
              key={`${product.title}-${index}`}
              onClick={() => onSelectSuggestion(product)}
              className="cursor-pointer p-2 hover:bg-gray-100 border-b last:border-b-0 text-black"
            >
              <div className="font-medium">{product.title}</div>
              {product.tag && (
                <div className="text-xs text-indigo-600 mt-1">#{product.tag}</div>
              )}
              {product.description && (
                <div className="text-xs text-gray-500 truncate mt-1">{product.description}</div>
              )}
              {product.image_url && (
                <div className="text-xs text-green-600 mt-1">С изображением</div>
              )}
              <div className="text-xs text-gray-400 mt-1">Использовано {product.count} раз</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ProductSuggestionBox