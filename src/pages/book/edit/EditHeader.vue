<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { formatDate } from '../../../lib/date'
import { useBookStore } from '../../../stores/book'
import { exportBookAsZip } from '../../../lib/exportzip'

const bookSt = useBookStore()
const {t} = useI18n()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const menu = ref(null)

const toggle = (event) => {
  menu.value.toggle(event)
}

const goto = (route, params = {}) => {
  if(bookSt.editing) {
    toast.add({severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000})
  } else {
    router.push({name: route, params: params})
  }
}

const dev = () => {
  toast.add({severity: 'info', summary: t('general.under-development'), life: 4000})
}

const confirmDialog = () => {
  confirm.require({
    group: 'headless',
    accept: () => {
      bookSt.deleteBook(bookSt.book.id)
      toast.add({severity: 'info', summary: t('general.book-deleted'), life: 4000})
      router.push({name: 'book-list'})
    },
    reject: () => { },
  })
}

/* const syncToServe = () => {
  console.log(JSON.stringify(bookSt.book))
  toast.add({severity: 'info', summary: t('general.under-development'), life: 4000})
} */

const items = ref([
  {label: t('general.book-list'), icon: 'pi pi-list', command: () => {goto('book-list')}},
  {separator: true},
  {
    label: t('general.view-book'), icon: 'pi pi-eye', command: () => {
      goto('book-view', {bookId: bookSt.book.id})
    },
  },
  { separator: true },
  {
    label: t('general.export-book'), icon: 'pi pi-file-export', command: () => {
      exportBookAsZip(bookSt.book)
    },
  },
  /* {separator: true},
  {label: t('general.sync-with-server'), icon: 'pi pi-sync', command: () => {syncToServe()}}, */
  {separator: true},
  {label: t('general.delete'), icon: 'pi pi-times', command: () => {confirmDialog()}},
])

const goBack = () => {
  router.back()
}

const goTo = (route, params = {}) => {
  if(bookSt.editing) {
    toast.add({severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000})
  } else {
    if (route === 'home') {
      router.push({ path: '/' });
    } else if (route === 'back') {
      goBack();
    } else {
      router.push({ name: route, params: params });
    }
  }
}

</script>

<template>
  <div>
    <Panel toggleable :collapsed="true">
      <template #header>
        <div class="text-2xl m-0 p-2">{{ bookSt.book.title }}</div>
      </template>
      <template #footer>
        <div class="flex items-center gap-3">
          <Button @click="dev" icon="pi pi-user" severity="secondary" rounded text />
          <Button @click="dev" icon="pi pi-bookmark" severity="secondary" rounded text />
          <span class="grow"></span>
          <span>{{ formatDate(bookSt.book.date) }}</span>
        </div>
      </template>
      <template #icons>
        <button class="p-panel-header-icon p-link mr-6" @click="goTo('back')">
          <span class="pi pi-arrow-left"></span>
        </button>
        <button class="p-panel-header-icon p-link mr-6" @click="goTo('home')">
          <span class="pi pi-home"></span>
        </button>
        <button class="p-panel-header-icon p-link mr-4" @click="toggle">
          <span class="pi pi-cog"></span>
        </button>
        <Menu ref="menu" id="config_menu" :model="items" popup />
      </template>
      <div class="py-3">{{ bookSt.book.desc }}</div>
      <div v-if="bookSt.book.tags?.length > 0" class="flex flex-wrap gap-x-2 gap-y-4 py-3 button-icon">
        <Chip v-for="tag in bookSt.book.tags" :label="tag" class="text-sm" />
      </div>
    </Panel>
  </div>
</template>

<style scoped>
</style>
