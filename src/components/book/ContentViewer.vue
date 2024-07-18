<template>
  <div class="flex flex-col gap-8">
    <div v-if="chapter && chapter.items > 0" class="child-chapters-list">
      <Menu :model="childChapterItems" class="p-4">
        <template #item="{ item }">
            <a href="#" @click.prevent="handleChapterClick(item.chapter, $event)">
                <span style="font-size: 10px; top: -2px; position: relative;" class="pi pi-chevron-right fs-1" />
                <span class="ml-2">{{ item.label }}</span>
            </a>
        </template>
      </Menu>
    </div>

    <div v-for="(block, index) in chapter?.blocks" :key="index">
      <HtmlViewer
        v-if="block && block.type === 'html'"
        :html="block.content.html ? block.content.html : block.content"
        :backgroundColor="block.content.backgroundColor"
        @content-updated="updateContent(index, $event)"
      />
      <ImageViewer
        v-else-if="block && block.type === 'image'"
        :images="Array.isArray(block.content) ? block.content : block.content.html"
        @image-updated="updateImage(index, $event)"
        @image-deleted="deleteImage(index, $event)"
      />
      <VideoViewer
        v-else-if="block && block.type === 'video'"
        :video="block.content.html ? block.content.html : block.content"
        @content-updated="updateVideo(index, $event)"
        @delete-video="deleteVideo(index)"
      />
      <Model3DViewer
        v-else-if="block && block.type === 'model'"
        :model="block.content.html ? block.content.html : block.content"
        @content-updated="updateModel(index, $event)"
        @delete-model="deleteModel(index)"
      />
      <TestViewer
        v-else-if="block && block.type === 'test'"
        :test="block.content.html ? block.content.html : block.content"
      />
      <PptViewer
        v-else-if="block && block.type === 'powerpoint'"
        :pptFilePath="block.content.html ? block.content.html.path : block.content.path"
        @content-updated="updatePpt(index, $event)"
        @delete-ppt="deletePpt(index)"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import Menu from 'primevue/menu';

const props = defineProps(['chapter', 'onChapterSelect']);
const bookStore = useBookStore();
const toast = useToast();
const { t } = useI18n();
const router = useRouter();

const childChapters = computed(() => {
  if (props.chapter && props.chapter.items > 0) {
    return bookStore.getChapters(props.chapter.id);
  }
  return [];
});

const childChapterItems = computed(() => {
  return childChapters.value.map(chapter => ({
    label: chapter.title,
    chapter: chapter,
  }));
});

const handleChapterClick = (chapter, event) => {
  if (bookStore.editing) {
    toast.add({severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000});
  } else {
    if (chapter.id === bookStore.chapter?.id) {
      bookStore.chapter = null;
    } else {
      bookStore.chapter = chapter;
      bookStore.chapter.expanded = true;
    }
  }
  event.stopPropagation();
};

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
.child-chapters-list {
  margin-top: 1rem;
}

.child-chapters-list :deep(.p-menu) {
  width: 100%;
  border: none;
  background: transparent;
}

.child-chapters-list :deep(.p-menu-list) {
  padding: 0;
}

.child-chapters-list :deep(.p-menuitem) {
  margin-bottom: 0.5rem;
}

.child-chapters-list :deep(.p-menuitem-link) {
  padding: 0.5rem;
}

.child-chapters-list :deep(.p-menuitem-link:hover) {
  background-color: var(--surface-100);
}

.child-chapters-list :deep(.p-menuitem-icon) {
  color: var(--primary-color);
}
</style>