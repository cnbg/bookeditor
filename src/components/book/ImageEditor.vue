<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const { electron } = window;
const toast = useToast();
const { t } = useI18n();
const bookSt = useBookStore();

const imgObj = {
    title: '',
    alt: '',
    src: '',
    thumb: '',
};

const images = reactive([{
    ...imgObj
}]);

const resolvedImagePaths = ref(new Map());
const isPackaged = ref(false);

// Helper function to check if string is base64 data URL
const isBase64DataUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:') && str.includes('base64,');
};

// Helper function to modify path (similar to PptViewer)
const modifyPath = async (path) => {
  if (!path) return '';
  try {
    const packaged = await window.electron.isPackaged();
    if (packaged) {
      // Remove 'src' from the beginning of the path for packaged app
      return path.replace(/^\/src\//, '/');
    }
    return path;
  } catch (error) {
    console.error('Error checking package status:', error);
    return path;
  }
};

// Helper function to resolve file path (similar to PptViewer)
const resolveFilePath = async (filePath) => {
  if (!filePath) return '';
  
  try {
    const modifiedPath = await modifyPath(filePath);
    const packaged = await window.electron.isPackaged();
    
    if (!packaged) {
      // Development mode - ensure path starts with /src
      if (modifiedPath.startsWith('/data/')) {
        return `/src${modifiedPath}`;
      }
      return modifiedPath;
    } else {
      // Packaged mode - resolve to file:// URL
      const resolvedPath = await window.electron.resolvePath(modifiedPath);
      return `file:///${resolvedPath.replace(/\\/g, '/')}`;
    }
  } catch (error) {
    console.error('Error resolving path:', error);
    return filePath;
  }
};

// Function to resolve image path (handles both file paths and base64)
const resolveImagePath = async (imagePath) => {
  if (!imagePath) return '';
  
  try {
    // Check if it's already a base64 data URL
    if (isBase64DataUrl(imagePath)) {
      console.log('Image is base64 data URL, using directly');
      return imagePath;
    }
    
    // Otherwise, treat it as a file path and resolve it
    const resolved = await resolveFilePath(imagePath);
    console.log('Resolved image path:', {
      original: imagePath,
      resolved: resolved,
      isBase64: false
    });
    return resolved;
  } catch (error) {
    console.error('Error resolving image path:', error);
    return imagePath; // Fallback to original
  }
};

// Computed property for processed images with resolved paths
const processedImages = computed(() => {
  return images.map((image, index) => {
    if (!image.src) return { ...image, displaySrc: '', displayThumb: '' };
    
    const cacheKey = `${index}-${image.src}`;
    const resolvedSrc = resolvedImagePaths.value.get(`${cacheKey}-src`) || image.src;
    const resolvedThumb = resolvedImagePaths.value.get(`${cacheKey}-thumb`) || image.thumb || image.src;
    
    return {
      ...image,
      displaySrc: resolvedSrc,
      displayThumb: resolvedThumb
    };
  });
});

// Function to resolve and cache image paths
const resolveImagePaths = async () => {
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const cacheKey = `${i}-${image.src}`;
    
    if (image.src && !resolvedImagePaths.value.has(`${cacheKey}-src`)) {
      try {
        const resolvedSrc = await resolveImagePath(image.src);
        const resolvedThumb = await resolveImagePath(image.thumb || image.src);
        
        resolvedImagePaths.value.set(`${cacheKey}-src`, resolvedSrc);
        resolvedImagePaths.value.set(`${cacheKey}-thumb`, resolvedThumb);
        
        console.log(`Resolved image paths for index ${i}:`, {
          original: image.src,
          resolved: resolvedSrc,
          thumb: resolvedThumb
        });
      } catch (error) {
        console.error(`Error resolving image path for index ${i}:`, error);
      }
    }
  }
};

const fileUploader = async (event, image) => {
    const file = event.files[0];
    const filePath = file.path;
    const fileName = file.name;

    try {
        const response = await electron.uploadFile(filePath, fileName);
        if (response.success) {
            let finalPath = response.filePath;
            
            // Fix path separators
            if (finalPath.includes('\\')) {
                finalPath = finalPath.replace(/\\/g, '/');
            }
            
            // Store the path consistently
            const packaged = await window.electron.isPackaged();
            if (packaged) {
                // Store as relative path for consistency
                if (!finalPath.startsWith('/data')) {
                    finalPath = finalPath.replace(/.*\/data/, '/data');
                }
            }
            
            // Update the image object
            image.src = finalPath;
            image.thumb = finalPath;
            
            // Resolve and cache the display path immediately for UI update
            const imageIndex = images.indexOf(image);
            const resolvedSrc = await resolveImagePath(finalPath);
            const cacheKey = `${imageIndex}-${finalPath}`;
            resolvedImagePaths.value.set(`${cacheKey}-src`, resolvedSrc);
            resolvedImagePaths.value.set(`${cacheKey}-thumb`, resolvedSrc);
            
            console.log('Image uploaded and resolved:', {
                originalResponse: response.filePath,
                storedPath: finalPath,
                resolvedForDisplay: resolvedSrc,
                isPackaged: packaged
            });
        } else {
            console.error('Error uploading file:', response.message);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
};

const save = () => {
    const isValid = images.some(image => image.src !== '' && (image.title.trim() !== '' || image.alt.trim() !== ''));

    if (isValid) {
        bookSt.block?.id ? bookSt.updateBlock(images) : bookSt.saveBlock(images);
    } else {
        if (images.some(image => image.title.trim() === '')) {
            toast.add({ severity: 'error', summary: t('general.enter-book-title'), life: 3000 });
        }
        if (images.some(image => image.alt.trim() === '')) {
            toast.add({ severity: 'error', summary: t('general.enter-description'), life: 3000 });
        }
        if (images.every(image => image.src === '')) {
            toast.add({ severity: 'error', summary: t('general.select-file'), life: 3000 });
        }
    }
};

const addNewBlock = () => {
    images.push({
        ...imgObj
    });
};

// Initialize on mount
onMounted(async () => {
  const packaged = await window.electron.isPackaged();
  isPackaged.value = packaged;
  await resolveImagePaths();
});
</script>

<template>
  <div>
    <ScrollPanel style="height: calc(100vh - 260px)">
      <div class="flex flex-wrap justify-between gap-5">
        <Button @click="addNewBlock" icon="pi pi-plus" text severity="success" />
        <Button v-if="images.length > 0" @click="save" icon="pi pi-save" :label="$t('general.save')" severity="success" />
      </div>
      <div v-for="(image, index) in processedImages" :key="index" class="mt-10 flex flex-col gap-5">
        <div>
          <label for="title">{{ $t('general.enter-title') }}</label>
          <InputText v-model.trim="images[index].title" id="title" class="w-full" />
        </div>
        <div>
          <label for="description">{{ $t('general.enter-description') }}</label>
          <Textarea v-model.trim="images[index].alt" id="description" class="w-full h-15" />
        </div>
        <FileUpload mode="basic" name="cover" accept="image/*" :maxFileSize="5000000" customUpload @uploader="fileUploader($event, images[index])" auto :chooseLabel="$t('general.select-file')" />
        <div v-if="image.displaySrc" class="p-5">
          <img :src="image.displaySrc" class="h-56 w-full object-contain" />
        </div>
      </div>
    </ScrollPanel>
  </div>
</template>

<style scoped>
</style>