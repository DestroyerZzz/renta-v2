'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import SupabaseImage from '../ui/SupabaseImage'
import ProductSuggestionBox, { SuggestionProductData } from '../suggestions/ProductSuggestionBox'
import { Save, X, Lock, AlertCircle, Loader2 } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']

interface ProductFormProps {
  userId: string
  product?: Product
  section: 'left' | 'right'
  onComplete: () => void
  onCancel: () => void
}

export default function ProductForm({ userId, product, section, onComplete, onCancel }: ProductFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTitleChecking, setIsTitleChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSuggestionSelected, setIsSuggestionSelected] = useState(false)
  const [isSuggestionImage, setIsSuggestionImage] = useState(false)
  const [hasDuplicateTitle, setHasDuplicateTitle] = useState(false)
  
  const supabase = createClient()
  const isEditing = !!product
  
  useEffect(() => {
    if (product) {
      setTitle(product.title || '')
      setDescription(product.description || '')
      setTag(product.tag || '')
      if (product.image_url) {
        setImagePreview(product.image_url)
      }
    }
  }, [product])
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSuggestionSelect = (suggestion: SuggestionProductData) => {
    setTitle(suggestion.title)
    
    if (suggestion.description) setDescription(suggestion.description)
    if (suggestion.tag) setTag(suggestion.tag)
    
    // Set the image from the suggestion if available
    if (suggestion.image_url) {
      setImagePreview(suggestion.image_url)
      setIsSuggestionImage(true)
    }
    
    setTitleError(null) 
    setHasDuplicateTitle(false)
    setIsSuggestionSelected(true)
  }
  
  // Simple function to check if title exists
  const checkTitleExists = async (titleToCheck: string): Promise<boolean> => {
    if (!titleToCheck || !titleToCheck.trim()) return false
    
    try {
      // Don't count the current product being edited as a duplicate
      let query = supabase
        .from('products')
        .select('id')
        .ilike('title', titleToCheck.trim())
      
      if (isEditing && product?.id) {
        query = query.neq('id', product.id)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      return !!(data && data.length > 0)
    } catch (err) {
      console.error('Error checking for duplicate titles:', err)
      return false
    }
  }
  
  // Toggle suggestion lock state
  const toggleSuggestionLock = async () => {
    if (isSuggestionSelected) {
      setIsSuggestionSelected(false)
      setIsSuggestionImage(false)
      
      // Check if the title exists when unlocking
      if (title.trim()) {
        setIsTitleChecking(true)
        const isDuplicate = await checkTitleExists(title)
        setIsTitleChecking(false)
        
        if (isDuplicate) {
          setTitleError('Продукт с таким названием уже существует')
          setHasDuplicateTitle(true)
        } else {
          setTitleError(null)
          setHasDuplicateTitle(false)
        }
      }
    } else {
      setIsSuggestionSelected(true)
    }
  }
  
  // Validate title on blur
  const handleTitleBlur = async () => {
    if (isSuggestionSelected || !title.trim()) return
    
    setIsTitleChecking(true)
    const isDuplicate = await checkTitleExists(title)
    setIsTitleChecking(false)
    
    if (isDuplicate) {
      setTitleError('Продукт с таким названием уже существует')
      setHasDuplicateTitle(true)
    } else {
      setTitleError(null)
      setHasDuplicateTitle(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Пожалуйста, введите название продукта')
      return
    }
    
    // Prevent submission if there's already a title error
    if (hasDuplicateTitle || titleError) {
      setError('Продукт с таким названием уже существует. Пожалуйста, выберите другое название или используйте предложение из списка.')
      return
    }
    
    // Final validation before submission
    setIsTitleChecking(true)
    const isDuplicate = await checkTitleExists(title)
    setIsTitleChecking(false)
    
    if (isDuplicate) {
      setTitleError('Продукт с таким названием уже существует')
      setHasDuplicateTitle(true)
      setError('Продукт с таким названием уже существует. Пожалуйста, выберите другое название или используйте предложение из списка.')
      return
    }
    
    // If we got to this point, the title is not a duplicate
    setIsLoading(true)
    setError(null)
    
    try {
      let imageUrl = product?.image_url || null
      
      // Handle image from suggestion
      if (isSuggestionImage && imagePreview) {
        imageUrl = imagePreview
      }
      // Handle image upload if there's a new image
      else if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `${userId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('product_images')
          .upload(filePath, image)
          
        if (uploadError) {
          throw new Error(`Error uploading image: ${uploadError.message}`)
        }
        
        const { data } = supabase.storage.from('product_images').getPublicUrl(filePath)
        imageUrl = data.publicUrl
        
        // Delete old image if updating and there was a previous image
        if (isEditing && product?.image_url) {
          const oldImagePath = new URL(product.image_url).pathname.split('/').pop()
          if (oldImagePath) {
            await supabase.storage.from('product_images').remove([`${userId}/${oldImagePath}`])
          }
        }
      }
      
      const productData: ProductInsert = {
        user_id: userId,
        title,
        description,
        tag,
        image_url: imageUrl,
        display_section: section
      }
      
      if (isEditing) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          
        if (updateError) throw new Error(`Error updating product: ${updateError.message}`)
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData)
          
        if (insertError) throw new Error(`Error creating product: ${insertError.message}`)
      }
      
      onComplete()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Error saving product:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-black">
        {isEditing ? 'Изменить продукт' : 'Добавить новый продукт'}
      </h2>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Title section */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="title" className="block text-sm font-medium text-black">
              названия
            </label>
            
            {isSuggestionSelected && (
              <button
                type="button"
                onClick={toggleSuggestionLock}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
              >
                <Lock size={14} />
                <span>Разблокировать поля</span>
              </button>
            )}
          </div>
          
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              if (!isSuggestionSelected) {
                setTitle(e.target.value)
              }
            }}
            onBlur={handleTitleBlur}
            required
            disabled={isSuggestionSelected}
            className={`w-full text-black px-3 py-2 border ${titleError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              isSuggestionSelected ? 'bg-gray-100 cursor-not-allowed hover:cursor-not-allowed' : ''
            }`}
            placeholder="Введите названия продукта"
          />
          
          {titleError && (
            <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} />
              <span>{titleError}</span>
            </div>
          )}

          {isTitleChecking && (
            <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" />
              <span>Проверка названия...</span>
            </div>
          )}
          
          {!isEditing && !isSuggestionSelected && (
            <ProductSuggestionBox 
              inputValue={title} 
              onSelectSuggestion={handleSuggestionSelect}
              excludeUserId={userId}
            />
          )}
        </div>
        
        {/* Description section */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-black mb-1">
            Описание
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Опишите ваш продукт"
          />
        </div>
        
        {/* Tag section */}
        <div className="mb-6">
          <label htmlFor="tag" className="block text-sm font-medium text-black mb-1">
            теги
          </label>
          <input
            id="tag"
            type="text"
            value={tag}
            onChange={(e) => {
              if (!isSuggestionSelected) {
                setTag(e.target.value)
              }
            }}
            disabled={isSuggestionSelected}
            className={`w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              isSuggestionSelected ? 'bg-gray-100 cursor-not-allowed hover:cursor-not-allowed' : ''
            }`}
            placeholder="Добавить тег (необязательно)"
          />
        </div>
        
        {/* Image section */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="product-image" className="block text-sm font-medium text-gray-700">
              Изображение продукта
            </label>
            {isSuggestionImage && (
              <div className="text-xs text-indigo-600">
                <span className="flex items-center gap-1">
                  <Lock size={14} />
                  Изображение из каталога
                </span>
              </div>
            )}
          </div>
          {imagePreview && (
            <div className="relative h-48 mb-2 border rounded-md overflow-hidden">
              <SupabaseImage
                src={imagePreview}
                alt="Product preview"
                fill
                className="object-contain"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <p className="text-gray-500">Предварительный просмотр недоступен</p>
                  </div>
                }
              />
            </div>
          )}
          <input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            aria-label="Выберите изображение продукта"
            disabled={isSuggestionImage}
            className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 ${
              isSuggestionImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          />
        </div>
        
        {/* Button section */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center space-x-2"
          >
            <X size={16} />
            <span>Отмена</span>
          </button>
          <button
            type="submit"
            disabled={isLoading || hasDuplicateTitle || !!titleError || isTitleChecking}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEditing ? 'Обновить продукт' : 'Добавить продукт'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}