import { useState } from 'react'
import SupabaseImage from '@/components/ui/SupabaseImage'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import PostShareDialog from '@/components/ui/PostShareDialog'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Edit2, Trash2, MessageCircle, Share } from 'lucide-react'

export interface Post {
    id: string
    content: string
    image_url?: string | null
    created_at: string
    updated_at: string
    original_post_id?: string | null
    is_shared?: boolean | null
}

interface PostCardProps {
    post: Post
    isOwner: boolean
    onEdit?: (post: Post) => void
    onDelete?: (postId: string) => void
}

export default function PostCard({ post, isOwner, onEdit, onDelete }: PostCardProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showShareDialog, setShowShareDialog] = useState(false)

    const handleDelete = async () => {
        if (onDelete) {
            onDelete(post.id)
        }
        setShowDeleteDialog(false)
    }

    const handleShareClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowShareDialog(true);
    };

    // Format timestamp for better readability
    const formattedTime = post.updated_at !== post.created_at
        ? `Изменено ${formatDistanceToNow(new Date(post.updated_at), { addSuffix: true, locale: ru })}`
        : formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })

    // Determine if this is a shared post for display purposes
    const isSharedPost = Boolean(post.is_shared && post.original_post_id)

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            {/* Post content area */}
            <div className="p-6">
                {/* If this is a shared post, display differently */}
                {isSharedPost && (
                    <div className="mb-4 text-xs text-gray-500 flex items-center">
                        <Share size={14} className="mr-1 text-[#3d82f7]" />
                        <span>Поделился постом</span>
                    </div>
                )}

                {/* Post text content */}
                <div className="mb-4">
                    <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
                </div>

                {/* Post image if exists */}
                {post.image_url && (
                    <div className="mt-4 mb-2">
                        <div className="relative w-full rounded-lg overflow-hidden" style={{ maxHeight: '500px' }}>
                            <SupabaseImage
                                src={post.image_url}
                                alt="Post image"
                                className="object-contain w-full h-full"
                                fallback={
                                    <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                                        <span className="text-gray-400">Изображение недоступно</span>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Post metadata and actions footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-between items-center text-sm">
                <div className="flex items-center text-gray-500">
                    <MessageCircle size={16} className="mr-2 text-[#3d82f7] opacity-70" />
                    <span className="text-gray-600">{formattedTime}</span>
                </div>

                <div className="flex space-x-3">
                    {!isOwner && (
                        <button
                            onClick={handleShareClick}
                            className="cursor-pointer flex items-center text-gray-500 hover:text-[#3d82f7] transition-colors duration-200"
                            title="Поделиться постом"
                        >
                            <Share size={16} className="mr-1" />
                            <span className="hidden sm:inline">Поделиться</span>
                        </button>
                    )}

                    {isOwner && (
                        <>
                            <button
                                onClick={() => onEdit?.(post)}
                                className="cursor-pointer flex items-center text-gray-500 hover:text-[#2daa4f] transition-colors duration-200"
                                title="Редактировать пост"
                            >
                                <Edit2 size={16} className="mr-1" />
                                <span className="hidden sm:inline">Редактировать</span>
                            </button>
                            <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="cursor-pointer flex items-center text-gray-500 hover:text-red-500 transition-colors duration-200"
                                title="Удалить пост"
                            >
                                <Trash2 size={16} className="mr-1" />
                                <span className="hidden sm:inline">Удалить</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <ConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="Удалить пост?"
                message="Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить."
                confirmText="Удалить"
                cancelText="Отмена"
            />

            {/* Share dialog */}
            {showShareDialog && (
                <PostShareDialog
                    isOpen={showShareDialog}
                    onClose={() => setShowShareDialog(false)}
                    postId={post.id}
                    postContent={post.content}
                    postImageUrl={post.image_url}
                />
            )}
        </div>
    )
}