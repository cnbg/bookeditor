<template>
  <div class="flex flex-col gap-8">
    <div v-for="(block, index) in chapter?.blocks" :key="index">
      <HtmlViewer v-if="block && block.type === 'html'" :html="block.content.html" :backgroundColor="block.content.backgroundColor" @content-updated="updateContent(index, $event)" />
      <ImageViewer v-else-if="block && block.type === 'image'" :images="block.content" @image-updated="updateImage(index, $event)" @image-deleted="deleteImage(index, $event)" />
      <VideoViewer v-else-if="block && block.type === 'video'" :video="block.content" @content-updated="updateVideo(index, $event)" @delete-video="deleteVideo(index)" />
      <Model3DViewer v-else-if="block && block.type === 'model'" :model="block.content" @content-updated="updateModel(index, $event)" @delete-model="deleteModel(index)" />
      <TestViewer v-else-if="block && block.type === 'test'" :test="block.content" />
      <PptViewer v-else-if="block && block.type === 'powerpoint'" :pptFilePath="block.content.path"
                 @content-updated="updatePpt(index, $event)" @delete-ppt="deletePpt(index)" />
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { useBookStore } from '../../stores/book';

const props = defineProps(['chapter']);
const bookStore = useBookStore();

const updateContent = (index, updatedContent) => {
  bookStore.updateBlockContent(index, updatedContent);
};

const updateImage = (index, { index: imageIndex, image }) => {
  bookStore.updateImageBlock(index, imageIndex, image);
};

const deleteImage = (index, imageIndex) => {
  bookStore.deleteImageBlock(index, imageIndex);
};

const updateVideo = (index, updatedVideo) => {
  bookStore.updateVideoBlock(index, updatedVideo);
};

const deleteVideo = (index) => {
  bookStore.deleteVideoBlock(index);
};

const updateModel = (index, updatedModel) => {
  bookStore.updateModelBlock(index, updatedModel);
};

const deleteModel = (index) => {
  bookStore.deleteModelBlock(index);
};

const updatePpt = (index, updatedPpt) => {
  bookStore.updatePptBlock(index, updatedPpt);
};

const deletePpt = (index) => {
  bookStore.deletePptBlock(index);
};
</script>

<style scoped>

</style>
