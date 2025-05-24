<template>
  <div class="ppt-viewer">
    <div>
      <p>
        <span class="file-name">{{ pptFileName }}</span>
      </p>
      <div class="d-flex flex-row">
        <Button v-if="pptFilePath" @click="openPowerPoint" class="btn-view">
          {{ $t('general.open') }}
        </Button>
        <div v-if="editing" class="flex justify-end gap-2 edit-controls">
          <FileUpload mode="basic" name="ppt" customUpload @uploader="fileUploader" auto
                      :chooseLabel="$t('general.select-file')" />
          <Button @click="deletePpt" icon="pi pi-trash" severity="danger" />
          <Button @click="saveEdit" icon="pi pi-save" :label="$t('general.save')" severity="success" />
          <Button @click="cancelEdit" icon="pi pi-times" :label="$t('general.cancel')" class="p-button-danger"
                  severity="secondary" />
        </div>
        <Button v-else @click="showEdit" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, onMounted, defineEmits, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  pptFilePath: {
    type: String,
    default: ''
  },
  chapterId: {
    type: String,
    required: true
  }
});

const { t } = useI18n();
const emit = defineEmits(['content-updated', 'delete-ppt']);
const toast = useToast();

const pptFileName = ref('');
const resolvedPptFilePath = ref('');
const editing = ref(false);
const file = ref({});

const openPowerPoint = async () => {
  if (resolvedPptFilePath.value) {
    await window.electron.openPptFile(resolvedPptFilePath.value);
  }
};

function getFileName(filePath) {
  if (!filePath) return '';
  return filePath.split('/').pop().split('\\').pop();
}

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

const resolveFilePath = async (filePath) => {
  if (!filePath) return '';
  
  try {
    const modifiedPath = await modifyPath(filePath);
    const isPackaged = await window.electron.isPackaged();
    
    const resolvedPath = await window.electron.resolvePath(modifiedPath);
    return resolvedPath;
  } catch (error) {
    console.error('Error resolving path:', error);
    return filePath;
  }
};

onMounted(async () => {
  resolvedPptFilePath.value = await resolveFilePath(props.pptFilePath);
});

watch(() => props.pptFilePath, async (newPath) => {
  if (newPath) {
    const modifiedPath = await modifyPath(newPath);
    pptFileName.value = getFileName(modifiedPath);
    resolvedPptFilePath.value = await resolveFilePath(modifiedPath);
  } else {
    pptFileName.value = '';
    resolvedPptFilePath.value = '';
  }
}, { immediate: true });

const fileUploader = async (event) => {
  const selectedFile = event.files[0];
  if (!selectedFile) {
    toast.add({
      severity: 'error',
      summary: t('general.uploadError'),
      detail: t('general.noFileSelected')
    });
    return;
  }

  const filePath = selectedFile.path || selectedFile.webkitRelativePath || selectedFile.name;
  const fileName = selectedFile.name;

  if (!filePath) {
    toast.add({
      severity: 'error',
      summary: t('general.uploadError'),
      detail: t('general.invalidFilePath')
    });
    return;
  }

  try {
    const targetDir = await window.electron.isPackaged() ? 'data/ppt/' : 'src/data/ppt/';
    const response = await window.electron.uploadPpt(filePath, fileName, targetDir);
    if (response.success) {
      file.value = {
        ...selectedFile,
        name: response.fileName,
        path: response.filePath,
      };
      pptFileName.value = response.fileName;
      resolvedPptFilePath.value = await resolveFilePath(response.filePath);

      const newContent = {
        name: response.fileName,
        path: response.filePath,
      };

      emit('content-updated', newContent);

      toast.add({
        severity: 'success',
        summary: t('general.uploadSuccess'),
        detail: t('general.fileUploaded', { name: response.fileName })
      });
    } else {
      toast.add({
        severity: 'error',
        summary: t('general.uploadError'),
        detail: response.message
      });
    }
  } catch (error) {
    console.error('Error uploading PowerPoint:', error);
    toast.add({
      severity: 'error',
      summary: t('general.uploadError'),
      detail: error.message
    });
  }
};

const saveEdit = async () => {
  if (!file.value.path || file.value.path === props.pptFilePath) {
    editing.value = false;
    return;
  }

  const content = {
    name: file.value.name,
    path: file.value.path,
  };

  emit('content-updated', content);
  toast.add({
    severity: 'success',
    summary: t('general.saveSuccess'),
    detail: t('general.pptUpdated')
  });

  editing.value = false;
};

const cancelEdit = () => {
  editing.value = false;
  file.value = {};
};

const deletePpt = () => {
  emit('delete-ppt');
};

const showEdit = () => {
  editing.value = true;
};
</script>

<style scoped>
.ppt-viewer {
  margin: 20px;
  position: relative;
}

.d-flex {
  display: flex;
  align-items: center;
}

.btn-view {
  height: 30px;
  margin-top: 10px;
}

.edit-button {
  height: 30px;
  left: 5px;
  padding: 5px 0;
  font-size: 14px;
  margin-top: 10px;
}

.file-name {
  font-style: italic;
  font-weight: bold;
}

.edit-controls {
  margin-top: 10px;
  margin-left: 10px;
}
</style>