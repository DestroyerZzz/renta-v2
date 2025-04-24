'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'
import SupabaseImage from '../ui/SupabaseImage'
import ProductSuggestionBox, { SuggestionProductData } from '../suggestions/ProductSuggestionBox'
import { Save, X, AlertCircle, Loader2, RefreshCw, Lock, Info, Hash, Trash2 } from 'lucide-react'
import { DEFAULT_TAG } from './ProductCard'
import { toast } from 'react-hot-toast'
import ConfirmationDialog from '../ui/ConfirmationDialog'

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
  const [tagWithoutHash, setTagWithoutHash] = useState('') // Store tag without hash for display
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
  
  // States for product deletion functionality
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null)
  
  // Refs for input elements to control focus
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  
  const supabase = createClient()
  const isEditing = !!product
  
  useEffect(() => {
    if (product) {
      setTitle(product.title || '')
      setDescription(product.description || '')
      
      // Handle tag with or without hash symbol
      if (product.tag) {
        setTag(product.tag)
        setTagWithoutHash(product.tag.startsWith('#') ? product.tag.substring(1) : product.tag)
      }
      
      if (product.image_url) {
        setImagePreview(product.image_url)
      }
    }
  }, [product])

  // Handle tag changes - strip # if user adds it
  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!lockedFields.tag) {
      const value = e.target.value
      
      // Remove # symbol if user types it
      const cleanTag = value.startsWith('#') ? value.substring(1) : value
      setTagWithoutHash(cleanTag)
      
      // Store the tag value - we'll add the # only during submission
      // Don't add # here to prevent duplicates
      setTag(cleanTag)
    }
  }
  
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
        setTagWithoutHash('')
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
  
  // Check if product exists in the other display section
  const checkProductExistsInOtherSection = async (productTitle: string): Promise<{ exists: boolean, product?: Product }> => {
    // Determine which section to check
    const otherSection = section === 'left' ? 'right' : 'left'
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')  // Select all fields to get complete product data
        .eq('user_id', userId)
        .eq('display_section', otherSection)
        .ilike('title', productTitle.trim())
        .limit(1)
        
      if (error) {
        throw error
      }
      
      // If we found a product with the same title in the other section
      return { 
        exists: data && data.length > 0,
        product: data && data.length > 0 ? data[0] : undefined
      }
    } catch (err) {
      console.error('Error checking for duplicate products:', err)
      // In case of error, allow submission (fail safe)
      return { exists: false }
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
          // Handle tag with or without hash for display
          setTagWithoutHash(suggestionData.tag.startsWith('#') ? suggestionData.tag.substring(1) : suggestionData.tag)
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

  // Handle showing the delete confirmation dialog for a duplicate product
  const handleDeleteClick = (product: Product) => {
    setDuplicateProduct(product)
    setShowDeleteConfirm(true)
    // Dismiss any active toasts when showing the confirmation dialog
    toast.dismiss()
  }
  
  // Handle confirming product deletion
  const handleDeleteConfirm = async () => {
    if (!duplicateProduct) return
    
    setIsDeleting(true)
    try {
      // Delete the product image if it exists
      if (duplicateProduct.image_url) {
        const imagePath = duplicateProduct.image_url.split('/').pop()
        if (imagePath) {
          try {
            await supabase.storage
              .from('product_images')
              .remove([`${userId}/${imagePath}`])
          } catch (error) {
            console.error('Error deleting product image:', error)
            // Continue with product deletion even if image deletion fails
          }
        }
      }
      
      // Delete the product from the database
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', duplicateProduct.id)
      
      if (deleteError) throw deleteError
      
      // Show success notification
      toast.success('Продукт успешно удален')
      
      // Refresh form to continue adding the new product
      setIsLoading(false)
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Ошибка при удалении продукта')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDuplicateProduct(null)
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
      // Skip duplicate check when editing existing product
      if (!isEditing) {
        // Check if the same product exists in the other display section
        const { exists, product: duplicated } = await checkProductExistsInOtherSection(title)
        if (exists && duplicated) {
          const otherSectionName = section === 'left' ? 'правом' : 'левом'
          
          // Create a custom toast with a delete button
          toast.custom((t) => (
            <div 
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-red-50 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Дублирующийся продукт
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      Этот продукт уже существует в {otherSectionName} дисплее. Удалите его перед добавлением сюда.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-red-200">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    handleDeleteClick(duplicated);
                  }}
                  className="cursor-pointer w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 hover:bg-red-100 transition-colors duration-150 focus:outline-none"
                >
                  <Trash2 className="h-5 w-5 mr-1" />
                  Удалить
                </button>
              </div>
            </div>
          ), { 
            duration: 5000, 
            position: 'top-center',
          });
          
          setIsLoading(false);
          return;
        }
      }

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
      
      // Handle the tag properly to ensure exactly one # symbol
      let finalTag = '';
      if (tagWithoutHash && tagWithoutHash.trim()) {
        // Remove any # at the beginning if present
        const cleanTag = tagWithoutHash.trim().replace(/^#+/, '');
        // Add a single # at the beginning
        finalTag = cleanTag ? `#${cleanTag}` : '';
      } else {
        finalTag = DEFAULT_TAG;
      }
      
      const productData: ProductInsert = {
        user_id: userId,
        title: title.trim(),
        description: description.trim(),
        tag: finalTag,
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
              <Lock size={14} className="text-indigo-500" aria-label="Это поле заблокировано, так как продукт из базы данных" />
            )}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <Hash size={16} />
            </div>
            <input
              id="tag"
              type="text"
              value={tagWithoutHash}
              onChange={handleTagChange}
              disabled={lockedFields.tag}
              className={`w-full text-black pl-8 pr-3 py-2 border ${
                lockedFields.tag ? 'bg-gray-50 border-indigo-200 cursor-not-allowed' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none ${
                !lockedFields.tag ? 'focus:ring-indigo-500 focus:border-indigo-500' : ''
              }`}
              placeholder="Добавить тег (без символа #)"
            />
          </div>
          {!lockedFields.tag && (
            <p className="mt-1 text-xs text-indigo-600 flex items-center gap-1">
              <Info size={12} />
              <span>Символ # добавляется автоматически</span>
            </p>
          )}
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
              <Lock size={14} className="text-indigo-500" aria-label="Изображение заблокировано, так как продукт из базы данных" />
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
      
      {/* Confirmation Dialog for Deletion */}
      {showDeleteConfirm && duplicateProduct && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Удалить продукт"
          message="Вы уверены, что хотите удалить этот продукт? Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}