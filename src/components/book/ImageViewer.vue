<template>
  <div>
    <Button v-if="!editing && images.length > 0" @click="startEdit" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
    <div v-if="!editing" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div v-for="(image, index) in images" :key="index" class="image-container" @mouseover="showEdit(index)" @mouseleave="hideEdit(index)">
        <img :src="image.src" @click="imageClick(index)" alt="" class="object-cover aspect-video" />
        <Button v-if="hoveredIndex === index" @click="startEditForImage(index)" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
      </div>
    </div>
    <div v-else>
      <div>
        <div class="flex justify-end gap-2">
          <FileUpload mode="basic" name="cover" accept="image/*" :maxFileSize="5000000"
                      customUpload @uploader="fileUploader($event, images[editingIndex])" auto
                      :chooseLabel="$t('general.select-file')" />
          <Button @click="deleteImage(editingIndex)" icon="pi pi-trash" severity="danger" />
          <Button @click="saveEdit" icon="pi pi-save" :label="$t('general.save')" severity="success" />
          <Button @click="cancelEdit" icon="pi pi-times" :label="$t('general.cancel')" class="p-button-danger" severity="secondary" />
        </div>
        <div>
          <label for="title">{{ $t('general.enter-title') }}</label>
          <InputText v-model="images[editingIndex].title" id="title" class="w-full" />
        </div>
        <div>
          <label for="description">{{ $t('general.enter-description') }}</label>
          <Textarea v-model="images[editingIndex].alt" id="description" class="w-full h-15" />
        </div>
        <div v-if="images[editingIndex].src" class="p-5">
          <img :src="images[editingIndex].src" class="h-56 w-full object-contain" />
        </div>
      </div>
    </div>
    <Galleria v-if="!editing" :value="images" v-model:activeIndex="activeIndex" v-model:visible="displayGallery"
              :fullScreen="true" :showItemNavigators="images.length > 1" :showItemNavigatorsOnHover="images.length > 1"
              :showThumbnails="images.length > 1" :numVisible="4" :circular="images.length > 1" containerStyle="width 100%">
      <template #item="slotProps">
        <img :src="slotProps.item.src" alt="" class="object-contain aspect-video" style="width: calc(80vw); height: calc(65vh)" />
      </template>
      <template #thumbnail="slotProps">
        <img :src="slotProps.item.thumb" alt="" class="max-h-14 md:max-h-24 object-cover px-2 aspect-video" />
      </template>
      <template #caption="slotProps">
        <div v-if="slotProps.item.title">
          <div class="mb-1 font-bold">{{ slotProps.item.title }}</div>
          <p class="text-sm m-0">{{ slotProps.item.alt }}</p>
        </div>
      </template>
    </Galleria>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['image-updated', 'image-deleted']);

const activeIndex = ref(0);
const displayGallery = ref(false);
const editing = ref(false);
const editingIndex = ref(null);
const hoveredIndex = ref(null);

const originalImage = ref({});

const imageClick = (index) => {
  activeIndex.value = index;
  displayGallery.value = true;
};

const startEdit = () => {
  editing.value = true;
};

const startEditForImage = (index) => {
  editing.value = true;
  editingIndex.value = index;
  originalImage.value = JSON.parse(JSON.stringify(props.images[index]));
};

const saveEdit = () => {
  if (JSON.stringify(originalImage.value) !== JSON.stringify(props.images[editingIndex.value])) {
    emit('image-updated', { index: editingIndex.value, image: props.images[editingIndex.value] });
  }
  editing.value = false;
  editingIndex.value = null;
  originalImage.value = {};
};

const cancelEdit = () => {
  props.images[editingIndex.value] = originalImage.value;
  editing.value = false;
  editingIndex.value = null;
  originalImage.value = {};
};

const deleteImage = (index) => {
  emit('image-deleted', index);
  if (props.images.length === 0) {
    editing.value = false;
  } else if (editingIndex.value === index) {
    editing.value = false;
    editingIndex.value = null;
  }
};

const fileUploader = async (event, image) => {
  const file = event.files[0];
  const filePath = file.path;
  const fileName = file.name;

  try {
    const response = await electron.uploadFile(filePath, fileName);
    if (response.success) {
      image.src = response.filePath;
      image.thumb = response.filePath;
    } else {
      console.error('Error uploading file:', response.message);
    }
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const showEdit = (index) => {
  hoveredIndex.value = index;
};

const hideEdit = (index) => {
  hoveredIndex.value = null;
};
</script>

<style scoped>
.edit-button {
  top: 5px;
  left:5px;
  /* width: 30px; */
  height: 30px;
  padding: 0 5px;
  font-size: 14px;
  bottom: 10px;
  position: absolute;
  visibility: hidden;
}

.image-container {
  position: relative;
  display: inline-block;
}

.image-container:hover .edit-button {
  visibility: visible;
}
</style>
