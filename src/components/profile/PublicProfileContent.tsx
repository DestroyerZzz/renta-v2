'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import ReadOnlyProductCard, { DEFAULT_TAG } from '@/components/products/ReadOnlyProductCard'
import SupabaseImage from '@/components/ui/SupabaseImage'
import Image from 'next/image'
import { Search } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']

interface PublicProfileContentProps {
  userId: string
}

export default function PublicProfileContent({ userId }: PublicProfileContentProps) {
  const [userName, setUserName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
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
          .select('full_name, avatar_url, cover_image_url')
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
          if (profile.cover_image_url) {
            setCoverImageUrl(profile.cover_image_url)
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
      {/* Full-width cover image with overlay */}
      <div className="rounded-lg relative w-full h-64">
        {coverImageUrl ? (
          <SupabaseImage 
            src={coverImageUrl} 
            alt="Profile Cover" 
            className="w-full h-full object-cover rounded-lg"
            fallback={
              <div className="rounded-lg w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            }
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        )}
        
        {/* Black overlay with exactly 0.7 opacity */}
        <div className="rounded-lg absolute inset-0 bg-black opacity-70"></div>
        
        {/* Centered avatar and username */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white p-1 shadow-lg mb-4">
            {avatarUrl ? (
              <SupabaseImage 
                src={avatarUrl} 
                alt="User Avatar" 
                className="w-full h-full rounded-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-2xl font-bold rounded-full animate-pulse">
                    {userName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-200 text-indigo-600 text-2xl font-bold rounded-full">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <h2 className="font-medium text-xl text-white">{userName}</h2>
        </div>
      </div>
      
      {/* Navigation and filter section - moved immediately under the cover with no margin */}
      <div className="container mx-auto px-4 bg-white shadow py-4 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            интересы пользователя {userName}
          </h1>
          
          {/* Right filter */}
          <div className="rounded-full w-full md:w-64">
            <div className="relative group">
              <div className=" absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors duration-200">#</span>
              </div>
              <input
                type="text"
                placeholder="Фильтровать по тегу..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="block w-full pl-8 pr-12 py-2 border border-gray-300 rounded-full shadow-sm focus:border-indigo-500 text-black transition-all duration-200 ease-in-out hover:border-indigo-300"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                {tagFilter ? (
                  <button
                    onClick={() => setTagFilter('')}
                    className="pr-8 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <span className="text-xl">&times;</span>
                  </button>
                ) : null}
                <div className="pr-3 text-gray-400">
                  <Search size={18} className="mr-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content container with top margin */}
      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative animate-fadeIn">
          {/* Left Display Section - like interests */}
          <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden relative">
            {/* Rounded top border for "like" section */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-green-500 rounded-t-lg"></div>
            
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
                  Нравится
                </h2>
                <Image 
                  src="/assets/like.png" 
                  width={32} 
                  height={32} 
                  alt="Like" 
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" 
                />
              </div>
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

          {/* Right Display Section - dislike interests */}
          <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden relative">
            {/* Rounded top border for "dislike" section */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-red-500 rounded-t-lg"></div>
            
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
                  Не Нравится
                </h2>
                <Image 
                  src="/assets/dislike.png" 
                  width={32} 
                  height={32} 
                  alt="Dislike" 
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" 
                />
              </div>
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
    </div>
  )
}