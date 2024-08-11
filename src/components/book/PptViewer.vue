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
        <FileUpload mode="basic" name="ppt" accept=".ppt,.pptx"
                    customUpload @uploader="fileUploader" auto
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
import { defineProps, ref, onMounted, defineEmits } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  pptFilePath: {
    type: String,
    default: ''
  }
});
const { t } = useI18n();
const emit = defineEmits(['content-updated', 'delete-ppt']);

const pptFileName = ref(getFileName(props.pptFilePath));
const resolvedPptFilePath = ref('');
const editing = ref(false);

const openPowerPoint = async () => {
  if (resolvedPptFilePath.value) {
    await window.electron.openPptFile(resolvedPptFilePath.value);
  }
};

function getFileName(filePath) {
  if (!filePath) return '';
  return filePath.split('/').pop().split('\\').pop();
}

const resolveFilePath = async (filePath) => {
  try {
    const isPackaged = await window.electron.isPackaged();
    if (isPackaged) {
      return await window.electron.resolvePath(filePath);
    }
    return await window.electron.resolvePath(filePath);
  } catch (error) {
    console.error('Error resolving path:', error);
  }
};

onMounted(async () => {
  resolvedPptFilePath.value = await resolveFilePath(props.pptFilePath);
});

const file = ref({});

const fileUploader = async (event) => {
  const selectedFile = event.files[0];
  const filePath = selectedFile.path;
  const fileName = selectedFile.name;

  try {
    const response = await window.electron.uploadPpt(filePath, fileName, 'src/data/ppt/');
    if (response.success) {
      file.value = {
        ...selectedFile,
        path: response.filePath,
      };
      pptFileName.value = fileName;
    } else {
      console.error('Error uploading PowerPoint:', response.message);
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

const saveEdit = () => {
  if (!file.value.path || file.value.path === props.pptFilePath) {
    editing.value = false;
    return;
  }

  const content = {
    name: file.value.name,
    path: file.value.path,
  };
  emit('content-updated', content);
  editing.value = false;
};

const cancelEdit = () => {
  editing.value = false;
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
  /* width: 30px; */
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
