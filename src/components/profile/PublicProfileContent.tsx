'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase'
import ReadOnlyProductCard from '@/components/intrests/ReadOnlyIntrestsCard'
import ProductCard, { DEFAULT_TAG } from '@/components/intrests/IntrestCard'
import ProductForm from '@/components/intrests/IntrestsForm'
import TagGroupedInterests from '@/components/intrests/TagGroupedInterests'
import { PlusCircle } from 'lucide-react'
import Image from 'next/image'
import ProfileHeader from './ProfileHeader'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Database } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']

interface PublicProfileContentProps {
  userId: string
}

export default function PublicProfileContent({ userId }: PublicProfileContentProps) {
  const [leftProducts, setLeftProducts] = useState<Product[]>([])
  const [rightProducts, setRightProducts] = useState<Product[]>([])
  const [filteredLeftProducts, setFilteredLeftProducts] = useState<Product[]>([])
  const [filteredRightProducts, setFilteredRightProducts] = useState<Product[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [isTagsViewActive, setIsTagsViewActive] = useState(false)
  const [groupedByTagProducts, setGroupedByTagProducts] = useState<{
    [tag: string]: {
      left: Product[],
      right: Product[]
    }
  }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [profileNotFound, setProfileNotFound] = useState(false)
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Dashboard mode state variables
  const [isOwner, setIsOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showLeftForm, setShowLeftForm] = useState(false)
  const [showRightForm, setShowRightForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)

  // Check if current user is the profile owner
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          setIsOwner(user.id === userId)
        }
      } catch (error) {
        console.error('Error checking user:', error)
      }
    }

    checkOwnership()
  }, [supabase, userId])

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        // Check if profile exists (for not found state)
        const { error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          if (profileError.code === 'PGRST116') {
            setProfileNotFound(true);
          }
          throw profileError;
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

        // Separate products into left and right displays
        if (products) {
          const typedProducts = products as Product[];
          const left = typedProducts.filter((product) => product.display_section === 'left');
          const right = typedProducts.filter((product) => product.display_section === 'right');
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

    // For owner/dashboard mode, include default tag matching
    if (isOwner) {
      const normalizedFilter = tagFilter.toLowerCase().trim();
      const isDefaultTagSearch = DEFAULT_TAG.toLowerCase().includes(normalizedFilter);

      setFilteredLeftProducts(leftProducts.filter((p: Product) =>
        p.tag?.toLowerCase().includes(normalizedFilter) ||
        (isDefaultTagSearch && (!p.tag || p.tag.trim() === ''))
      ));

      setFilteredRightProducts(rightProducts.filter((p: Product) =>
        p.tag?.toLowerCase().includes(normalizedFilter) ||
        (isDefaultTagSearch && (!p.tag || p.tag.trim() === ''))
      ));
      return;
    }

    // Non-owner/read-only mode filtering
    const normalizedFilter = tagFilter.toLowerCase().trim();

    // Filter products by tag - matching from the first letter
    const filteredLeft = leftProducts.filter((product: Product) => {
      if (!product.tag) return false;
      const normalizedProductTag = product.tag.toLowerCase();
      return normalizedProductTag.includes(normalizedFilter);
    });

    const filteredRight = rightProducts.filter((product: Product) => {
      if (!product.tag) return false;
      const normalizedProductTag = product.tag.toLowerCase();
      return normalizedProductTag.includes(normalizedFilter);
    });

    setFilteredLeftProducts(filteredLeft);
    setFilteredRightProducts(filteredRight);
  }, [tagFilter, leftProducts, rightProducts, isOwner]);

  // Group products by tags when products or filter changes
  useEffect(() => {
    // Create an object to hold grouped products
    const grouped: {
      [tag: string]: {
        left: Product[],
        right: Product[]
      }
    } = {};

    // Process left products (likes)
    const leftToProcess = tagFilter ? filteredLeftProducts : leftProducts;
    leftToProcess.forEach(product => {
      const tag = product.tag?.trim() || DEFAULT_TAG;
      if (!grouped[tag]) {
        grouped[tag] = { left: [], right: [] };
      }
      grouped[tag].left.push(product);
    });

    // Process right products (dislikes)
    const rightToProcess = tagFilter ? filteredRightProducts : rightProducts;
    rightToProcess.forEach(product => {
      const tag = product.tag?.trim() || DEFAULT_TAG;
      if (!grouped[tag]) {
        grouped[tag] = { left: [], right: [] };
      }
      grouped[tag].right.push(product);
    });

    setGroupedByTagProducts(grouped);
  }, [filteredLeftProducts, filteredRightProducts, leftProducts, rightProducts, tagFilter]);

  // Toggle between tag view and normal view
  const handleToggleTagsView = () => {
    setIsTagsViewActive(prev => !prev);
  };// Handler for tag click
  const handleTagClick = (tag: string) => {
    // Ensure we're working with a clean tag (no # prefix)
    const cleanTag = tag.startsWith('#') ? tag.substring(1) : tag;

    try {
      // Update local state and URL
      if (cleanTag === tagFilter) {
        // If clicking the same tag, remove the filter
        setTagFilter('');
        // Update URL - remove tag parameter
        startTransition(() => {
          const nextParams = new URLSearchParams(Array.from(searchParams.entries()));
          nextParams.delete('tag');
          // Push new URL (shallow, no reload, shareable)
          router.push(`${pathname}${nextParams.size ? `?${nextParams}` : ''}`);
        });
      } else {
        // Otherwise set the new filter
        setTagFilter(cleanTag);
        // Update URL with tag parameter
        startTransition(() => {
          const nextParams = new URLSearchParams(Array.from(searchParams.entries()));
          nextParams.set('tag', cleanTag);
          // Push new URL (shallow, no reload, shareable)
          router.push(`${pathname}${nextParams.size ? `?${nextParams}` : ''}`);
        });
      }
    } catch (err) {
      // Log error with context as per guideline
      console.error('Failed to update tag filter in URL', { value: cleanTag, err });
      // Still update the local state even if URL update fails
      setTagFilter(cleanTag === tagFilter ? '' : cleanTag);
    }
  };

  // Dashboard-specific handlers
  const handleDeleteProduct = (productId: string) => {
    setLeftProducts(prev => prev.filter((p: Product) => p.id !== productId))
    setRightProducts(prev => prev.filter((p: Product) => p.id !== productId))
  }
  const handleEditProduct = (product: Product) => {
    // Just set the editing product, form will render inline
    setEditingProduct(product)
    // Mark form visibility for the appropriate section (used for "Add" button logic)
    if (product.display_section === 'left') {
      setShowLeftForm(true)
    } else {
      setShowRightForm(true)
    }

    // Scroll the edited product into view after a short delay
    setTimeout(() => {
      const productElement = document.getElementById(`intrests-${product.id}`)
      if (productElement) {
        productElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
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
          const typedProducts = products as Product[];
          const leftProds = typedProducts.filter((p) => p.display_section === 'left')
          const rightProds = typedProducts.filter((p) => p.display_section === 'right')
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
      {/* Use the ProfileHeader component with tag filter */}
      <ProfileHeader
        userId={userId}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        onToggleTagsView={handleToggleTagsView}
        isTagsViewActive={isTagsViewActive}
      />      {/* Content container with grid sections */}
      <div className="max-w-7xl mx-auto px-4">
        {isTagsViewActive ? (
          /* Tag-grouped view */
          <div className="animate-fadeIn mt-4">
            <TagGroupedInterests
              groupedProducts={groupedByTagProducts}
              isOwner={isOwner}
              onDelete={handleDeleteProduct}
              onEdit={handleEditProduct}
              onTagClick={handleTagClick}
              onImageUpdate={handleImageUpdate}
              tagFilter={tagFilter}
            />
          </div>
        ) : (
          /* Standard view with two columns */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative animate-fadeIn mt-4">
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

                {/* Show add button only for profile owner */}
                {isOwner && (<button
                  type="button"
                  onClick={() => {
                    setEditingProduct(undefined) // Clear any editing state
                    setShowLeftForm(true) // Show the Add form at the top
                  }}
                  className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#2daa4f] rounded-md hover:bg-[#249c47] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span className="sm:hidden">Добавить</span>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
                )}            </div>

              {/* Show Add Form for owner when adding a new product (not editing) */}
              {isOwner && showLeftForm && !editingProduct && currentUserId && (
                <div className="mb-6 animate-slideDown">
                  <ProductForm
                    userId={currentUserId}
                    section="left"
                    onComplete={handleFormComplete}
                    onCancel={() => {
                      setShowLeftForm(false)
                      setEditingProduct(undefined)
                    }}
                  />
                </div>
              )}<div className="space-y-4">
                {filteredLeftProducts.length > 0 ? (
                  filteredLeftProducts.map(product => (isOwner && editingProduct?.id === product.id && editingProduct.display_section === 'left' ? (
                    <div key={product.id} className="animate-fadeIn bg-white p-4 rounded-lg shadow-md border-2 border-green-400">
                      <ProductForm
                        userId={currentUserId!}
                        product={editingProduct}
                        section="left"
                        onComplete={handleFormComplete}
                        onCancel={() => {
                          setShowLeftForm(false)
                          setEditingProduct(undefined)
                        }}
                      />
                    </div>
                  ) : isOwner ? (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onDelete={handleDeleteProduct}
                      onEdit={handleEditProduct}
                      onTagClick={handleTagClick}
                      onImageUpdate={handleImageUpdate}
                    />
                  ) : (
                    <ReadOnlyProductCard
                      key={product.id}
                      product={product}
                      onTagClick={handleTagClick}
                    />
                  )
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500 animate-pulse">
                    {tagFilter ? 'Ни один интерес не соответствует вашему фильтру.' : isOwner ? 'Нет интересов в Нравится. Добавьте свой первый интерес!' : 'Нет интересов в разделе "Нравится".'}
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

                {/* Show add button only for profile owner */}
                {isOwner && (<button
                  type="button"
                  onClick={() => {
                    setEditingProduct(undefined) // Clear any editing state
                    setShowRightForm(true) // Show the Add form at the top
                  }}
                  className="cursor-pointer px-2 py-1 text-xs sm:text-sm text-white bg-[#f05d4d] rounded-md hover:bg-[#e04d3e] transition-colors duration-200 whitespace-nowrap transform hover:scale-105 transition-transform duration-300 flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  <span className="sm:hidden">Добавить</span>
                  <span className="hidden sm:inline">Добавить</span>
                </button>
                )}            </div>

              {/* Show Add Form for owner when adding a new product (not editing) */}
              {isOwner && showRightForm && !editingProduct && currentUserId && (
                <div className="mb-6 animate-slideDown">
                  <ProductForm
                    userId={currentUserId}
                    section="right"
                    onComplete={handleFormComplete}
                    onCancel={() => {
                      setShowRightForm(false)
                      setEditingProduct(undefined)
                    }}
                  />
                </div>
              )}<div className="space-y-4">
                {filteredRightProducts.length > 0 ? (
                  filteredRightProducts.map(product => (isOwner && editingProduct?.id === product.id && editingProduct.display_section === 'right' ? (
                    <div key={product.id} className="animate-fadeIn bg-white p-4 rounded-lg shadow-md border-2 border-red-400">
                      <ProductForm
                        userId={currentUserId!}
                        product={editingProduct}
                        section="right"
                        onComplete={handleFormComplete}
                        onCancel={() => {
                          setShowRightForm(false)
                          setEditingProduct(undefined)
                        }}
                      />
                    </div>
                  ) : isOwner ? (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onDelete={handleDeleteProduct}
                      onEdit={handleEditProduct}
                      onTagClick={handleTagClick}
                      onImageUpdate={handleImageUpdate}
                    />
                  ) : (
                    <ReadOnlyProductCard
                      key={product.id}
                      product={product}
                      onTagClick={handleTagClick}
                    />
                  )
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500 animate-pulse">
                    {tagFilter ? 'Ни один интерес не соответствует вашему фильтру.' : isOwner ? 'Нет интересов в Не Нравится. Добавьте свой первый интерес!' : 'Нет интересов в разделе "Не Нравится".'}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}