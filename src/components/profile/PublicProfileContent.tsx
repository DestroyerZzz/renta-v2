'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import SupabaseImage from '@/components/ui/SupabaseImage'
import ReadOnlyProductCard from '@/components/products/ReadOnlyProductCard'
import { User, Search } from 'lucide-react'
import Image from 'next/image'

interface Product {
  id: string
  created_at: string
  user_id: string
  title: string | null
  image_url: string | null
  description: string | null
  tag: string | null
  display_section: 'left' | 'right'
}

interface PublicProfileContentProps {
  userId: string
}

export default function PublicProfileContent({ userId }: PublicProfileContentProps) {
  const [userName, setUserName] = useState<string>('')
  const [username, setUsername] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [leftProducts, setLeftProducts] = useState<Product[]>([])
  const [rightProducts, setRightProducts] = useState<Product[]>([])
  const [filteredLeftProducts, setFilteredLeftProducts] = useState<Product[]>([])
  const [filteredRightProducts, setFilteredRightProducts] = useState<Product[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        // console.log('Fetching profile data for userId:', userId);
        
        // Get user profile details
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, cover_image_url, username')
          .eq('id', userId)
          .single()
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          if (profileError.code === 'PGRST116') {
            setProfileNotFound(true);
          }
          throw profileError;
        }
        
        if (profile) {
          setUserName(profile.full_name || 'Пользователь')
          setUsername(profile.username)
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

        // console.log('Products fetched:', products?.length || 0);

        // Separate products into left and right displays
        if (products) {
          const left = products.filter(product => product.display_section === 'left');
          const right = products.filter(product => product.display_section === 'right');
          setLeftProducts(left);
          setRightProducts(right);
          setFilteredLeftProducts(left);
          setFilteredRightProducts(right);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserAndProducts();
    }
  }, [userId, supabase]);

  // Apply tag filter when tagFilter changes
  useEffect(() => {
    if (!tagFilter) {
      setFilteredLeftProducts(leftProducts);
      setFilteredRightProducts(rightProducts);
      return;
    }

    // Normalize user input for case-insensitive comparison
    const normalizedFilter = tagFilter.toLowerCase().trim();
    
    // Filter products by tag - now matching from the first letter
    const filteredLeft = leftProducts.filter(product => {
      if (!product.tag) return false;
      const normalizedProductTag = product.tag.toLowerCase();
      return normalizedProductTag.includes(normalizedFilter);
    });
    
    const filteredRight = rightProducts.filter(product => {
      if (!product.tag) return false;
      const normalizedProductTag = product.tag.toLowerCase();
      return normalizedProductTag.includes(normalizedFilter);
    });

    setFilteredLeftProducts(filteredLeft);
    setFilteredRightProducts(filteredRight);
  }, [tagFilter, leftProducts, rightProducts]);

  // Handler for tag click
  const handleTagClick = (tag: string) => {
    if (tag === tagFilter) {
      // If clicking the same tag, remove the filter
      setTagFilter('');
    } else {
      // Otherwise set the new filter
      setTagFilter(tag);
    }
  };

  // Reset filter
  // const clearFilter = () => {
  //   setTagFilter('');
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 animate-pulse">Загрузка...</div>
      </div>
    );
  }
  
  if (profileNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Профиль не найден</h1>
        <p className="text-lg text-gray-600">
          Пользователь с указанным идентификатором не существует.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Full-width container matched to grid sections */}
      <div className="max-w-7xl mx-auto px-4">
        {/* Cover image section */}
        <div className="rounded-lg relative w-full h-64 mb-8">
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
            <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg"></div>
          )}
          
          {/* Centered avatar and username with text shadow */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative w-[130px] h-[130px] rounded-full overflow-hidden bg-white p-1 shadow-lg mb-4">
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
            <h2 className="font-medium text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">{userName}</h2>
            {username && (
              <div className="mt-1 px-3 py-1 bg-black/30 rounded-full text-white text-sm flex items-center">
                <User size={14} className="mr-1" />
                <span>@{username}</span>
              </div>
            )}
          </div>
        </div>
      
        {/* Navigation and filter section - aligned with grid */}
        <div className="bg-white shadow py-4 px-2 sticky top-0 z-10 rounded-lg mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Profile interests title */}
            <div className="mb-4 md:mb-0">
              <h1 className="text-lg font-medium text-black">
                Интересы профиля {username ? `@${username}` : userName}
              </h1>
            </div>
            
            {/* Right filter */}
            <div className="w-full md:w-64">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
        
        {/* Content container with grid sections */}
        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative animate-fadeIn">
            {/* Left Display Section - like interests */}
            <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden relative">
              {/* Rounded top border for "like" section */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-green-500 rounded-t-lg"></div>
              
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
                    {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет продуктов в левом дисплее.'}
                  </div>
                )}
              </div>
            </section>

            {/* Vertical separator line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black to-transparent opacity-20 transform -translate-x-1/2"></div>

            {/* Right Display Section dislike interests */}
            <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden relative">
              {/* Rounded top border for "dislike" section */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-500 rounded-t-lg"></div>
              
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
                    {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет товаров в правом дисплее.'}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}