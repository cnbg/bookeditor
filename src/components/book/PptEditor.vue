<template>
  <div>
    <div class="flex flex-wrap justify-between gap-5">
      <FileUpload mode="basic" name="ppt" customUpload @uploader="fileUploader" auto :chooseLabel="$t('general.select-file')" />

      <Button v-if="file && file.path" @click="save" icon="pi pi-save"
              :label="$t('general.save')" severity="success" />
    </div>
    <div class="message-container">
      <Message v-if="file && file.path" severity="info" text-align="center">
        <span>{{ $t('general.fileSelected') }}:</span> {{ pptFileName }}
      </Message>
    </div>
    <PptViewer :pptPath="selectedPptPath" :chapterId="bookSt.chapter?.id" @content-updated="handleContentUpdated" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const bookSt = useBookStore();
const toast = useToast();
const { t } = useI18n();
const file = ref(null);
const selectedPptPath = ref('');
const pptFileName = ref('');

const fileUploader = async (event) => {
  const selectedFile = event.files[0];
  if (!selectedFile) {
    toast.add({ severity: 'error', summary: t('general.uploadError'), detail: t('general.noFileSelected') });
    return;
  }

  const filePath = selectedFile.path || selectedFile.webkitRelativePath || selectedFile.name;
  const fileName = selectedFile.name;

  if (!filePath) {
    toast.add({ severity: 'error', summary: t('general.uploadError'), detail: t('general.invalidFilePath') });
    return;
  }

  try {
    const response = await window.electron.uploadPpt(filePath, fileName, 'src/data/ppt/');
    if (response.success) {
      file.value = {
        ...selectedFile,
        path: response.filePath,
      };
      pptFileName.value = fileName;
      selectedPptPath.value = response.filePath;

      // Update the current chapter's PPT block
      await updateChapterPptBlock({
        name: fileName,
        path: response.filePath,
      });

      toast.add({ severity: 'success', summary: t('general.uploadSuccess'), detail: t('general.fileUploaded', { name: fileName }) });
    } else {
      toast.add({ severity: 'error', summary: t('general.uploadError'), detail: response.message });
    }
  } catch (error) {
    console.error('Error uploading PowerPoint:', error);
    toast.add({ severity: 'error', summary: t('general.uploadError'), detail: error.message });
  }
};

const save = async () => {
  if (!file.value || !file.value.path) {
    toast.add({ severity: 'warn', summary: t('general.saveError'), detail: t('general.noFileToSave') });
    return;
  }

  const content = {
    name: file.value.name,
    path: file.value.path,
  };

  try {
    await updateChapterPptBlock(content);
    toast.add({ severity: 'success', summary: t('general.saveSuccess'), detail: t('general.pptUpdated') });
  } catch (error) {
    console.error('Error saving PPT:', error);
    toast.add({ severity: 'error', summary: t('general.saveError'), detail: error.message });
  }
};

const updateChapterPptBlock = async (content) => {
  if (!bookSt.chapter) return;

  const pptBlockIndex = bookSt.chapter.blocks.findIndex(block => block.type === 'ppt');
  if (pptBlockIndex !== -1) {
    bookSt.chapter.blocks[pptBlockIndex].content = content;
  } else {
    bookSt.chapter.blocks.push({
      id: crypto.randomUUID(),
      type: 'ppt',
      content: content
    });
  }

  await bookSt.updateChapter(bookSt.chapter);
};

const handleContentUpdated = (content) => {
  file.value = { ...file.value, ...content };
  pptFileName.value = content.name;
  selectedPptPath.value = content.path;
};

// Watch for changes in the current chapter and update the PPT file reference
watch(() => bookSt.chapter, (newChapter) => {
  if (newChapter) {
    const pptBlock = newChapter.blocks.find(block => block.type === 'ppt');
    if (pptBlock && pptBlock.content) {
      selectedPptPath.value = pptBlock.content.path;
      pptFileName.value = getFileName(pptBlock.content.path);
      file.value = { 
        path: pptBlock.content.path,
        name: pptFileName.value
      };
    } else {
      selectedPptPath.value = '';
      pptFileName.value = '';
      file.value = null;
    }
  }
}, { immediate: true });

function getFileName(path) {
  if (!path) return '';
  return path.split('/').pop().split('\\').pop();
}

</script>

<style scoped>
.message-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}
</style>