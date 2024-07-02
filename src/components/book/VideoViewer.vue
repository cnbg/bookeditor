<template>
  <div>
    <div v-if="!editing" class="video-container" @mouseover="showEdit" @mouseleave="hideEdit">
      <Fieldset>
      <video-player
        v-if="video.path || file.path || defaultVideoPath"
        class="video-player vjs-big-play-centered"
        :src="file.path || video.path || defaultVideoPath"
        poster=""
        crossorigin="anonymous"
        playsinline
        controls
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
        @timeupdate="handleEvent(player?.currentTime())"
      />
    </Fieldset>
      <Button v-if="isHovered" @click="startEdit" icon="pi pi-pencil" class="edit-button" />
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
      <video-player
        v-if="file.path || video.path || defaultVideoPath"
        class="video-player vjs-big-play-centered"
        :src="file.path || video.path || defaultVideoPath"
        poster=""
        crossorigin="anonymous"
        playsinline
        controls
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
        @timeupdate="handleEvent(player?.currentTime())"
      />
    </Fieldset>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, defineEmits } from 'vue';
import { VideoPlayer } from '@videojs-player/vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

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
const defaultVideoPath = ref('path/to/default/video.mp4'); // Add a default video path here
const originalVideo = ref({ ...props.video });

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
    originalVideo.value = { ...props.video };  // update the original video to the new state
  }
  editing.value = false;
};

const cancelEdit = () => {
  props.video.path = originalVideo.value.path;  // revert changes
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
    const response = await electron.uploadVideo(filePath, fileName);
    if (response.success) {
      file.value.path = response.filePath;
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
  width: 30px;
  height: 30px;
  left:23px;
  padding: 0;
  font-size: 14px;
  position: absolute;
  top: 5px;
  right: 10px;
  visibility: hidden;
}

.video-player {
  background-color: black;
  width: 100%;
}

.video-container {
  position: relative;
}

.video-container:hover .edit-button {
  visibility: visible;
}
.edit-controls {
  margin-bottom: 10px;
}
</style>
