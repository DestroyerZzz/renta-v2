'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { useParams, useRouter } from 'next/navigation'
// Import Post interface from PostCard component to avoid type conflicts
import PostCard, { Post } from '@/components/posts/PostCard'
import PostForm from '@/components/posts/PostForm'
import { PlusCircle, MessageSquare } from 'lucide-react'
import ProfileHeader from '@/components/profile/ProfileHeader'

// Define interface for database posts which has user_id
interface DatabasePost {
    id: string
    created_at: string
    updated_at: string
    user_id: string
    content: string
    image_url?: string | null
    original_post_id?: string | null
    is_shared?: boolean | null
}

export default function PostsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [posts, setPosts] = useState<Post[]>([])
    const [isOwner, setIsOwner] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingPost, setEditingPost] = useState<Post | null>(null)
    const [actualUserId, setActualUserId] = useState<string | null>(null)
    const [notFound, setNotFound] = useState(false)
    const params = useParams()
    const router = useRouter()
    const profileIdentifier = params.userId as string
    const supabase = createClient()

    useEffect(() => {
        const resolveProfileIdentifier = async () => {
            try {
                // First try to find profile by username
                const { data: profileByUsername } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', profileIdentifier)
                    .maybeSingle()

                if (profileByUsername) {
                    setActualUserId(profileByUsername.id)
                    return
                }

                // If not found by username, try to find by user ID
                const { data: profileById } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .eq('id', profileIdentifier)
                    .maybeSingle()

                if (profileById) {
                    // If user has a username, redirect to the username-based URL
                    if (profileById.username && profileById.username !== profileIdentifier) {
                        router.replace(`/profile/${profileById.username}/posts`)
                        return
                    }
                    setActualUserId(profileById.id)
                    return
                }

                // If we reach here, no profile was found
                setNotFound(true)
            } catch (error) {
                console.error('Error resolving profile identifier:', error)
                setNotFound(true)
            }
        }

        if (profileIdentifier) {
            resolveProfileIdentifier()
        }
    }, [profileIdentifier, supabase, router])

    // Load posts and check ownership once we have the actual user ID
    useEffect(() => {
        async function loadUserAndPosts() {
            if (!actualUserId) return

            try {
                // Check if current user is the profile owner
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setCurrentUserId(user.id)
                    setIsOwner(user.id === actualUserId)
                }

                // Load posts
                const { data: dbPosts, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('user_id', actualUserId)
                    .order('created_at', { ascending: false })

                if (error) throw error

                // Convert database posts to the format expected by PostCard
                const formattedPosts: Post[] = (dbPosts || []).map((post: DatabasePost) => ({
                    id: post.id,
                    content: post.content,
                    image_url: post.image_url,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    original_post_id: post.original_post_id,
                    is_shared: post.is_shared
                }));

                setPosts(formattedPosts)
            } catch (error) {
                console.error('Error loading posts:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadUserAndPosts()
    }, [supabase, actualUserId])

    const handleDelete = async (postId: string) => {
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)

            if (error) throw error

            setPosts(posts.filter(post => post.id !== postId))
        } catch (error) {
            console.error('Error deleting post:', error)
        }
    }

    const handleEdit = (post: Post) => {
        setEditingPost(post)
        setShowForm(true)
        // Scroll to the form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleComplete = async () => {
        try {
            if (!actualUserId) return

            setShowForm(false)
            setEditingPost(null)

            // Refresh posts list
            const { data: refreshedDbPosts, error } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', actualUserId)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Convert database posts to the format expected by PostCard
            const refreshedPosts: Post[] = (refreshedDbPosts || []).map((post: DatabasePost) => ({
                id: post.id,
                content: post.content,
                image_url: post.image_url,
                created_at: post.created_at,
                updated_at: post.updated_at,
                original_post_id: post.original_post_id,
                is_shared: post.is_shared
            }));

            setPosts(refreshedPosts)
        } catch (error) {
            console.error('Error refreshing posts:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-gray-600 animate-pulse">Загрузка...</div>
            </div>
        )
    }

    if (notFound) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Профиль не найден</h1>
                <p className="text-lg text-gray-600">
                    Пользователь с указанным идентификатором не существует.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            {actualUserId && <ProfileHeader userId={actualUserId} />}

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Page header with post count */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <MessageSquare className="w-6 h-6 text-[#3d82f7] mr-2" />
                        <h1 className="text-xl font-semibold text-gray-800">
                            {isOwner ? 'Мои посты' : 'Посты пользователя'}
                            {posts.length > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({posts.length})
                                </span>
                            )}
                        </h1>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => {
                                setEditingPost(null)
                                setShowForm(true)
                            }}
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-[#2d72e7] transition-colors duration-200 shadow-sm"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            <span>Новый пост</span>
                        </button>
                    )}
                </div>

                {/* Post form */}
                {showForm && isOwner && currentUserId && (
                    <div className="mb-6 animate-fadeIn">
                        <PostForm
                            userId={currentUserId}
                            initialData={editingPost ? { ...editingPost, user_id: currentUserId as string } : null}
                            onComplete={handleComplete}
                            onCancel={() => {
                                setShowForm(false)
                                setEditingPost(null)
                            }}
                        />
                    </div>
                )}

                {/* Posts list */}
                <div className="space-y-6">
                    {posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                isOwner={isOwner}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <div className="bg-white rounded-lg shadow-md p-10 text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">
                                {isOwner ? 'У вас пока нет постов' : 'У пользователя пока нет постов'}
                            </h3>
                            <p className="text-gray-500">
                                {isOwner ? 'Создайте свой первый пост, чтобы поделиться мыслями и идеями.' : 'Похоже, пользователь еще не опубликовал ни одного поста.'}
                            </p>
                            {isOwner && (
                                <button
                                    onClick={() => {
                                        setEditingPost(null)
                                        setShowForm(true)
                                    }}
                                    className="cursor-pointer mt-6 inline-flex items-center px-5 py-2 bg-[#3d82f7] text-white rounded-md hover:bg-[#2d72e7] transition-colors duration-200"
                                >
                                    <PlusCircle className="w-5 h-5 mr-2" />
                                    <span>Создать первый пост</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}