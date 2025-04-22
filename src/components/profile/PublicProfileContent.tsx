'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import ReadOnlyProductCard, { DEFAULT_TAG } from '@/components/products/ReadOnlyProductCard'
import SupabaseImage from '@/components/ui/SupabaseImage'

type Product = Database['public']['Tables']['products']['Row']

interface PublicProfileContentProps {
  userId: string
}

export default function PublicProfileContent({ userId }: PublicProfileContentProps) {
  const [userName, setUserName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [leftProducts, setLeftProducts] = useState<Product[]>([])
  const [rightProducts, setRightProducts] = useState<Product[]>([])
  const [filteredLeftProducts, setFilteredLeftProducts] = useState<Product[]>([])
  const [filteredRightProducts, setFilteredRightProducts] = useState<Product[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        console.log('Fetching profile data for userId:', userId);
        
        // Get user profile details
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userId)
          .single()
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
        
        if (profile) {
          setUserName(profile.full_name || 'Пользователь')
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
        }

        // Fetch products for the user
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (productError) {
          console.error('Error fetching products:', productError);
          throw productError;
        }

        console.log('Products fetched:', products?.length || 0);

        // Separate products into left and right displays
        if (products) {
          const leftProds = products.filter(p => p.display_section === 'left')
          const rightProds = products.filter(p => p.display_section === 'right')
          setLeftProducts(leftProds)
          setRightProducts(rightProds)
          setFilteredLeftProducts(leftProds)
          setFilteredRightProducts(rightProds)
        }
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserAndProducts()
    }
  }, [userId, supabase])

  // Apply tag filtering
  useEffect(() => {
    if (tagFilter.trim() === '') {
      setFilteredLeftProducts(leftProducts)
      setFilteredRightProducts(rightProducts)
    } else {
      const normalizedFilter = tagFilter.toLowerCase().trim()
      // Check if the filter matches the default tag
      const isDefaultTagSearch = DEFAULT_TAG.toLowerCase().includes(normalizedFilter)
      
      setFilteredLeftProducts(leftProducts.filter(p => 
        p.tag?.toLowerCase().includes(normalizedFilter) || 
        // Include products with null/empty tags if searching for default tag
        (isDefaultTagSearch && (!p.tag || p.tag.trim() === ''))
      ))
      setFilteredRightProducts(rightProducts.filter(p => 
        p.tag?.toLowerCase().includes(normalizedFilter) || 
        // Include products with null/empty tags if searching for default tag
        (isDefaultTagSearch && (!p.tag || p.tag.trim() === ''))
      ))
    }
  }, [tagFilter, leftProducts, rightProducts])

  const handleTagClick = (tag: string) => {
    setTagFilter(tag);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      {/* Header area with title and filter */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        {/* Search filter */}
        <div className="w-full md:w-auto mb-4 md:mb-0">
          <div className="relative max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">#</span>
            </div>
            <input
              type="text"
              placeholder="Фильтровать по тегу..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md shadow-sm  focus:border-indigo-500 text-black transition-all duration-200 ease-in-out hover:border-indigo-300"
            />
            {tagFilter && (
              <button
                onClick={() => setTagFilter('')}
                className="cursor-pointer absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Очистить фильтр"
              >
                <span className="text-xl transform hover:scale-110 transition-transform duration-200">&times;</span>
              </button>
            )}
          </div>
        </div>
        
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center">
          Продукты пользователя {userName}
        </h1>
      </div>
      
      {/* User Profile Card */}
      <div className="mb-8 max-w-md mx-auto bg-white rounded-lg shadow-lg p-5 flex items-center transform hover:scale-102 transition-all duration-300 hover:shadow-xl">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-indigo-100 mr-5 border-2 border-indigo-200 flex-shrink-0 transform ">
          {avatarUrl ? (
            <SupabaseImage 
              src={avatarUrl} 
              alt="User Avatar" 
              className="w-full h-full object-cover transition-opacity duration-300 hover:opacity-90"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-xl font-bold animate-pulse">
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-xl font-bold">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-medium text-lg text-gray-800">{userName}</h2>
        </div>
      </div>
      
      {/* Display sections container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative animate-fadeIn opacity-100">
        {/* Left Display Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              <span className="sm:inline md:inline">Левый дисплей</span>
            </h2>
          </div>

          <div className="space-y-4">
            {filteredLeftProducts.length > 0 ? (
              filteredLeftProducts.map(product => (
                <ReadOnlyProductCard
                  key={product.id}
                  product={product}
                  onTagClick={handleTagClick}
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 animate-pulse">
                {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет продуктов в этом разделе.'}
              </div>
            )}
          </div>
        </section>

        {/* Vertical separator line */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black to-transparent opacity-20 transform -translate-x-1/2"></div>

        {/* Right Display Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              <span className="sm:inline md:inline">Правый дисплей</span>
            </h2>
          </div>

          <div className="space-y-4">
            {filteredRightProducts.length > 0 ? (
              filteredRightProducts.map(product => (
                <ReadOnlyProductCard
                  key={product.id}
                  product={product}
                  onTagClick={handleTagClick}
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 animate-pulse">
                {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет продуктов в этом разделе.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}