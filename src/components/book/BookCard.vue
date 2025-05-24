<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  book: {type: Object, required: true},
})

const router = useRouter()
const resolvedCoverPath = ref('')

// Helper function to check if string is base64 data URL
const isBase64DataUrl = (str) => {
  if (!str) return false;
  // Check if it's a data URL with base64 encoding
  return str.startsWith('data:') && str.includes('base64,');
};

// Helper function to modify path (similar to PptViewer)
const modifyPath = async (path) => {
  if (!path) return '';
  try {
    const isPackaged = await window.electron.isPackaged();
    if (isPackaged) {
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
    const isPackaged = await window.electron.isPackaged();
    
    if (!isPackaged) {
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

// Function to resolve cover image path
const resolveCoverPath = async () => {
  if (props.book.cover) {
    try {
      // Check if it's already a base64 data URL
      if (isBase64DataUrl(props.book.cover)) {
        resolvedCoverPath.value = props.book.cover;
        console.log('Cover is base64 data URL, using directly');
        return;
      }
      
      // Otherwise, treat it as a file path and resolve it
      const resolved = await resolveFilePath(props.book.cover);
      resolvedCoverPath.value = resolved;
      console.log('Resolved cover path:', {
        original: props.book.cover,
        resolved: resolved,
        isBase64: false
      });
    } catch (error) {
      console.error('Error resolving cover path:', error);
      resolvedCoverPath.value = props.book.cover; // Fallback to original
    }
  } else {
    resolvedCoverPath.value = '';
  }
};

// Initialize on mount
onMounted(async () => {
  await resolveCoverPath();
});

// Watch for changes in book cover
watch(() => props.book.cover, async () => {
  await resolveCoverPath();
});

const openBookEdit = () => {
  router.push({
    name: 'book-edit', params: {
      bookId: props.book.id,
    },
  })
}
</script>

<template>
  <Card class="w-80 overflow-hidden hover:shadow-lg hover:shadow-surface-300 dark:hover:shadow-surface-700">
    <template #header>
      <img v-if="resolvedCoverPath" @click="openBookEdit" alt="" :src="resolvedCoverPath" class="h-96 cursor-pointer w-full object-cover" />
    </template>
    <template #title>
      <div @click="openBookEdit" class="cursor-pointer">{{ book.title }}</div>
    </template>
    <template #subtitle>
      <div class="flex justify-between items-start gap-3">
        <span>{{ book.author.name }}</span>
        <i @click="router.push({name: 'book-create', params: {bookId: book.id}})"
           class="flex-none pi pi-pencil cursor-pointer mt-1" v-tooltip.top="$t('general.edit')" />
      </div>
    </template>
    <template #footer>
      <div v-if="book.tags.length > 0" class="flex flex-wrap gap-x-2 gap-y-3">
        <Chip v-for="tag in book.tags" :label="tag" class="text-sm" />
      </div>
    </template>
  </Card>
</template>