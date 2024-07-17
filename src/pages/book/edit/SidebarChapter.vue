<template>
  <div>
    <Panel>
      <template #header>
        <div>{{ $t('general.chapters') }}</div>
      </template>
      <template #icons>
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
          <button @click="copyLink"
                  class="copy-link-button p-panel-header-icon p-link ml-6"
                  v-tooltip="$t('general.Copy-link')">
            <i class="pi pi-link"></i>
          </button>
          <Dialog v-model:visible="linkCopied" modal style="max-width: 500px;">
            <div class="p-4">
              <div class="flex items-center mt-4">
                <InputText v-model="copiedLink" class="w-[25rem] mr-2" readonly />
                <Button @click="copyToClipboard"
                v-tooltip="$t('general.Copy')">
                  <i class="pi pi-copy"></i>
                </Button>
              </div>
              <p class="text-lg mt-10"></p>
            </div>
          </Dialog>
        </div>
      </template>
      <div class="flex flex-col">
        <ScrollPanel class="w-full" style="height: calc(100vh - 210px)">
          <EditChapter :chapters="bookSt.getChapters(null)" />
          <ScrollTop target="parent" :threshold="100" icon="pi pi-arrow-up" />
        </ScrollPanel>
      </div>
      <Dialog v-model:visible="showEditDialog" modal :header="$t('general.add-chapter')" class="w-30rem">
        <EditChapterDialog :chapter="chapter" :bookId="bookSt.book.id" @close="onCloseDialog" />
      </Dialog>
    </Panel>
  </div>
</template>

<script setup>
import EditChapter from './EditChapter.vue'
import EditChapterDialog from './EditChapterDialog.vue'
import { ref } from 'vue'
import { useBookStore } from '../../../stores/book'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'

const { t } = useI18n()
const toast = useToast()
const bookSt = useBookStore()
const chapter = ref({})
const showEditDialog = ref(false)
const linkCopied = ref(false)
const copiedLink = ref('')



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


const copyLink = () => {
  const currentUrl = window.location.href
  navigator.clipboard.writeText(currentUrl)
    .then(() => {
      copiedLink.value = currentUrl
      linkCopied.value = true
    })
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(copiedLink.value)
    .then(() => {
      toast.add({severity: 'success', summary: t('general.link-copied'), life: 1000})
      setTimeout(() => {
        linkCopied.value = false
      }, 1000)
    })
}
</script>

<style scoped>
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
