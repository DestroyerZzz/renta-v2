'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase'
import FeedItem from '@/components/feed/FeedItem'
import { Database } from '@/types/database'
import { RotateCw } from 'lucide-react'

type FeedProduct = Database['public']['Tables']['products']['Row'] & {
    profiles: {
        id: string
        full_name: string | null
        avatar_url: string | null
        username: string | null
    }
}

export default function FeedContent() {
    // State hooks
    const [products, setProducts] = useState<FeedProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMoreItems, setHasMoreItems] = useState(true)

    // Constants
    const itemsPerPage = 10

    // Hooks
    const supabase = createClient()

    useEffect(() => {
        fetchFeed()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchFeed = async () => {
        setIsLoading(true)
        setError(null)
        setPage(1)

        try {
            // First fetch products with descriptions
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('*')
                .not('description', 'is', null)
                .not('description', 'eq', '')
                .order('created_at', { ascending: false })
                .limit(itemsPerPage)

            if (productsError) {
                throw new Error(`Error fetching feed: ${productsError.message}`)
            }

            if (!products || products.length === 0) {
                setProducts([])
                setHasMoreItems(false)
                return
            }

            // Then fetch the associated profiles
            const userIds = products.map((product: Database['public']['Tables']['products']['Row']) => product.user_id)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', userIds)

            if (profilesError) {
                throw new Error(`Error fetching profiles: ${profilesError.message}`)
            }

            // Combine the products with their profiles
            const productsWithProfiles = products.map((product: Database['public']['Tables']['products']['Row']) => {
                const profile = profiles?.find((p: { id: string; username: string | null; full_name: string | null; avatar_url: string | null }) => p.id === product.user_id) || null
                return {
                    ...product,
                    profiles: profile
                }
            })
            // Update state with combined data
            setProducts(productsWithProfiles as FeedProduct[])
            setHasMoreItems(products.length === itemsPerPage)
        } catch (err) {
            console.error('Error in fetchFeed:', err)
            setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке ленты')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = async () => {
        fetchFeed()
    }

    // Function to load more items
    const loadMoreItems = async () => {
        if (isLoading) return

        setIsLoading(true)
        try {
            // First fetch the next page of products with descriptions
            const { data: moreProducts, error: productsError } = await supabase
                .from('products')
                .select('*')
                .not('description', 'is', null)
                .not('description', 'eq', '')
                .order('created_at', { ascending: false })
                .range(page * itemsPerPage, (page + 1) * itemsPerPage - 1)

            if (productsError) {
                throw new Error(`Error loading more items: ${productsError.message}`)
            }

            if (!moreProducts || moreProducts.length === 0) {
                setHasMoreItems(false)
                return
            }

            // Then fetch the associated profiles
            const userIds = moreProducts.map((product: Database['public']['Tables']['products']['Row']) => product.user_id)
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', userIds)

            if (profilesError) {
                throw new Error(`Error fetching profiles: ${profilesError.message}`)
            }

            // Combine the products with their profiles
            const productsWithProfiles = moreProducts.map((product: Database['public']['Tables']['products']['Row']) => {
                const profile = profiles?.find((p: { id: string; username: string | null; full_name: string | null; avatar_url: string | null }) => p.id === product.user_id) || null
                return {
                    ...product,
                    profiles: profile
                }
            })

            // Update state with combined data
            setProducts([...products, ...(productsWithProfiles as FeedProduct[])])
            setPage(page + 1)

            // Update hasMoreItems flag based on whether we got a full page of results
            setHasMoreItems(moreProducts.length === itemsPerPage)
        } catch (err) {
            console.error('Error in loadMoreItems:', err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading && products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin mb-4">
                    <RotateCw className="h-8 w-8 text-[#3d82f7]" />
                </div>
                <p className="text-gray-500">Загрузка интересов...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
                    <p>{error}</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-[#2d6ce0] transition-colors duration-300 flex items-center gap-2"
                >
                    <RotateCw className="h-4 w-4" /> Попробовать снова
                </button>
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 mb-4">Пока нет интересов для отображения</p>
                {/* <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-[#2d6ce0] transition-colors duration-300 flex items-center gap-2 mx-auto"
                >
                    <RotateCw className="h-4 w-4" /> Обновить
                </button> */}
            </div>
        )
    }

    return (
        <div>
            {/* <div className="flex justify-end mb-4">
                <button
                    onClick={handleRefresh}
                    className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${isLoading ? 'bg-gray-100 text-gray-400' : 'bg-[#3d82f7] text-white hover:bg-[#2d6ce0]'} transition-colors duration-300`}
                    disabled={isLoading}
                >
                    <RotateCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Обновить</span>
                </button>
            </div> */}

            <div className="space-y-6">
                {products.map(product => (
                    <FeedItem key={product.id} product={product} />
                ))}
            </div>

            {/* "Load more" button */}
            {hasMoreItems && (
                <div className="mt-8 text-center">
                    <button
                        onClick={loadMoreItems}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${isLoading
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            } transition-colors duration-300`}
                    >
                        {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
                    </button>
                </div>
            )}
        </div>
    )
}
