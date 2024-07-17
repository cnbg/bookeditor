<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { useBookStore } from '../../../stores/book';
import EditChapterDialog from './EditChapterDialog.vue';
import draggable from 'vuedraggable';

const props = defineProps({
  chapters: { type: Array, default: () => [] },
  search: { type: String, default: '' },
  parentId: { type: String, default: null },
});

const router = useRouter();
const toast = useToast();
const { t } = useI18n();
const bookSt = useBookStore();

const overlayPanel = ref(null);
const selectedChapter = ref(null);
const showEditDialog = ref(false);
const chapter = ref({});
const linkCopied = ref(false);
const copiedLink = ref('');
const expandedChapters = ref(new Set());

const draggableChapters = computed({
  get: () => props.chapters,
  set: async (value) => {
    try {
      await bookSt.reorderChapters(value);
      toast.add({ severity: 'success', summary: t('general.chapters-reordered'), life: 3000 });
    } catch (error) {
      console.error('Error reordering chapters:', error);
      toast.add({ severity: 'error', summary: t('general.reorder-failed'), detail: error.message, life: 3000 });
    }
  }
});

const toggleChapter = (chapter) => {
  if (expandedChapters.value.has(chapter.id)) {
    expandedChapters.value.delete(chapter.id);
  } else {
    expandedChapters.value.add(chapter.id);
  }
};

const isExpanded = (chapterId) => expandedChapters.value.has(chapterId);

const showAddButton = (chapter) => {
  return !chapter.parent && chapter.items === 0;
};

const addNewChapter = (parentId = null) => {
  chapter.value = bookSt.chapterObj({
    parent: parentId,
    book_id: bookSt.book.id,
  });
  showEditDialog.value = true;
};

const select = (chapter) => {
  if(bookSt.editing) {
    toast.add({severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000})
  } else {
    if(chapter.id === bookSt.chapter?.id) {
      bookSt.chapter = null
    } else {
      bookSt.chapter = chapter
      bookSt.chapter.expanded = true
    }
  }
}

const addChapterBtn = () => {
  chapter.value = bookSt.chapterObj({
    parent: bookSt.chapter?.id ?? null,
  })
  showEditDialog.value = true
}

const editChapterBtn = () => {
  chapter.value = { ...bookSt.chapter }
  showEditDialog.value = true
}

const copyLink = () => {
  const currentUrl = window.location.href;
  navigator.clipboard.writeText(currentUrl).then(() => {
    copiedLink.value = currentUrl;
    linkCopied.value = true;
  });
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(copiedLink.value).then(() => {
    toast.add({ severity: 'success', summary: t('general.link-copied'), life: 1000 });
    setTimeout(() => {
      linkCopied.value = false;
    }, 1000);
  });
};

const showOverlay = (event, chapter) => {
  selectedChapter.value = chapter;
  overlayPanel.value.toggle(event);
};

const onCloseDialog = async (ch = {}) => {
  const plainCh = JSON.parse(JSON.stringify(ch));

  if (plainCh.id) {
    await bookSt.updateChapter(plainCh);
  } else {
    await bookSt.saveChapter(plainCh);
  }
  chapter.value = {};
  showEditDialog.value = false;
};

const onDragStart = (evt) => {
  evt.item.style.opacity = 0.5;
};

const onDragEnd = (evt) => {
  evt.item.style.opacity = 1;
  bookSt.saveBookToFile();
};

const handleChapterClick = (chapter, event) => {
  // If the click is on the add button, don't select the chapter
  if (event.target.closest('.add-chapter-btn')) {
    return;
  }

  if (showAddButton(chapter)) {
    addNewChapter(chapter.id);
  } else {
    select(chapter);
    if (chapter.items > 0) {
      toggleChapter(chapter);
    }
  }
  event.stopPropagation();
};

</script>
<template>
  <div class="sidebar-zone" style="height: 100%;">
    <draggable
      v-model="draggableChapters"
      group="chapters"
      @start="onDragStart"
      @end="onDragEnd"
      item-key="id"
    >
      <template #item="{ element: chapter }">
        <div class="chapter-item-container">
          <Button
            class="btn-chapter my-1 mx-0 w-full flex items-center focus:ring-0"
            :class="{ 'selected': bookSt.chapter?.id === chapter.id }"
            :severity="bookSt.chapter?.id === chapter.id ? 'success' : ''"
            :text="bookSt.chapter?.id !== chapter.id"
            size="small"
            :outlined="bookSt.chapter?.id === chapter.id"
            @click="handleChapterClick(chapter, $event)"
            @contextmenu.prevent="showOverlay($event, chapter)"
          >
            <i
              :class="[
                'p-2 pi',
                chapter.items > 0 ? (isExpanded(chapter.id) ? 'pi-bookmark-fill' : 'pi-bookmark') : '',
                !chapter.parent ? 'pi-bookmark' : ''
              ]"
            ></i>
            <span
              class="flex-auto py-1 px-1 text-left"
              :class="{'ml-0': chapter.parent && chapter.items === 0}"
            >
              <i
                v-if="chapter.parent && chapter.items === 0"
                class="pi pi-circle-fill fs-2"
                style="font-size: 6px; top: -1px; position: relative; padding-right: 7px;"
              ></i>
              {{ chapter.title }}
            </span>
          </Button>
          <Button
            v-if="!isExpanded(chapter.id)"
            class="add-chapter-btn"
            icon="pi pi-plus"
            @click.stop="addNewChapter(chapter.id)"
            v-tooltip="$t('general.add-subchapter')"
          />
          <div v-if="chapter.items > 0 && isExpanded(chapter.id)" class="ml-4">
            <EditChapter :chapters="bookSt.getChapters(chapter.id)" :parentId="chapter.id" />
          </div>
        </div>
      </template>
    </draggable>

    <Button
      v-if="parentId === null"
      class="new-chapter-btn my-1 mx-0 w-full p-panel-header-icon p-link"
      severity="secondary"
      text
      @click="addNewChapter()"
    >
      <i class="pi pi-plus-circle mr-2"></i>
      {{ $t('general.new-chapter') }}
    </Button>

    <OverlayPanel ref="overlayPanel">
      <template #default>
        <button @click="addChapterBtn"
                class="p-panel-header-icon p-link"
                v-tooltip="$t('general.add-chapter')">
          <i class="pi pi-plus"></i>
        </button>
        <button v-if="bookSt.chapter"
                @click="editChapterBtn"
                class="p-panel-header-icon p-link ml-6"
                v-tooltip="$t('general.edit-chapter')">
          <i class="pi pi-pencil"></i>
        </button>
        <div class="copy-link-container">
          <button @click="copyLink" class="copy-link-button p-panel-header-icon p-link ml-6" v-tooltip="$t('general.Copy-link')">
            <i class="pi pi-link"></i>
          </button>
          <Dialog v-model:visible="linkCopied" modal style="max-width: 500px;">
            <div class="p-4">
              <div class="flex items-center mt-4">
                <InputText v-model="copiedLink" class="w-[25rem] mr-2" readonly />
                <Button @click="copyToClipboard">
                  <i class="pi pi-copy"></i>
                </Button>
              </div>
              <p class="text-lg mt-10"></p>
            </div>
          </Dialog>
        </div>
      </template>
    </OverlayPanel>

    <Dialog v-model:visible="showEditDialog" modal :header="$t('general.add-chapter')" class="w-30rem">
      <EditChapterDialog :chapter="chapter" :bookId="bookSt.book.id" @close="onCloseDialog" />
    </Dialog>
  </div>
</template>

<style scoped>
.chapter-item-container {
  position: relative;
}

.btn-chapter {
  padding: 0 30px 0 0;
  outline: none !important;
}

.btn-chapter.selected {
  font-weight: bold;
}

.add-chapter-btn {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  padding: 4px;
  margin: 0;
  background: none;
  color: var(--primary-600);
  font-size: 12px;
  border-radius: 50%;
  height: 20px;
  width: 20px;
}

.chapter-item-container:hover > .add-chapter-btn {
  opacity: 1;
}

.new-chapter-btn {
  background: #dcfbff;
  border: 1px dashed #ccc;
  transition: all 0.3s ease;
  padding: 5px 0;
}

.new-chapter-btn:hover {
  background-color: #f0f0f0;
  border-color: #999;
}

.new-chapter-btn i {
  font-size: 14px;
}

.sortable-ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.sortable-drag {
  opacity: 0.5;
}
</style>