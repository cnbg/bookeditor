<template>
  <div>
    <div v-if="!editing" class="video-container" @mouseover="showEdit" @mouseleave="hideEdit">
      <Fieldset>
        <CustomVideoPlayer
          v-if="resolvedVideoPath || file.path || defaultVideoPath"
          :src="resolvedVideoPath || file.path || defaultVideoPath"
          :poster="''"
          crossorigin="anonymous"
          :playsinline="true"
          :controls="true"
          :volume="0.6"
          :height="320"
          :playback-rates="[0.7, 1.0, 1.5, 2.0]"
          @mounted="handleMounted"
          @ready="handleEvent($event)"
          @play="handleEvent($event)"
          @pause="handleEvent($event)"
          @ended="handleEvent($event)"
          @loadeddata="handleEvent($event)"
          @waiting="handleEvent($event)"
          @playing="handleEvent($event)"
          @canplay="handleEvent($event)"
          @canplaythrough="handleEvent($event)"
          @timeupdate="handleEvent($event)"
        />
      </Fieldset>
      <Button v-if="isHovered" @click="startEdit" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
    </div>
    <div v-else class="video-container">
      <div class="flex justify-end gap-2 edit-controls">
        <FileUpload
          mode="basic"
          name="cover"
          accept="video/mp4,video/x-m4v,video/*"
          customUpload
          @uploader="fileUploader"
          auto
          :chooseLabel="$t('general.select-file')"
        />
        <Button @click="deleteVideo" icon="pi pi-trash" severity="danger" />
        <Button @click="saveEdit" icon="pi pi-save" :label="$t('general.save')" severity="success" />
        <Button @click="cancelEdit" icon="pi pi-times" :label="$t('general.cancel')" class="p-button-danger" severity="secondary" />
      </div>
      <Fieldset>
        <CustomVideoPlayer
          v-if="resolvedVideoPath || file.path || defaultVideoPath"
          :src="resolvedVideoPath || file.path || defaultVideoPath"
          :poster="''"
          crossorigin="anonymous"
          :playsinline="true"
          :controls="true"
          :volume="0.6"
          :height="320"
          :playback-rates="[0.7, 1.0, 1.5, 2.0]"
          @mounted="handleMounted"
          @ready="handleEvent($event)"
          @play="handleEvent($event)"
          @pause="handleEvent($event)"
          @ended="handleEvent($event)"
          @loadeddata="handleEvent($event)"
          @waiting="handleEvent($event)"
          @playing="handleEvent($event)"
          @canplay="handleEvent($event)"
          @canplaythrough="handleEvent($event)"
          @timeupdate="handleEvent($event)"
        />
      </Fieldset>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, defineEmits, onMounted, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useI18n } from 'vue-i18n'
import CustomVideoPlayer from './CustomVideoPlayer.vue';

const { t } = useI18n()
const props = defineProps({
  video: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['content-updated', 'delete-video']);

const file = ref({});
const editing = ref(false);
const player = ref(null);
const isHovered = ref(false);
const defaultVideoPath = ref('path/to/default/video.mp4');
const originalVideo = ref({ ...props.video });
const resolvedVideoPath = ref('');

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
    console.log('Modified video path:', modifiedPath);
    console.log('Resolved video path:', resolvedPath);
    return resolvedPath;
  } catch (error) {
    console.error('Error resolving path:', error);
    return filePath;
  }
};

onMounted(async () => {
  if (props.video?.path) {
    resolvedVideoPath.value = await resolveFilePath(props.video.path);
  }
});

watch(() => props.video?.path, async (newPath) => {
  if (newPath) {
    console.log('Original video path:', newPath);
    resolvedVideoPath.value = await resolveFilePath(newPath);
  } else {
    resolvedVideoPath.value = '';
  }
}, { immediate: true });

const handleMounted = (payload) => {
  player.value = payload.player;
};

const handleEvent = (log) => {
  console.log('Player event:', log);
};

const startEdit = () => {
  editing.value = true;
};

const saveEdit = () => {
  if (file.value.path) {
    props.video.path = file.value.path;
  }
  if (JSON.stringify(originalVideo.value) !== JSON.stringify(props.video)) {
    emit('content-updated', props.video);
    originalVideo.value = { ...props.video };
  }
  editing.value = false;
};

const cancelEdit = () => {
  props.video.path = originalVideo.value.path;
  editing.value = false;
};

const deleteVideo = () => {
  emit('delete-video');
};

const fileUploader = async (event) => {
  const video = event.files[0];
  const filePath = video.path;
  const fileName = video.name;

  try {
    const targetDir = await window.electron.isPackaged() ? 'data/videos/' : 'src/data/videos/';
    const response = await window.electron.uploadVideo(filePath, fileName);
    if (response.success) {
      file.value.path = response.filePath;
      resolvedVideoPath.value = await resolveFilePath(response.filePath);
    } else {
      console.error('Error uploading video:', response.message);
    }
  } catch (error) {
    console.error('Error uploading video:', error);
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
  height: 30px;
  left:25px;
  padding: 5px 10px;
  font-size: 14px;
  position: absolute;
  top: 5px;
  right: 25px;
  visibility: hidden;
}

.video-player {
  background-color: black;
  width: 100%;
}

.video-container {
  position: relative;
}

:deep(.video-container legend){
  width: 100%;
}

.video-container:hover .edit-button {
  visibility: visible;
}
.edit-controls {
  margin-bottom: 10px;
}
</style>