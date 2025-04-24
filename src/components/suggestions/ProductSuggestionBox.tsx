'use client'

import{  useEffect, useRef } from 'react'
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
  // Remove unused state variables to fix linting errors
  const lastSearchRef = useRef<string>('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
        
        // Use case-insensitive search with ilike instead of exact match
        const { data: matches, error: matchError } = await supabase
          .from('products')
          .select('title, description, tag, image_url')
          .ilike('title', inputValue.trim()) // Case-insensitive search
          .limit(1)

        if (matchError) throw matchError

        // If we found a match, use it
        if (matches && matches.length > 0) {
          const match = matches[0]
          onFindMatch({
            title: match.title || '',
            description: match.description,
            tag: match.tag,
            image_url: match.image_url,
            count: 1,
            isFromDatabase: true
          }, false)
        } else {
          // No match found, clear any previous matches
          onFindMatch(null, false)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return // Search was cancelled, do nothing
        }
        console.error('Error fetching product match:', err)
        // Signal error through callback instead of storing in state
        onFindMatch(null, false)
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
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, excludeUserId, onFindMatch])

  // No visible UI - this component just handles the auto-fill logic
  return null
}

export default ProductSuggestionBox