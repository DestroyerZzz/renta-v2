'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase'
import { Database } from '@/types/database'
import SupabaseImage from '../ui/SupabaseImage'
import ConfirmationDialog from '../ui/ConfirmationDialog'
import { Edit, Trash2, Tag, Upload, Loader2, MoreVertical } from 'lucide-react'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
  onDelete: (id: string) => void
  onEdit: (product: Product) => void
  onTagClick?: (tag: string) => void
  onImageUpdate?: (product: Product) => void // New optional prop for handling image updates
}

export const DEFAULT_TAG = 'разное'
const MAX_DESCRIPTION_LENGTH = 50

export default function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  onTagClick,
  onImageUpdate // New prop with default to onEdit for backward compatibility
}: ProductCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isAuthor, setIsAuthor] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // Use onImageUpdate if provided, otherwise fall back to onEdit
  const handleImageChange = onImageUpdate || onEdit;
  
  useEffect(() => {
    if (product.image_url) {
      const img = new Image();
      img.src = product.image_url;
      img.onload = () => setIsImageLoaded(true);
    }
    
    // Check if the current user is the author of this product
    const checkAuthor = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthor(user?.id === product.user_id);
    };
    
    checkAuthor();
    
    // Add click outside listener for dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [product.image_url, product.user_id, supabase]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  }
  
  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      if (product.image_url) {
        const imagePath = new URL(product.image_url).pathname.split('/').pop()
        if (imagePath) {
          await supabase.storage.from('product_images').remove([imagePath])
        }
      }
      
      await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      onDelete(product.id)
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Upload image to Supabase Storage with user ID in path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${product.id}-${Date.now()}.${fileExt}`;
      
      // console.log('Attempting to upload with path:', fileName);
      // console.log('Current user ID:', user.id);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product_images')
        .upload(fileName, file);
        
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload error: ${uploadError.message}`);
      }
      
      if (!uploadData) {
        throw new Error('Upload failed: No data returned');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product_images')
        .getPublicUrl(fileName);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }
      
      // Update product with image URL
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: urlData.publicUrl })
        .eq('id', product.id);
        
      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Update error: ${updateError.message}`);
      }
      
      // Update the product in the UI by calling handleImageChange with updated product
      const updatedProduct = {
        ...product,
        image_url: urlData.publicUrl
      };
      
      // Call the appropriate handler
      handleImageChange(updatedProduct);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500); // Add small delay to show 100% completion
    }
  }

  const getDisplayTag = () => {
    const tag = product.tag || DEFAULT_TAG;
    // If tag already starts with #, don't add another one
    return tag.startsWith('#') ? tag.substring(1) : tag;
  }

  const handleTagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTagClick) {
      // Always pass the original tag to the handler
      onTagClick(product.tag || DEFAULT_TAG);
    }
  };

  const description = product.description || 'Нет описания'
  const isDescriptionLong = description.length > MAX_DESCRIPTION_LENGTH

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-indigo-200 group">
      {/* Restructured layout - image now at the top left */}
      <div className="flex flex-col">
        {/* Top section with image and title */}
        <div className="flex">
          {/* Left side - Image - fixed position at top left */}
          <div className="flex items-start justify-center w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] md:w-[150px] md:h-[150px] flex-shrink-0 p-2">
            <div className="relative w-full h-full border border-gray-200 rounded-md overflow-hidden bg-white group-hover:border-indigo-200 transition-colors duration-300">
              {product.image_url ? (
                <div className="w-full h-full relative">
                  <SupabaseImage 
                    src={product.image_url} 
                    alt={product.title || description.substring(0, 30) || 'Изображение продукта'} 
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isImageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    fill={true}
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse">
                        <p className="text-gray-500 text-xs sm:text-sm">Ошибка загрузки</p>
                      </div>
                    }
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 transition-colors duration-300 group-hover:bg-gray-50">
                  {isAuthor ? (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <Loader2 size={24} className="text-[#3d82f7] mb-1 animate-spin" />
                          <p className="text-gray-500 text-xs sm:text-sm text-center">
                            Загрузка... {uploadProgress}%
                          </p>
                          {uploadProgress > 0 && (
                            <div className="w-4/5 mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#3d82f7] transition-all duration-200" 
                                style={{ width: `${uploadProgress}%` }} 
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <label 
                          htmlFor={`image-upload-${product.id}`}
                          className="cursor-pointer flex flex-col items-center justify-center w-full h-full"
                        >
                          <Upload size={20} className="text-indigo-500 mb-1" />
                          <p className="text-gray-500 text-xs sm:text-sm group-hover:text-indigo-500 transition-colors duration-300">
                            Добавить фото
                          </p>
                          <input 
                            id={`image-upload-${product.id}`}
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload}
                            disabled={isUploading}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs sm:text-sm group-hover:text-indigo-500 transition-colors duration-300">Нет изображения</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Content */}
          <div className="p-2 sm:p-3 md:p-4 flex-1 flex flex-col min-w-0 relative">
            {/* Action dropdown menu - only visible for authors */}
            {isAuthor && (
              <div className="absolute top-2 right-2 z-10" ref={dropdownRef}>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                  aria-label="Действия с продуктом"
                >
                  <MoreVertical size={18} className="text-gray-500 hover:text-indigo-600" />
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 w-[160px] py-1 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        onEdit(product);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-indigo-50 transition-colors duration-150 text-gray-700 hover:text-[#3d82f7] cursor-pointer"
                    >
                      <Edit size={15} className="text-[#3d82f7]" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        handleDeleteClick();
                      }}
                      disabled={isDeleting}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 transition-colors duration-150 text-gray-700 hover:text-red-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-400 cursor-pointer"
                    >
                      <Trash2 size={15} className="text-red-500" />
                      <span>{isDeleting ? 'Удаление...' : 'Удалить'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Title */}
            {product.title && (
              <h3 className="font-medium text-gray-800 text-xs sm:text-sm md:text-base mb-1 break-words line-clamp-2">
                {product.title}
              </h3>
            )}
            
            {/* Description */}
            <div className="mb-2 sm:mb-3 flex-grow">
              <p className={`text-gray-700 text-xs sm:text-sm md:text-base break-words transition-all duration-300 ${
                !showFullDescription ? 'line-clamp-2 sm:line-clamp-2' : ''
              } group-hover:text-gray-900`}>
                {description}
              </p>
              
              {isDescriptionLong && (
                <button 
                  type="button"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="cursor-pointer text-xs text-[#3d82f7] hover:text-[#2d6ce0] mt-1 transition-all duration-200 hover:underline focus:outline-none"
                >
                  {showFullDescription ? 'Показать меньше' : 'Показать больше'}
                </button>
              )}
            </div>
            
            {/* Tag and date */}
            <div className="flex justify-between items-center py-1 sm:py-2 border-t border-gray-100 group-hover:border-indigo-50 transition-colors duration-300">
              <button
                type="button"
                onClick={handleTagClick}
                className="cursor-pointer text-xs font-medium text-[#3d82f7] hover:text-[#2d6ce0] hover:underline focus:outline-none transition-all duration-200 transform hover:translate-x-1 flex items-center gap-1"
              >
                <Tag size={12} />
                <span className="md:inline">{`#${getDisplayTag()}`}</span>
              </button>
              <div className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
                {new Date(product.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showDeleteConfirm && (
        <ConfirmationDialog
          title="Удаление продукта"
          message="Вы уверены, что хотите удалить этот продукт? Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          isLoading={isDeleting}
          isOpen={showDeleteConfirm}
        />
      )}
    </div>
  )
}