'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import ProductCard, { DEFAULT_TAG } from '@/components/products/ProductCard'
import ProductForm from '@/components/products/ProductForm'
import { Database } from '@/types/database'
import SupabaseImage from '@/components/ui/SupabaseImage'
import { PlusCircle, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
// import Link from 'next/link'

type Product = Database['public']['Tables']['products']['Row']

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [leftProducts, setLeftProducts] = useState<Product[]>([])
  const [rightProducts, setRightProducts] = useState<Product[]>([])
  const [filteredLeftProducts, setFilteredLeftProducts] = useState<Product[]>([])
  const [filteredRightProducts, setFilteredRightProducts] = useState<Product[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [showLeftForm, setShowLeftForm] = useState(false)
  const [showRightForm, setShowRightForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        
        // Get user profile details (name, avatar, cover image)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, cover_image_url')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserName(profile.full_name || user.email?.split('@')[0] || 'Пользователь')
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
          if (profile.cover_image_url) {
            setCoverImageUrl(profile.cover_image_url)
          }
        } else {
          setUserName(user.email?.split('@')[0] || 'Пользователь')
        }

        // Fetch products for the user
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

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
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndProducts()
  }, [supabase])

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

  const handleDeleteProduct = (productId: string) => {
    setLeftProducts(prev => prev.filter(p => p.id !== productId))
    setRightProducts(prev => prev.filter(p => p.id !== productId))
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    if (product.display_section === 'left') {
      setShowLeftForm(true)
    } else {
      setShowRightForm(true)
    }
  }

  // Handler for image updates directly from ProductCard
  const handleImageUpdate = (updatedProduct: Product) => {
    if (updatedProduct.display_section === 'left') {
      setLeftProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
      setFilteredLeftProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
    } else {
      setRightProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
      setFilteredRightProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
    }
  }

  const handleFormComplete = async () => {
    // Refresh products after form submission
    if (userId) {
      setIsLoading(true)
      try {
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (products) {
          const leftProds = products.filter(p => p.display_section === 'left')
          const rightProds = products.filter(p => p.display_section === 'right')
          setLeftProducts(leftProds)
          setRightProducts(rightProds)
          setFilteredLeftProducts(leftProds)
          setFilteredRightProducts(rightProds)
        }
      } catch (error) {
        console.error('Error refreshing products:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Reset form states
    setShowLeftForm(false)
    setShowRightForm(false)
    setEditingProduct(undefined)
  }

  const handleTagClick = (tag: string) => {
    setTagFilter(tag);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600 animate-pulse">Загрузка...</div>
      </div>
    )
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
            <h2 className="font-medium text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">{userName}</h2>
          </div>
        </div>

        {/* Navigation and filter section - aligned with grid */}
        <div className="bg-white shadow py-4 px-2 sticky top-0 z-10 rounded-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Left anchors */}
            <div className="pl-4 flex space-x-6 mb-4 md:mb-0">
              <a 
                href="/dashboard"
                className="text-[#3d82f7] hover:text-[#2d6ce0] transition-colors duration-200 font-medium"
              >
                Профиль
              </a>
              <a 
                href="#"
                className="text-gray-600 hover:text-[#2d6ce0] transition-colors duration-200 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/404');
                }}
              >
                Активность
              </a>
              <a 
                href="/dashboard/profile"
                className="text-gray-600 hover:text-[#2d6ce0] transition-colors duration-200 font-medium"
              >
                Настройки
              </a>
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(undefined)
                    setShowLeftForm(true)
                  }}
                  className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#2daa4f] rounded-md hover:bg-[#249c47] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span className="sm:hidden">Добавить</span>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>

              {showLeftForm && userId && (
                <div className="mb-6 animate-slideDown">
                  <ProductForm
                    userId={userId}
                    product={editingProduct?.display_section === 'left' ? editingProduct : undefined}
                    section="left"
                    onComplete={handleFormComplete}
                    onCancel={() => {
                      setShowLeftForm(false)
                      setEditingProduct(undefined)
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                {filteredLeftProducts.length > 0 ? (
                  filteredLeftProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onDelete={handleDeleteProduct}
                      onEdit={handleEditProduct}
                      onTagClick={handleTagClick}
                      onImageUpdate={handleImageUpdate}
                    />
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500 animate-pulse">
                    {tagFilter ? 'Ни один интерес не соответствует вашему фильтру.' : 'Нет интересов в Нравится. Добавьте свой первый интерес!'}
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(undefined)
                    setShowRightForm(true)
                  }}
                  className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#f05d4d] rounded-md hover:bg-[#e04d3e] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span className="sm:hidden">Добавить</span>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>

              {showRightForm && userId && (
                <div className="mb-6 animate-slideDown">
                  <ProductForm
                    userId={userId}
                    product={editingProduct?.display_section === 'right' ? editingProduct : undefined}
                    section="right"
                    onComplete={handleFormComplete}
                    onCancel={() => {
                      setShowRightForm(false)
                      setEditingProduct(undefined)
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                {filteredRightProducts.length > 0 ? (
                  filteredRightProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onDelete={handleDeleteProduct}
                      onEdit={handleEditProduct}
                      onTagClick={handleTagClick}
                      onImageUpdate={handleImageUpdate}
                    />
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500 animate-pulse">
                    {tagFilter ? 'Ни один интерес не соответствует вашему фильтру.' : 'Нет интересов в Не Нравится. Добавьте свой первый интерес!'}
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