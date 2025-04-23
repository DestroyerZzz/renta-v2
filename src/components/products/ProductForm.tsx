'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import SupabaseImage from '../ui/SupabaseImage'
import ProductSuggestionBox, { SuggestionProductData } from '../suggestions/ProductSuggestionBox'
import { Save, X, AlertCircle, Loader2, RefreshCw, Lock, Info } from 'lucide-react'

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
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productFromDb, setProductFromDb] = useState<SuggestionProductData | null>(null)
  const [lockedFields, setLockedFields] = useState({
    tag: false,
    image: false
  })
  
  // Refs for input elements to control focus
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  
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
      // Only allow image changes if fields are not locked
      if (!lockedFields.image) {
        setImage(file)
        
        // Create preview
        const reader = new FileReader()
        reader.onload = () => {
          setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    // If title changes at all, clear the fields since we need an exact match
    if (productFromDb) {
      resetAutofilledData()
    }
  }
  
  const resetAutofilledData = () => {
    // Don't clear fields when editing an existing product
    if (isEditing) return
    
    // Only reset fields that were autofilled from database
    if (productFromDb) {
      // Clear description only if it matches the database value
      if (description === productFromDb.description) {
        setDescription('')
      }
      // Reset image if it was from the database
      if (imagePreview === productFromDb.image_url) {
        setImagePreview(null)
        setImage(null)
      }
      // Reset tag if it was from the database
      if (tag === productFromDb.tag) {
        setTag('')
      }
      
      // Unlock fields
      setLockedFields({
        tag: false,
        image: false
      })
      
      // Clear the database product reference
      setProductFromDb(null)
    }
  }
  
  const handleMatchFound = (suggestionData: SuggestionProductData | null, isSearching: boolean) => {
    setIsSearchingSuggestions(isSearching)
    
    if (!isSearching) {
      // Clear any previous match if no suggestion data returned
      if (!suggestionData) {
        if (productFromDb) {
          resetAutofilledData()
        }
        return
      }
      
      // If we have a suggestion and we're not in editing mode, autofill
      if (suggestionData && !isEditing) {
        // Store the database product for reference
        setProductFromDb(suggestionData)
        
        // Auto-fill the fields
        if (suggestionData.description) {
          setDescription(suggestionData.description)
        }
        
        if (suggestionData.tag) {
          setTag(suggestionData.tag)
        }
        
        if (suggestionData.image_url) {
          setImagePreview(suggestionData.image_url)
        }
        
        // If this suggestion is from the database, lock fields
        if (suggestionData.isFromDatabase) {
          setLockedFields({
            tag: !!suggestionData.tag,
            image: !!suggestionData.image_url
          })
        }
        
        // Removed auto-focus to description field
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Пожалуйста, введите название продукта')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      let imageUrl = product?.image_url || null
      
      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${userId}/${uuidv4()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('product_images')
          .upload(fileName, image)
          
        if (uploadError) {
          throw new Error(`Error uploading image: ${uploadError.message}`)
        }
        
        const { data } = supabase.storage.from('product_images').getPublicUrl(fileName)
        imageUrl = data.publicUrl
        
        // Delete old image if updating
        if (isEditing && product?.image_url) {
          const oldImagePath = product.image_url.split('/').pop()
          if (oldImagePath) {
            try {
              await supabase.storage.from('product_images').remove([`${userId}/${oldImagePath}`])
            } catch (deleteError) {
              // Log but don't fail if old image deletion fails
              console.error('Error deleting old image:', deleteError)
            }
          }
        }
      } else if (imagePreview && imagePreview !== product?.image_url) {
        imageUrl = imagePreview
      }
      
      const productData: ProductInsert = {
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim(),
        image_url: imageUrl,
        display_section: section
      }
      
      if (isEditing && product?.id) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)
          
        if (updateError) throw new Error(`Error updating product: ${updateError.message}`)
      } else {
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
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Title section */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="title" className="block text-sm font-medium text-black">
              названия
            </label>
            {isSearchingSuggestions && (
              <span className="text-xs text-indigo-600 flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                Поиск совпадений...
              </span>
            )}
          </div>
          
          <div className="relative">
            <input
              id="title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              required
              ref={titleInputRef}
              placeholder="Введите названия продукта"
              className={`w-full text-black px-3 py-2 border ${
                productFromDb ? 'border-indigo-300' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                isSearchingSuggestions ? 'bg-gray-50' : ''
              }`}
            />
            
            {isSearchingSuggestions && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 size={16} className="text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          
          {productFromDb && (
            <div className="mt-1 text-xs text-indigo-600 flex items-center gap-1">
              <Info size={12} />
              <span>автоматически заполнена</span>
            </div>
          )}
          
          {!isEditing && (
            <ProductSuggestionBox 
              inputValue={title} 
              onFindMatch={handleMatchFound}
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
            ref={descriptionInputRef}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
            rows={3}
            className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Опишите ваш продукт"
          />
        </div>
        
        {/* Tag section */}
        <div className="mb-6">
          <label htmlFor="tag" className="block text-sm font-medium text-black mb-1 flex items-center gap-2">
            <span>теги</span>
            {lockedFields.tag && (
              <Lock size={14} className="text-indigo-500" />
            )}
          </label>
          <input
            id="tag"
            type="text"
            value={tag}
            onChange={(e) => {
              if (!lockedFields.tag) {
                setTag(e.target.value)
              }
            }}
            disabled={lockedFields.tag}
            className={`w-full text-black px-3 py-2 border ${
              lockedFields.tag ? 'bg-gray-50 border-indigo-200 cursor-not-allowed' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none ${
              !lockedFields.tag ? 'focus:ring-indigo-500 focus:border-indigo-500' : ''
            }`}
            placeholder="Добавить тег (необязательно)"
          />
          {lockedFields.tag && (
            <p className="mt-1 text-xs text-gray-500">
              автоматически заполнена
            </p>
          )}
        </div>
        
        {/* Image section */}
        <div className="mb-4 relative">
          <label htmlFor="product-image" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <span>Изображение продукта</span>
            {lockedFields.image && (
              <Lock size={14} className="text-indigo-500"  />
            )}
          </label>
          {imagePreview && (
            <div className={`relative h-48 mb-2 border rounded-md overflow-hidden ${
              lockedFields.image ? 'border-indigo-200' : 'border-gray-300'
            }`}>
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
              {productFromDb && productFromDb.image_url === imagePreview && (
                <div className="absolute top-2 right-2">
                  <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-md">
                    Из базы данных
                  </span>
                </div>
              )}
            </div>
          )}
          <input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={lockedFields.image}
            aria-label="Выберите изображение продукта"
            className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium ${
              lockedFields.image 
              ? 'file:bg-gray-100 file:text-gray-400 cursor-not-allowed opacity-75' 
              : 'file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer'
            }`}
          />
          {lockedFields.image && (
            <p className="mt-1 text-xs text-gray-500">
              автоматически заполнена
            </p>
          )}
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
            disabled={isLoading || isSearchingSuggestions}
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