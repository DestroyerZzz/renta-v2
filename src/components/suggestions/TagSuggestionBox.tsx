'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase'
import { Repeat } from 'lucide-react'

export type SuggestionTagData = {
  tag: string
  count: number
}

export type TagSuggestionBoxProps = {
  inputValue: string
  onSelectTag: (tag: string) => void
  onFindMatches: (tags: SuggestionTagData[] | null, isSearching: boolean) => void
}

// Debounce delay in ms - how long to wait after user stops typing
const DEBOUNCE_DELAY = 300
// Minimum input length to trigger a search
const MIN_SEARCH_LENGTH = 2

const TagSuggestionBox = ({ inputValue, onSelectTag, onFindMatches }: TagSuggestionBoxProps) => {
  const [tagSuggestions, setTagSuggestions] = useState<SuggestionTagData[]>([])
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

  // Cleanup on unmount
  useEffect(() => {
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
    const fetchMatchingTags = async () => {
      // Clear matches if input is too short
      if (!inputValue || inputValue.length < MIN_SEARCH_LENGTH) {
        if (lastSearchRef.current) {
          lastSearchRef.current = ''
          setTagSuggestions([])
          onFindMatches(null, false)
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
      // Set searching state 
      onFindMatches(null, true)

      try {
        const supabase = createClient()
        
        // Use case-insensitive search with ilike
        const { data, error } = await supabase
          .from('products')
          .select('tag')
          .not('tag', 'is', null)
          .ilike('tag', `%${normalizedInput}%`) // Use normalized input for consistent case-insensitive search
        
        if (error) throw error
        
        if (data && data.length > 0) {
          // Process the tags data - count occurrences and filter unique tags
          const tagsWithCount: Record<string, number> = {}
          
          data.forEach(item => {
            if (item.tag) {
              const tag = item.tag.toLowerCase() // normalize to lowercase for counting
              if (tagsWithCount[tag]) {
                tagsWithCount[tag]++
              } else {
                tagsWithCount[tag] = 1
              }
            }
          })
          
          // Convert to array and sort by frequency
          const suggestions = Object.entries(tagsWithCount)
            .map(([tag, count]) => ({ 
              // Use original case from data for display but ensure unique by lowercase key
              tag: data.find(item => item.tag?.toLowerCase() === tag)?.tag || tag, 
              count 
            }))
            .sort((a, b) => b.count - a.count) // Sort by most used first
            .slice(0, 5) // Limit to 5 suggestions
          
          setTagSuggestions(suggestions)
          onFindMatches(suggestions, false)
          setIsVisible(suggestions.length > 0)
        } else {
          // No matches found
          setTagSuggestions([])
          onFindMatches(null, false)
          setIsVisible(false)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return // Search was cancelled, do nothing
        }
        console.error('Error fetching tag matches:', err)
        setTagSuggestions([])
        onFindMatches(null, false)
        setIsVisible(false)
      }
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Only start a new search after the user stops typing
    if (inputValue.length >= MIN_SEARCH_LENGTH) {
      searchTimeoutRef.current = setTimeout(fetchMatchingTags, DEBOUNCE_DELAY)
    } else if (!inputValue || inputValue.length === 0) {
      // Clear matches immediately when input is cleared
      lastSearchRef.current = ''
      setTagSuggestions([])
      onFindMatches(null, false)
      setIsVisible(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, onFindMatches])

  if (!isVisible || tagSuggestions.length === 0) {
    return null
  }

  return (
    <div 
      ref={dropdownRef} 
      className="absolute z-20 w-full mt-1.5 bg-white rounded-md shadow-md border border-gray-200 overflow-hidden"
    >
      <ul className={`${
        tagSuggestions.length > 3 ? 'max-h-48 overflow-y-auto' : ''
      }`}>
        {tagSuggestions.map((suggestion, index) => (
          <li 
            key={index}
            onClick={() => {
              onSelectTag(suggestion.tag.startsWith('#') ? suggestion.tag.substring(1) : suggestion.tag)
              setIsVisible(false)
            }}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
          >
            <div className="px-3 py-2.5 flex items-center justify-between">
              {/* Tag name container with fixed width and truncation */}
              <div className="flex items-center min-w-0 max-w-[60%]">
                <span className="text-gray-500 mr-1.5 flex-shrink-0">#</span>
                <span className="font-medium text-gray-800 truncate">
                  {suggestion.tag.startsWith('#') ? suggestion.tag.substring(1) : suggestion.tag}
                </span>
              </div>
              
              {/* Usage count badge with guaranteed visibility */}
              <div className="flex items-center bg-gray-100 text-gray-700 rounded-full flex-shrink-0">
                <Repeat size={12} /> 
                <span className=" mr-8 px-2 py-1 text-xs text-[#3d82f7] font-semibold">{suggestion.count}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TagSuggestionBox