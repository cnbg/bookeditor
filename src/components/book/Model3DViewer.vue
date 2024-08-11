<template>
  <div>
    <div v-if="!editing" class="model-container" @mouseover="showEdit" @mouseleave="hideEdit">
      <Fieldset>
      <model-viewer tone-mapping="neutral" shadow-intensity="1" ar camera-controls touch-action="pan-y"
        :src="model.path" :alt="model.name" class="h-96 mx-auto w-full" >
      </model-viewer>
      </Fieldset>
      <Button v-if="isHovered" @click="startEdit" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
    </div>
    <div v-else class="model-container">
      <div class="flex justify-end gap-2 edit-controls">
        <FileUpload mode="basic" name="cover" accept=".obj,.fbx,.glb,.gltf,.stl,.amf,.iges,.max,.stp,.x3d,.vrml,.3ds,.3mf"
                  customUpload @uploader="fileUploader" auto
                  :chooseLabel="$t('general.select-file')" />
        <Button @click="deleteModel" icon="pi pi-trash" severity="danger" />
        <Button @click="saveEdit" icon="pi pi-save" :label="$t('general.save')" severity="success" />
        <Button @click="cancelEdit" icon="pi pi-times" :label="$t('general.cancel')" class="p-button-danger"
          severity="secondary" />
      </div>
    <Fieldset>
      <model-viewer tone-mapping="neutral" shadow-intensity="1" ar camera-controls touch-action="pan-y"
        :src="file.path || model.path" :alt="model.name" class="h-96 mx-auto w-full">
      </model-viewer>
    </Fieldset>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits, defineProps } from 'vue';
import '@google/model-viewer';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits(['content-updated', 'delete-model']);
const props = defineProps(['model']);
const file = ref({});
const editing = ref(false);
const isHovered = ref(false);

const startEdit = () => {
  editing.value = true;
};

const saveEdit = () => {
  if (!file.value.path || file.value.path === props.model.path) {
    editing.value = false;
    return;
  }

  props.model.path = file.value.path;
  emit('content-updated', props.model);
  editing.value = false;
};

const cancelEdit = () => {
  editing.value = false;
};

const deleteModel = () => {
  emit('delete-model');
};

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
      console.error('Error uploading model:', response.message);
    }
  } catch (error) {
    console.error('Error uploading model:', error);
  }
};

const showEdit = () => {
  isHovered.value = true;
};

const hideEdit = () => {
  isHovered.value = false;
};
</script>

<style scoped>
.edit-button {
  /* width: 30px; */
  height: 30px;
  left:23px;
  /* padding: 0; */
    /* width: 30px; */
  /* height: 30px; */
  padding: 0 5px;
  font-size: 14px;
  position: absolute;
  top: 5px;
  right: 10px;
  visibility: hidden;
}

.model-container {
  position: relative;
}

.model-container:hover .edit-button {
  visibility: visible;
}

.edit-controls {
  margin-bottom: 10px;
}


</style>
