import { useState, useRef, ChangeEvent } from 'react'
import { createClient } from '@/utils/supabase'
import { Image as ImageIcon, X, Send } from 'lucide-react'

interface Post {
    id: string
    content: string
    image_url?: string | null
    created_at: string
    updated_at: string
    user_id: string
}

interface PostFormProps {
    userId?: string
    initialData?: Post | null
    onComplete: () => void
    onCancel: () => void
}

export default function PostForm({ userId, initialData, onComplete, onCancel }: PostFormProps) {
    const [content, setContent] = useState(initialData?.content || '')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imageUrl, setImageUrl] = useState(initialData?.image_url || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Размер изображения не должен превышать 5MB')
                return
            }
            setImageFile(file)
            setImageUrl(URL.createObjectURL(file))
            setError('')
        }
    }

    const handleRemoveImage = () => {
        setImageFile(null)
        setImageUrl('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        setIsSubmitting(true)
        setError('')

        try {
            // Get current authenticated user if userId not provided
            if (!userId) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Пожалуйста, войдите в систему, чтобы создать пост')
                userId = user.id
            }

            let finalImageUrl = imageUrl

            // Handle image upload if there's a new image
            if (imageFile) {
                const timestamp = Date.now()
                const fileName = `${userId}/${timestamp}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

                const { error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(fileName, imageFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fileName)

                finalImageUrl = publicUrl
            }

            // Update or create post
            if (initialData) {
                const { error: updateError } = await supabase
                    .from('posts')
                    .update({
                        content,
                        image_url: finalImageUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', initialData.id)

                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabase
                    .from('posts')
                    .insert({
                        user_id: userId,
                        content,
                        image_url: finalImageUrl
                    })

                if (insertError) throw insertError
            }

            onComplete()
        } catch (error: unknown) {
            console.error('Error saving post:', error)
            setError(error instanceof Error ? error.message : 'An unknown error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-800">
                    {initialData ? 'Редактировать пост' : 'Создать новый пост'}
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
                {/* Content input */}
                <div className="mb-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Что у вас нового?"
                        className="text-gray-800 w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#3d82f7] focus:border-transparent transition-all resize-none"
                        required
                    />
                </div>

                {/* Image preview if selected */}
                {imageUrl && (
                    <div className="relative mb-4 border border-gray-200 rounded-lg p-2 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-3 right-3 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-1 transition-colors duration-200"
                            title="Удалить изображение"
                        >
                            <X size={16} />
                        </button>
                        <div className="relative w-full rounded-lg overflow-hidden" style={{ maxHeight: '300px' }}>
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="max-w-full max-h-[300px] mx-auto object-contain"
                            />
                        </div>
                    </div>
                )}

                {/* Error message if any */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between mt-4">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer flex items-center text-gray-600 hover:text-[#3d82f7] transition-colors duration-200"
                    >
                        <ImageIcon size={20} className="mr-2" />
                        <span>Добавить изображение</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        aria-label="Загрузить изображение"
                        title="Загрузить изображение"
                    />

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors duration-200"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !content.trim()}
                            className="cursor-pointer px-4 py-2 bg-[#3d82f7] hover:bg-[#2d72e7] text-white rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Сохранение...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <Send size={16} className="mr-2" />
                                    {initialData ? 'Сохранить' : 'Опубликовать'}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}