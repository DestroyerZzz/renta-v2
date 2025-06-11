'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase'

export type SuggestionProductData = {
  title: string
  description: string | null
  tag: string | null
  image_url: string | null
  count: number
  isFromDatabase: boolean
}

export type ProductSuggestionBoxProps = {
  inputValue: string
  onFindMatch: (product: SuggestionProductData | null, isSearching: boolean) => void
  className?: string
  excludeUserId?: string
}

// Debounce delay in ms - how long to wait after user stops typing
const DEBOUNCE_DELAY = 500
// Minimum input length to trigger a search
const MIN_SEARCH_LENGTH = 3

const ProductSuggestionBox = (props: ProductSuggestionBoxProps) => {
  const { inputValue, onFindMatch, excludeUserId } = props
  const [productSuggestions, setProductSuggestions] = useState<SuggestionProductData[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const lastSearchRef = useRef<string>('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (typeof window !== 'undefined') { // Guard for SSR
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsVisible(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
    return undefined;
  }, [])

  useEffect(() => {
    // Cleanup function to abort any ongoing search
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const fetchMatchingProduct = async () => {
      // Clear match if input is cleared
      if (!inputValue || inputValue.length < MIN_SEARCH_LENGTH) {
        if (lastSearchRef.current) {
          lastSearchRef.current = ''
          onFindMatch(null, false)
          setProductSuggestions([])
          setIsVisible(false)
        }
        return
      }

      const normalizedInput = inputValue.trim().toLowerCase()

      // Skip search if input hasn't changed since last search
      if (normalizedInput === lastSearchRef.current) {
        return
      }

      // Abort previous search if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      lastSearchRef.current = normalizedInput
      // Set searching state through callback
      onFindMatch(null, true) // Indicate search is starting

      try {
        const supabase = createClient()

        // Get most closely matching products (up to 5)
        const { data: matches, error: matchError } = await supabase
          .from('products')
          .select('title, description, tag, image_url')
          .ilike('title', `%${normalizedInput}%`) // Case-insensitive search
          .order('title')
          .limit(5)

        if (matchError) throw matchError

        // If we found matches
        if (matches && matches.length > 0) {
          // Find exact match if exists
          const exactMatch = matches.find(
            match => match.title?.trim().toLowerCase() === normalizedInput
          )

          // Process matches for dropdown
          const suggestions = matches.map(match => ({
            title: match.title || '',
            description: match.description,
            tag: match.tag,
            image_url: match.image_url,
            count: 1, // Could be enhanced to show actual usage count
            isFromDatabase: true,
            isExactMatch: match.title?.trim().toLowerCase() === normalizedInput
          }))

          setProductSuggestions(suggestions)
          setIsVisible(suggestions.length > 0)

          // Only auto-fill if there's an exact match
          if (exactMatch) {
            onFindMatch({
              title: exactMatch.title || '',
              description: exactMatch.description,
              tag: exactMatch.tag,
              image_url: exactMatch.image_url,
              count: 1,
              isFromDatabase: true
            }, false)
          } else {
            // No exact match - show dropdown but don't auto-fill
            onFindMatch(null, false)
          }
        } else {
          // No match found, clear any previous matches
          onFindMatch(null, false)
          setProductSuggestions([])
          setIsVisible(false)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return // Search was cancelled, do nothing
        }
        console.error('Error fetching product match:', err)
        // Signal error through callback instead of storing in state
        onFindMatch(null, false)
        setProductSuggestions([])
        setIsVisible(false)
      }
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Only start a new search after the user stops typing for DEBOUNCE_DELAY ms
    // Don't even set the timeout if input is too short
    if (inputValue.length >= MIN_SEARCH_LENGTH) {
      searchTimeoutRef.current = setTimeout(fetchMatchingProduct, DEBOUNCE_DELAY)
    } else if (!inputValue || inputValue.length === 0) {
      // Clear matches immediately when input is cleared
      lastSearchRef.current = ''
      onFindMatch(null, false)
      setProductSuggestions([])
      setIsVisible(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, excludeUserId, onFindMatch])

  const handleSuggestionSelect = (suggestion: SuggestionProductData) => {
    // When user selects a suggestion, trigger auto-fill
    onFindMatch(suggestion, false)
    setIsVisible(false)
  }

  if (!isVisible || productSuggestions.length === 0) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-20 w-full mt-1.5 bg-white rounded-md shadow-md border border-gray-200 overflow-hidden"
    >
      <ul className={`${productSuggestions.length > 3 ? 'max-h-48 overflow-y-auto' : ''
        }`}>
        {productSuggestions.map((suggestion, index) => (
          <li
            key={index}
            onClick={() => handleSuggestionSelect(suggestion)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              {/* Product title container */}
              <div className="flex items-center min-w-0 max-w-[80%]">
                <span className="font-medium text-gray-800 truncate">
                  {suggestion.title}
                </span>
              </div>

              {/* Badge indicating it's from database */}
              <div className="flex-shrink-0">
                <span className="text-xs bg-indigo-100 text-[#3d82f7] px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                  из базы данных
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProductSuggestionBox