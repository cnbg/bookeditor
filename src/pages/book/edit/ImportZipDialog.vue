<template>
  <BookListPage />
  <Dialog v-model:visible="dialogVisible" modal style="max-width: 500px;" @hide="navigateHome">
    <div class="p-4">
      <div class="file-dummy" :class="{ 'drag-active': dragActive }">
        <label for="fileInput" class="drop-container" id="dropcontainer" 
             @dragover.prevent @dragenter="dragActive = true" @dragleave="dragActive = false" @drop="handleDrop">
        <i class="pi pi-upload" style="font-size: 2.5rem; color:#949191;"></i>
        <span class="drop-titlee">{{ $t('general.drop-here') }}</span>
        <Button @click="openFileInput"><i class="pi pi-upload" style="font-size: 1rem; margin-right: 8px;"></i> {{ $t('general.select-file') }}</Button>
        <input type="file" id="fileInput" ref="fileInput" @change="handleFileChange" accept=".zip" style="display: none;" />
      </label>
      </div>
      <div class="mt-4" v-if="errorMessage">
        <span class="text-red-500">{{ errorMessage }}</span>
      </div>
    </div>
  </Dialog>
</template>
<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import JSZip from 'jszip';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import BookListPage from '../ListPage.vue';

const { t } = useI18n();
const toast = useToast();
const dialogVisible = ref(true);
const errorMessage = ref('');
const dragActive = ref(false);
const router = useRouter();

const navigateHome = () => {
  router.push({ name: 'home' });
};

const openFileInput = () => {
  const input = document.getElementById('fileInput');
  if (input) {
    input.click();
  }
};

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const zip = await JSZip.loadAsync(file);
    const folderNames = ['books', 'images', 'videos', 'models', 'ppt', 'survey'];

    await Promise.all(folderNames.map(async (folder) => {
      const folderEntries = zip.folder(folder);
      if (folderEntries) {
        const files = Object.values(folderEntries.files);

        await Promise.all(files.map(async (zipEntry) => {
          if (zipEntry.dir) {
            return;
          }

          try {
            const fileContent = await zipEntry.async('arraybuffer');
            let subdir;
            switch (folder) {
              case 'images':
                subdir = 'images'; break;
              case 'videos':
                subdir = 'videos'; break;
              case 'models':
                subdir = 'models'; break;
              case 'ppt':
                subdir = 'ppt'; break;
             case 'survey':
                subdir = 'survey'; break;
              default:
                subdir = 'books'; break;
            }

            const fileName = zipEntry.name.split('/').pop();
            const result = await window.electron.saveImportedFile({ fileContent, fileName, subdir });
          } catch (error) {
            console.error(`Error handling file ${zipEntry.name}:`, error);
          }
        }));
      }
    }));

    toast.add({ severity: 'success', summary: t('general.import-successful'), life: 3000 });
    dialogVisible.value = false;
    navigateHome();
  } catch (error) {
    errorMessage.value = toast.add({ severity: 'error', summary: t('general.import-failed'), life: 3000 });
    errorMessage.value = toast.add({ severity: 'error', summary: t('general.choose-zip-zile'), life: 4000 });
  }
};

const handleDrop = (event) => {
  event.preventDefault();
  dragActive.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    handleFileChange({ target: { files: [file] } });
  }
};
</script>

<style scoped>
.drop-container {
  position: relative;
  display: flex;
  gap: 10px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  padding: 20px;
  border-radius: 10px;
  border: 2px dashed #555;
  color: #444;
  cursor: pointer;
  transition: background .2s ease-in-out, border .2s ease-in-out;
}

.drop-container:hover {
  background: #eee;
  border-color: #111;
}

.drop-container:hover .drop-title {
  color: #222;
}

.drop-title {
  color: #949191;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  transition: color .2s ease-in-out;
}

.drop-titlee {
  color: #949191;
  font-size: 15px;
  text-align: center;
  transition: color .2s ease-in-out;
}

.drop-container.drag-active {
  background: #b40c0c;
  border-color: #111;
}

.drop-container.drag-active .drop-title {
  color: #222;
}
.file-dummy .success {
  display: none;
}

.file-dummy.drag-active .success {
  display: inline-block;
}

.file-dummy input[type=file] {
  display: none;
}

.file-dummy input[type=file]:valid + .default {
  display: none;
}

.file-dummy input[type=file]:valid + .success {
  display: inline-block;
}

</style>