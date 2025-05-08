'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Share } from 'lucide-react'
import { createClient } from '@/utils/supabase'
import toast from 'react-hot-toast'

interface PostShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    postContent: string;
    postImageUrl?: string | null;
}

export default function PostShareDialog({
    isOpen,
    onClose,
    postId,
    postContent,
    postImageUrl,
}: PostShareDialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    // Close on ESC key press
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            // Restore body scroll
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Close on overlay click
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };

    const handleShare = async () => {
        try {
            setIsSubmitting(true);
            setError('');

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) {
                toast.error(
                    <div className="flex flex-col">
                        <span className="font-medium">Необходимо войти в систему</span>
                        <span className="text-sm">Войдите, чтобы поделиться постом</span>
                        <button
                            type="button"
                            className="mt-2 px-4 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
                            onClick={() => {
                                window.location.href = '/login';
                            }}
                        >
                            Перейти к странице входа
                        </button>
                    </div>,
                    { duration: 5000 }
                );
                return;
            }

            // Check if user already shared this post
            const { data: existingShares, error: checkError } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', user.id)
                .eq('original_post_id', postId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected if post isn't shared yet
                throw checkError;
            }

            if (existingShares) {
                toast.error(
                    <div className="flex items-start">
                        <div>
                            <span className="font-medium">Вы уже поделились этим постом</span>
                            <p className="text-sm mt-1">
                                Вы не можете поделиться одним и тем же постом дважды.
                            </p>
                        </div>
                    </div>,
                    { duration: 5000 }
                );
                return;
            }

            // Create a shared post with user's custom description
            const { error: insertError } = await supabase
                .from('posts')
                .insert({
                    user_id: user.id,
                    content: description.trim() || postContent.trim(), // Use user's description or original content if no description
                    image_url: postImageUrl,
                    original_post_id: postId,
                    is_shared: true
                });

            if (insertError) {
                throw insertError;
            }

            toast.success('Пост успешно опубликован в вашем профиле!');
            onClose();
        } catch (error) {
            console.error('Error sharing post:', error);
            setError(error instanceof Error ? error.message : 'Произошла ошибка при публикации поста');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const dialog = (
        <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4 backdrop-blur-[2px]"
            ref={overlayRef}
            onClick={handleOverlayClick}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-white w-full max-w-md rounded-lg shadow-xl transform transition-all duration-300 scale-100 opacity-100 will-change-transform"
            >
                <div className="p-6">
                    <div className="flex items-center mb-3">
                        <Share className="h-5 w-5 text-[#3d82f7] mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">
                            Поделиться постом
                        </h3>
                    </div>

                    {/* Original post preview */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{postContent}</p>
                    </div>

                    {/* Description textarea */}
                    <div className="mb-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Ваше описание
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#3d82f7] focus:border-[#3d82f7] text-sm"
                            placeholder="Опишите пост своими словами"
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mb-4">
                        После публикации пост появится на вашей странице в разделе постов.
                        {!description.trim() && " Если вы не укажете свое описание, будет использовано оригинальное содержание поста."}
                    </p>
                </div>

                <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
                    >
                        <X className="h-4 w-4" />
                        <span>Отмена</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        disabled={isSubmitting}
                        className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#3d82f7] border border-transparent rounded-md hover:bg-[#2d6ce0] disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
                    >
                        {isSubmitting ? (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <Share className="h-4 w-4" />
                        )}
                        <span>Поделиться</span>
                    </button>
                </div>
            </div>
        </div>
    );

    // Render the dialog at the root level
    return createPortal(dialog, document.body);
}