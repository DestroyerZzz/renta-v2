import imageCompression from 'browser-image-compression';

/**
 * Configuration options for image optimization
 */
export interface ImageOptimizationOptions {
    /**
     * Maximum width in pixels for the optimized image
     */
    maxWidthOrHeight?: number;

    /**
     * Maximum size in MB for the optimized image
     */
    maxSizeMB?: number;

    /**
     * Image quality (0 to 1), where 1 is highest quality
     */
    quality?: number;

    /**
     * Should the image be converted to use WebP format if browser supports it
     */
    useWebP?: boolean;

    /**
     * Show optimization progress in the console (for debugging)
     */
    debug?: boolean;    /**
     * Function to track progress during optimization
     * @param progress - Number between 0 and 100
     */
    onProgress?: (progress: number) => void;

    /**
     * Enable smart resizing for large images
     */
    enableSmartResize?: boolean;

    /**
     * Maximum dimension for smart resize (defaults to 400px for rectangles, 200px for squares)
     */
    maxSmartDimension?: number;

    /**
     * Minimum size to trigger smart resize (defaults to 800px)
     */
    resizeThreshold?: number;
}

/**
 * Default image optimization options
 */
export const defaultOptions: ImageOptimizationOptions = {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1,
    quality: 0.8,
    useWebP: true,
    debug: false,
    onProgress: undefined,
    enableSmartResize: true,
    maxSmartDimension: 400,
    resizeThreshold: 800,
};

/**
 * Function to check if WebP is supported in the current browser
 * @returns {boolean} True if WebP is supported
 */
export const isWebPSupported = (): boolean => {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    if (!canvas || !canvas.toDataURL) return false;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Optimizes an image for efficient storage and upload
 * 
 * @param {File} imageFile - The original image file to be optimized
 * @param {ImageOptimizationOptions} customOptions - Override default options
 * @returns {Promise<File>} - A promise that resolves to the optimized image file
 */
export const optimizeImage = async (
    imageFile: File,
    customOptions?: Partial<ImageOptimizationOptions>
): Promise<File> => {
    // Check if the input is valid
    if (!imageFile || !(imageFile instanceof File)) {
        throw new Error('Invalid image file provided');
    }

    // Merge default options with custom options
    const options = { ...defaultOptions, ...customOptions };

    // Initialize progress tracking
    const updateProgress = (progress: number) => {
        if (options.onProgress) {
            options.onProgress(Math.min(Math.round(progress), 100));
        }
    };

    // Start with 5% progress to indicate we've begun
    updateProgress(5);

    // Always log original file size in KB for debugging
    const originalSize = imageFile.size / 1024;
    console.log(`Original: ${originalSize.toFixed(2)} KB`);

    // Only skip tiny images (less than 50KB) since most images benefit from optimization
    if (imageFile.size <= 50 * 1024) {
        if (options.debug) {
            console.log('Image is very small, skipping optimization', imageFile.name);
        }
        console.log(`Optimized: ${originalSize.toFixed(2)} KB (skipped - already small)`);
        // Even if we skip optimization, show 100% progress
        updateProgress(100);
        return imageFile;
    }    try {
        // Get original image dimensions for smart resizing
        let originalDimensions;
        try {
            originalDimensions = await getImageDimensions(imageFile);
            updateProgress(10);        } catch {
            console.warn('Could not get image dimensions, proceeding without smart resize');
            originalDimensions = null;
        }

        // Check if we should apply smart resizing
        let processedFile = imageFile;
        if (options.enableSmartResize && originalDimensions) {
            const { width: originalWidth, height: originalHeight } = originalDimensions;
            const maxDimension = Math.max(originalWidth, originalHeight);
            
            // Apply smart resize if image is larger than threshold
            if (maxDimension > (options.resizeThreshold || 800)) {
                updateProgress(12);
                
                const smartDimensions = calculateSmartDimensions(
                    originalWidth,
                    originalHeight,
                    options.maxSmartDimension || 400
                );
                
                console.log(`Smart resizing: ${originalWidth}x${originalHeight} → ${smartDimensions.width}x${smartDimensions.height}`);                try {
                    processedFile = await smartResizeImage(
                        imageFile,
                        smartDimensions.width,
                        smartDimensions.height
                    );
                    updateProgress(14);
                    
                    const resizedSize = processedFile.size / 1024;
                    console.log(`After smart resize: ${resizedSize.toFixed(2)} KB`);
                } catch (resizeError) {
                    console.warn('Smart resize failed, using original image:', resizeError);
                    processedFile = imageFile;
                }
            }
        }

        // Ensure we're using the correct MIME type
        const fileType = processedFile.type || 'image/jpeg';

        // Update progress - preparing for compression
        updateProgress(15);        // Use browser-image-compression library for optimization
        // Use minimal compression to preserve quality after smart resize
        const compressionOptions = {
            maxSizeMB: options.maxSizeMB,
            maxWidthOrHeight: options.maxWidthOrHeight,
            useWebWorker: true,
            // Use maximum quality if we've already resized the image
            initialQuality: processedFile !== imageFile ? 1.0 : options.quality,
            // Add more options for better compression
            fileType,
            alwaysKeepResolution: false, // Allow resizing if needed
            exifOrientation: 1, // Fix orientation issues
            onProgress: (progress: number) => {
                // Map library's 0-100 progress to our 15-65 range
                const mappedProgress = 15 + (progress * 0.5);
                updateProgress(mappedProgress);
            }
        };        // Determine if we should use WebP (disabled for resized images to preserve quality)
        const useWebP = options.useWebP && isWebPSupported() && processedFile === imageFile;        // Compress the image (skip compression for resized images to preserve quality)
        let compressedFile = processedFile;
        
        if (processedFile === imageFile) {
            // Only compress if we haven't resized (original image)
            compressedFile = await imageCompression(processedFile, compressionOptions);
        } else {
            // For resized images, skip compression to preserve quality
            console.log('Skipping compression for resized image to preserve quality');
        }

        // Update progress - compression done, preparing for WebP conversion if needed
        updateProgress(70);        // If compression made the file larger (which can happen with already optimized images),
        // use the processed file instead
        if (compressedFile.size > processedFile.size) {
            compressedFile = processedFile;
        }

        let finalFile = compressedFile;
        let finalSize = compressedFile.size / 1024;        // If WebP is supported and enabled, convert to WebP format
        if (useWebP && !fileType.includes('webp')) {
            updateProgress(75);
            try {
                // Use maximum quality for WebP conversion to preserve original quality
                const compressedBlob = await convertToWebP(compressedFile, 1.0);
                updateProgress(85);
                const webpFile = new File(
                    [compressedBlob],
                    // Change extension to .webp if not already
                    imageFile.name.replace(/\.[^/.]+$/, '.webp'),
                    { type: 'image/webp' }
                );

                // Only use WebP if it's actually smaller
                if (webpFile.size < compressedFile.size) {
                    finalFile = webpFile;
                    finalSize = webpFile.size / 1024;
                }
                updateProgress(90);
            } catch (webpError) {
                console.warn('WebP conversion failed, using standard compression:', webpError);
            }
        }

        // Always log the final result
        const compressionPercent = ((1 - (finalFile.size / imageFile.size)) * 100).toFixed(1);
        console.log(`Optimized: ${finalSize.toFixed(2)} KB (${compressionPercent}% reduction)`);

        if (options.debug) {
            console.log('Original format:', fileType);
            console.log('Final format:', finalFile.type);
            console.log('Original dimensions:', await getImageDimensions(imageFile));
            console.log('Final dimensions:', await getImageDimensions(finalFile));
        }

        // Final progress update
        updateProgress(100);
        return finalFile;
    } catch (error) {
        console.error('Error optimizing image:', error);
        // Report 100% progress even on error, to ensure UI doesn't hang
        updateProgress(100);
        // Return the original file as a fallback if compression fails
        console.log(`Optimization failed, using original: ${originalSize.toFixed(2)} KB`);
        return imageFile;
    }
};

/**
 * Helper function to get the dimensions of an image file
 * 
 * @param {File} file - The image file
 * @returns {Promise<{width: number, height: number}>} - A promise that resolves to the image dimensions
 */
const getImageDimensions = async (file: File): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.width,
                height: img.height
            });
            URL.revokeObjectURL(img.src); // Clean up
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for dimension detection'));
            URL.revokeObjectURL(img.src); // Clean up
        };
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Helper function to convert an image file to WebP format
 * 
 * @param {File} file - The image file to convert
 * @param {number} quality - The quality of the WebP image (0 to 1)
 * @returns {Promise<Blob>} - A promise that resolves to the WebP blob
 */
const convertToWebP = async (file: File, quality: number): Promise<Blob> => {
    try {
        // Create an object URL from the file
        const bitmap = await createImageBitmap(file);

        // Create a canvas element to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available');

        // Use a white background for transparent images to prevent alpha channel issues
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image
        ctx.drawImage(bitmap, 0, 0);

        // Convert to WebP with a more reliable approach
        return new Promise((resolve, reject) => {
            try {
                // First attempt with specified quality
                canvas.toBlob(blob => {
                    if (blob && blob.size > 0) {
                        resolve(blob);
                    } else {
                        // Fallback to JPEG if WebP fails
                        canvas.toBlob(jpegBlob => {
                            if (jpegBlob) {
                                resolve(jpegBlob);
                            } else {
                                reject(new Error('Failed to convert image to any compressed format'));
                            }
                        }, 'image/jpeg', quality);
                    }
                }, 'image/webp', quality);
            } catch (e) {
                reject(new Error(`WebP conversion error: ${e}`));
            }
        });
    } catch (error) {
        console.error('Error in WebP conversion:', error);
        throw error;
    }
};

/**
 * Calculate optimal dimensions preserving aspect ratio
 * For square images: exactly 200x200px
 * For rectangles: smaller dimension becomes 200px, larger scales proportionally
 * 
 * @param {number} originalWidth - Original image width
 * @param {number} originalHeight - Original image height  
 * @param {number} _maxDimension - Maximum allowed dimension (unused, kept for compatibility)
 * @returns {object} - Calculated width and height maintaining aspect ratio
 */
const calculateSmartDimensions = (
    originalWidth: number,
    originalHeight: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _maxDimension: number
): { width: number; height: number } => {
    const aspectRatio = originalWidth / originalHeight;
    const isSquare = Math.abs(aspectRatio - 1) < 0.1; // Consider "almost square" as square
    
    // For square images: exactly 200x200
    if (isSquare) {
        return { width: 200, height: 200 };
    }
    
    // For rectangles: make the smaller dimension exactly 200px, scale the larger proportionally
    const targetMinDimension = 200;
    
    if (originalWidth > originalHeight) {
        // Landscape: height becomes 200px, width scales up proportionally
        const newHeight = targetMinDimension;
        const newWidth = Math.round(newHeight * aspectRatio);
        return { width: newWidth, height: newHeight };
    } else {
        // Portrait: width becomes 200px, height scales up proportionally  
        const newWidth = targetMinDimension;
        const newHeight = Math.round(newWidth / aspectRatio);
        return { width: newWidth, height: newHeight };
    }
};

/**
 * Smart resize image using canvas with pixel-perfect quality preservation
 * 
 * @param {File} file - The image file to resize
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @returns {Promise<File>} - Resized image file with maximum quality
 */
const smartResizeImage = async (
    file: File,
    targetWidth: number,
    targetHeight: number
): Promise<File> => {
    try {
        // Create image element for loading
        const img = new Image();
        
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                try {
                    const originalWidth = img.width;
                    const originalHeight = img.height;
                    
                    // If the image is already smaller than or equal to target, return as-is
                    if (originalWidth <= targetWidth && originalHeight <= targetHeight) {
                        URL.revokeObjectURL(img.src);
                        resolve(file);
                        return;
                    }
                    
                    // Calculate scaling factor
                    const scaleX = targetWidth / originalWidth;
                    const scaleY = targetHeight / originalHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    // Use progressive downscaling for better quality (like Photoshop)
                    // Only use progressive if we're scaling down significantly (less than 0.5)
                    let resizedFile;
                    if (scale < 0.5) {
                        resizedFile = await progressiveDownscale(img, targetWidth, targetHeight, file);
                    } else {
                        resizedFile = await singleStepResize(img, targetWidth, targetHeight, file);
                    }
                    
                    URL.revokeObjectURL(img.src);
                    resolve(resizedFile);
                } catch (canvasError) {
                    URL.revokeObjectURL(img.src);
                    reject(canvasError);
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image for resizing'));
            };
            
            img.src = URL.createObjectURL(file);
        });
    } catch (error) {
        console.error('Error in smart resize:', error);
        throw error;
    }
};

/**
 * Progressive downscaling with advanced interpolation for crystal-clear results
 * Uses techniques from professional image editing software
 */
const progressiveDownscale = async (
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    originalFile: File
): Promise<File> => {
    let currentWidth = img.width;
    let currentHeight = img.height;
    
    // Create initial canvas with original image
    let currentCanvas = document.createElement('canvas');
    currentCanvas.width = currentWidth;
    currentCanvas.height = currentHeight;
    
    let ctx = currentCanvas.getContext('2d', {
        alpha: originalFile.type.includes('png'),
        desynchronized: false,
        colorSpace: 'srgb'
    });
    if (!ctx) throw new Error('Canvas 2D context not available');
    
    // Disable smoothing for pixel-perfect initial copy
    ctx.imageSmoothingEnabled = false;
    
    // Draw original image at full resolution
    ctx.drawImage(img, 0, 0);
    
    // Progressive downscaling with optimized step size (67% instead of 50% for better quality)
    const stepFactor = 0.67; // More gradual downscaling preserves more detail
    
    while (currentWidth > targetWidth * 1.5 || currentHeight > targetHeight * 1.5) {
        const nextWidth = Math.max(Math.floor(currentWidth * stepFactor), targetWidth);
        const nextHeight = Math.max(Math.floor(currentHeight * stepFactor), targetHeight);
        
        // Create new canvas for this step
        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = nextWidth;
        nextCanvas.height = nextHeight;
        
        const nextCtx = nextCanvas.getContext('2d', {
            alpha: originalFile.type.includes('png'),
            desynchronized: false,
            colorSpace: 'srgb'
        });
        if (!nextCtx) throw new Error('Canvas 2D context not available');
        
        // Use bicubic-like interpolation for smooth downscaling
        nextCtx.imageSmoothingEnabled = true;
        nextCtx.imageSmoothingQuality = 'high';
        
        // Apply sharpening technique: scale down slightly more, then scale back up
        const tempWidth = Math.floor(nextWidth * 0.98);
        const tempHeight = Math.floor(nextHeight * 0.98);
        
        if (tempWidth > 0 && tempHeight > 0 && (currentWidth / tempWidth > 1.1)) {
            // Create temporary canvas for sharpening effect
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = tempWidth;
            tempCanvas.height = tempHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';
                tempCtx.drawImage(currentCanvas, 0, 0, tempWidth, tempHeight);
                
                // Now scale back up to target size with sharpening
                nextCtx.imageSmoothingEnabled = true;
                nextCtx.imageSmoothingQuality = 'high';
                nextCtx.drawImage(tempCanvas, 0, 0, nextWidth, nextHeight);
            } else {
                // Fallback to direct resize
                nextCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);
            }
        } else {
            // Direct resize for small changes
            nextCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);
        }
        
        // Update for next iteration
        currentCanvas = nextCanvas;
        currentWidth = nextWidth;
        currentHeight = nextHeight;
        ctx = nextCtx;
    }
    
    // Final step: resize to exact target dimensions with pixel-perfect precision
    if (currentWidth !== targetWidth || currentHeight !== targetHeight) {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        
        const finalCtx = finalCanvas.getContext('2d', {
            alpha: originalFile.type.includes('png'),
            desynchronized: false,
            colorSpace: 'srgb'
        });
        if (!finalCtx) throw new Error('Canvas 2D context not available');
        
        // Use the highest quality settings for final resize
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        
        // Apply subtle contrast enhancement for sharper final result
        finalCtx.filter = 'contrast(1.02) saturate(1.01)';
        finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
        finalCtx.filter = 'none'; // Reset filter
        
        currentCanvas = finalCanvas;
    }
    
    // Convert to blob with maximum quality and optimized settings
    return new Promise((resolve, reject) => {
        const outputType = originalFile.type || 'image/jpeg';
        
        if (outputType.includes('png')) {
            // PNG: No compression, perfect quality
            currentCanvas.toBlob(blob => {
                if (blob) {
                    const resizedFile = new File([blob], originalFile.name, { type: outputType });
                    resolve(resizedFile);
                } else {
                    reject(new Error('Failed to resize PNG image'));
                }
            }, outputType);
        } else {
            // JPEG: Maximum quality with optimized encoding
            currentCanvas.toBlob(blob => {
                if (blob) {
                    const resizedFile = new File([blob], originalFile.name, { type: outputType });
                    resolve(resizedFile);
                } else {
                    reject(new Error('Failed to resize JPEG image'));
                }
            }, outputType, 1.0);
        }
    });
};

/**
 * Single-step resize with advanced quality preservation for smaller scaling operations
 */
const singleStepResize = async (
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    originalFile: File
): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d', {
        alpha: originalFile.type.includes('png'),
        desynchronized: false,
        colorSpace: 'srgb'
    });
    if (!ctx) throw new Error('Canvas 2D context not available');
    
    // Use highest quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Apply subtle sharpening filter for crisp results
    ctx.filter = 'contrast(1.01) saturate(1.005) brightness(1.002)';
    
    // Draw resized image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Reset filter
    ctx.filter = 'none';
    
    // Convert to blob with maximum quality
    return new Promise((resolve, reject) => {
        const outputType = originalFile.type || 'image/jpeg';
        
        if (outputType.includes('png')) {
            // PNG: No compression, perfect quality
            canvas.toBlob(blob => {
                if (blob) {
                    const resizedFile = new File([blob], originalFile.name, { type: outputType });
                    resolve(resizedFile);
                } else {
                    reject(new Error('Failed to resize PNG image'));
                }
            }, outputType);
        } else {
            // JPEG: Maximum quality with optimized encoding
            canvas.toBlob(blob => {
                if (blob) {
                    const resizedFile = new File([blob], originalFile.name, { type: outputType });
                    resolve(resizedFile);
                } else {
                    reject(new Error('Failed to resize JPEG image'));
                }
            }, outputType, 1.0);
        }
    });
};

export default optimizeImage;
