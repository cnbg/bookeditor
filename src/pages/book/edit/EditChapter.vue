<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { useBookStore } from '../../../stores/book';
import EditChapterDialog from './EditChapterDialog.vue';


const props = defineProps({
  chapters: { type: Array, default: [] },
  search: { type: String, default: '' },
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

    router.push({name: 'book-edit', params: {bookId: bookSt.book.id, chapterId: bookSt.chapter?.id}})
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

const onCloseDialog = (ch = {}) => {
  const plainCh = JSON.parse(JSON.stringify(ch));

  if (plainCh.id) {
    bookSt.updateChapter(plainCh);
  } else {
    plainCh.book_id = bookSt.book.id;
    bookSt.saveChapter(plainCh);
  }
  chapter.value = {};
  showEditDialog.value = false;
};
</script>

<template>
  <div>
    <div v-for="chapter in chapters" :key="chapter.id">
      <Button class="btn-chapter my-1 mx-0 w-full flex items-center focus:ring-0"
              :severity="bookSt.chapter?.id === chapter.id ? 'success' : ''"
              :text="bookSt.chapter?.id !== chapter.id"
              size="small"
              :outlined="bookSt.chapter?.id === chapter.id"
              @contextmenu.prevent="showOverlay($event, chapter)">
        <i v-if="chapter.items > 0"
           @click="chapter.expanded = !chapter.expanded"
           class="p-2 pi"
           :class="chapter.expanded ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
        <span @click="select(chapter)"
              class="flex-auto py-1 px-1 text-left"
              :class="{'ml-8': chapter.items === 0}">{{ chapter.title }}</span>
      </Button>
      <div v-if="chapter.items > 0" v-show="chapter.expanded" class="ml-4">
        <EditChapter :chapters="bookSt.getChapters(chapter.id)" />
      </div>
    </div>

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
.btn-chapter {
  padding: 0;
  outline: none !important;
}
.copy-link-container {
  position: relative;
  display: inline-block;
}
.copy-link-container .copy-link-button {
  margin-right: 10px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>
