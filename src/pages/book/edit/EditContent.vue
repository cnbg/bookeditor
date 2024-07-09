<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useBookStore } from '../../../stores/book'

const bookSt = useBookStore()
const {t} = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const editMenu = ref(null)

const toggleEditMenu = (event) => {
  editMenu.value.toggle(event)
}

const goto = (route, params = {}) => {
  if(bookSt.editing) {
    toast.add({severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000})
  } else {
    router.push({name: route, params: params})
  }
}

const confirmDeleteDialog = () => {
  confirm.require({
    group: 'headless',
    accept: () => {
      if(bookSt.deleteChapter()) {
        toast.add({severity: 'info', summary: t('general.successfully-deleted'), life: 4000})
      }
    },
    reject: () => { },
  })
}

const confirmCloseDialog = () => {
  bookSt.closeEditor()
  // confirm.require({
  //   group: 'headless',
  //   message: t('general.have-you-saved-your-work-before-closing'),
  //   accept: () => {
  //     bookSt.closeEditor()
  //   },
  //   reject: () => { },
  // })
}

const dev = () => {
  toast.add({severity: 'info', summary: t('general.under-development'), life: 4000})
}

const items = ref([
  {
    label: t('general.view-chapter'), icon: 'pi pi-eye', command: () => {
      goto('book-view', {bookId: bookSt.book.id, chapterId: bookSt.chapter?.id})
    },
  },
  {separator: true},
  {label: t('general.add-text'), icon: 'pi pi-file-word', command: () => {bookSt.setEditor('html')}},
  {label: t('general.add-image'), icon: 'pi pi-image', command: () => {bookSt.setEditor('image')}},
  {label: t('general.add-video'), icon: 'pi pi-video', command: () => {bookSt.setEditor('video')}},
  {label: t('general.add-model'), icon: 'pi pi-box', command: () => {bookSt.setEditor('model')}},
  // {label: t('general.add-test'), icon: 'pi pi-list', command: () => {bookSt.setEditor('test')}},
  {label: t('general.add-powerpoint'), icon: 'pi pi-file-plus', command: () => {bookSt.setEditor('powerpoint')}},
  
  {separator: true},
  {label: t('general.delete'), icon: 'pi pi-times', command: () => {confirmDeleteDialog()}},
])
</script>

<template>
  <div>
    <Panel v-if="bookSt.chapter">
      <template #header>
        <div class="m-0">{{ bookSt.chapter.title }}</div>
      </template>
      <template #icons>
        <div v-show="bookSt.editing">
          <button @click="confirmCloseDialog" class="p-panel-header-icon p-link">
            <span class="pi pi-times"></span>
          </button>
        </div>
        <div v-show="!bookSt.editing">
          <button class="p-panel-header-icon p-link" @click="toggleEditMenu">
            <span class="pi pi-cog"></span>
          </button>
          <Menu ref="editMenu" :model="items" popup />
        </div>
      </template>
      <div class="flex flex-wrap items-center justify-between">
        <Button @click="bookSt.setEditor('html')" size="small" icon="pi pi-file-word" :label="t('general.add-text')" text />
        <Button @click="bookSt.setEditor('image')" size="small" icon="pi pi-image" :label="t('general.add-image')" text />
        <Button @click="bookSt.setEditor('video')" size="small" icon="pi pi-video" :label="t('general.add-video')" text />
        <Button @click="bookSt.setEditor('model')" size="small" icon="pi pi-box" :label="t('general.add-model')" text />
        <!-- <Button @click="bookSt.setEditor('test')" size="small" icon="pi pi-list" :label="t('general.add-test')" text /> -->
        <Button @click="bookSt.setEditor('powerpoint')" size="small" icon="pi pi-file-plus" :label="t('general.add-powerpoint')" text />
        
      </div>
      <hr class="my-2">
      <div v-if="bookSt.editing">
        <ContentEditor />
      </div>
      <ScrollPanel v-else class="" style="height: calc(100vh - 283px)">
        <ContentViewer :chapter="bookSt.chapter" />
        <ScrollTop target="parent" :threshold="100" icon="pi pi-arrow-up" />
      </ScrollPanel>
    </Panel>
    <Panel v-else>
      <template #header>
        <div> &nbsp;</div>
      </template>
      <div v-if="bookSt.book.cover" style="height: calc(100vh - 210px)" class="p-8">
        <img :src="bookSt.book.cover" class="w-full h-full object-contain" />
      </div>
    </Panel>
  </div>
</template>

<style>
.chapter-content div[data-pc-section='content'] {
  padding: 0 !important;
}
</style>
