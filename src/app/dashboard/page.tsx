'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import ProductCard, { DEFAULT_TAG } from '@/components/products/ProductCard'
import ProductForm from '@/components/products/ProductForm'
import { Database } from '@/types/database'
import SupabaseImage from '@/components/ui/SupabaseImage'
import { PlusCircle } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']

export default function DashboardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
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
        setUserEmail(user.email || '')
        
        // Get user profile details (name, avatar)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserName(profile.full_name || user.email?.split('@')[0] || 'Пользователь')
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
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
      {/* Header area with title and filter */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        {/* Search filter */}
        <div className="w-full md:w-auto mb-4 md:mb-0">
          <div className="relative max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors duration-200">#</span>
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
        
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center ">
          <span className="sm:hidden">Продукты</span>
          <span className="hidden sm:inline md:hidden">Управление продуктами</span>
          <span className="hidden md:inline">Панель управления продуктами</span>
        </h1>
      </div>
      
      {/* User Profile Card */}
      <div className="mb-8 max-w-md mx-auto bg-white rounded-lg shadow-lg p-5 flex items-center transform hover:scale-102 transition-all duration-300 hover:shadow-xl">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-indigo-100 mr-5 border-2 border-indigo-200 flex-shrink-0 ">
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
          <p className="text-sm text-gray-500">{userEmail}</p>
        </div>
      </div>
      
      {/* Display sections container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative opacity-0 animate-fadeIn">
        {/* Left Display Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
              <span className="sm:inline md:hidden lg:hidden">Левый</span>
              <span className="hidden sm:hidden md:inline">Левый дисплей</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(undefined)
                setShowLeftForm(true)
              }}
              className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#2daa4f] rounded-md hover:bg-[#249c47] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
            >
              <PlusCircle size={16} />
              <span className="sm:hidden">Продукт</span>
              <span className="hidden sm:inline">Добавить продукт</span>
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
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 animate-pulse">
                {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет продуктов в левом дисплее. Добавьте свой первый продукт!'}
              </div>
            )}
          </div>
        </section>

        {/* Vertical separator line */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-black to-transparent opacity-20 transform -translate-x-1/2"></div>

        {/* Right Display Section */}
        <section className="bg-white p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
              <span className="sm:inline md:hidden lg:hidden">Правый</span>
              <span className="hidden sm:hidden md:inline">Правый дисплей</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(undefined)
                setShowRightForm(true)
              }}
              className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#f05d4d] rounded-md hover:bg-[#e04d3e] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
            >
              <PlusCircle size={16} />
              <span className="sm:hidden">Продукт</span>
              <span className="hidden sm:inline">Добавить продукт</span>
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
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 animate-pulse">
                {tagFilter ? 'Ни один продукт не соответствует вашему фильтру.' : 'Нет товаров в правом дисплее. Добавьте свой первый товар!'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}