<script setup>
import { ref } from 'vue'
import { useBookStore } from '../../stores/book'
import Model3DViewer from './Model3DViewer.vue'


const bookSt = useBookStore()
const file = ref({})

const fileUploader = async (event) => {
  const selectedFile = event.files[0];
  const filePath = selectedFile.path;
  const fileName = selectedFile.name;

  try {
    const response = await window.electron.uploadModel(filePath, fileName);
    if (response.success) {
      file.value = {
        ...selectedFile,
        path: response.filePath,
      };
    } else {
      console.error('response:', response);
      console.error('Error uploading model:', response.message);
    }
  } catch (error) {
    console.error('Error uploading model:', error);
  }
}

const save = () => {
  bookSt.block?.id ? bookSt.updateBlock(file.value || '') : bookSt.saveBlock(file.value || '')
}
</script>

<template>
  <div>
    <div class="flex flex-wrap justify-between gap-5">
      <FileUpload mode="basic" name="cover" customUpload @uploader="fileUploader" auto
                  :chooseLabel="$t('general.select-file')" />

      <Button v-if="file.path" @click="save" icon="pi pi-save"
              :label="$t('general.save')" severity="success" />
    </div>

    <Model3DViewer v-if="file.path" :model="file" class="mt-12" />
  </div>
</template>

<style scoped>
</style>
