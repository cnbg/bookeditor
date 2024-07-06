<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../../stores/user'
import { useBookStore } from '../../stores/book'
import { exportPdf } from '../../lib/exportpdf'
import { exportBookAsZip } from '../../lib/exportzip'


const props = defineProps({
  bookId: { type: String, required: true },
  chapterId: { type: String },
})

const router = useRouter()
const { t } = useI18n()
const menu = ref(null)
const page = ref(-1)
const pager = ref(true)
const showSendDialog = ref(false)

const userSt = useUserStore()
const bookSt = useBookStore()
bookSt.getBook(props.bookId, props.chapterId)

const toggleMenu = (event) => {
  menu.value.toggle(event)
}

const panelMenuItems = ref([
  {
    label: t('general.edit'), icon: 'pi pi-pencil', command: () => {
      router.push({ name: 'book-edit', params: { bookId: props.bookId, chapterId: bookSt.chapter?.id } })
    },
  },
  { separator: true },
  {
    label: t('general.change-view-format'),
    icon: 'pi pi-images', command: () => { pager.value = !pager.value },
  },
  { separator: true },
  {
    label: t('general.send'), icon: 'pi pi-send', command: () => {
      showSendDialog.value = true
    },
  },
  { separator: true },
  {
    label: t('general.download-as-pdf'), icon: 'pi pi-download', command: () => {
      const html = document.querySelector('#html-content').innerHTML
      exportPdf(html, bookSt.book?.title)
    },
  },
  { separator: true },
  {
    label: t('general.export-book'), icon: 'pi pi-file-export', command: () => {
      exportBookAsZip(bookSt.book)
    },
  },
])

let totalChapters = (bookSt.book?.chapters?.length || 1) - 1

const goTo = (route, params = {}) => {
  if (bookSt.editing) {
    toast.add({ severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000 })
  } else {
    if (route === 'home') {
      router.push({ path: '/' });
    } else {
      router.push({ name: route, params: params });
    }
  }
}
</script>

<template>
  <div class="py-2 md:py-6 px-1 md:px-2 ">
    <div v-if="bookSt.book"
         class="mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-3/5">
      <div class="bg-surface-0 dark:bg-surface-900 py-3 px-5 rounded-lg flex items-center gap-3">
        <div class="text-2xl m-0 flex-auto">{{ bookSt.book.title }}</div>
        <Button @click="toggleMenu" icon="pi pi-cog" text plain />
        <Button  icon="pi pi-times" text plain   @click="goTo('home')">
        </Button>
        <Menu ref="menu" :model="panelMenuItems" popup />
      </div>
      <div v-if="chapterId && bookSt.chapter">
        <div id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-8 p-4 md:p-12 rounded-lg">
          <ContentViewer :chapter="bookSt.chapter" />
        </div>
      </div>
      <div v-else>
        <div v-if="page < 0" id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-8 p-4 md:p-12 rounded-lg">
          <img :src="bookSt.book.cover" class="w-full h-full object-contain" />
        </div>
        <div v-if="pager">
          <div v-if="page >= 0" id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-8 p-4 md:p-12 rounded-lg">
            <ContentViewer :chapter="bookSt.book.chapters[page]" />
          </div>
          <div class="h-7"></div>
        </div>
        <div v-else id="html-content">
          <div v-for="chapter in bookSt.book.chapters" :key="chapter.id"
               class="bg-surface-0 dark:bg-surface-900 my-3 md:my-8 p-4 md:p-12 rounded-lg">
            <ContentViewer :chapter="chapter" />
          </div>
        </div>
        <div v-if="pager" class="fixed bottom-0 left-0 right-0 px-5 md:px-2 py-5 text-center w-full">
          <div class="flex justify-between flex-col sm:flex-row gap-4 mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-3/5">
            <Button :disabled="page < 0" size="small"
                    :severity="userSt.darkMode ? 'success' : 'secondary'"
                    class="w-full text-sm font-bold flex items-center gap-3"
                    @click="page >= 0 ? page-- : null">
              <i class="pi pi-chevron-left"></i>
              <span class="truncate grow">
                {{ bookSt.book.chapters[page >= 0 ? page - 1 : page]?.title ?? $t('general.homepage') }}
              </span>
            </Button>
            <Button :disabled="page >= totalChapters" size="small"
                    :severity="userSt.darkMode ? 'success' : 'secondary'"
                    class="w-full text-sm font-bold flex items-center gap-3"
                    @click="page < totalChapters ? page++ : null">
              <span class="truncate grow">{{ bookSt.book.chapters[page < totalChapters ? page + 1 : totalChapters]?.title ?? '' }}</span>
              <i class="pi pi-chevron-right"></i>
            </Button>
          </div>
        </div>
      </div>
    </div>
    <NotFoundPage v-else />

    <Dialog v-model:visible="showSendDialog" modal :header="$t('general.link')" :style="{ width: '25rem' }">
      <div class="flex align-items-center gap-3 mb-5">
        https://localhost/{{ $route.path }}
      </div>
      <div class="flex justify-content-end gap-2">
        <Button type="button" :label="$t('general.close')" severity="secondary" @click="showSendDialog = false"></Button>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
</style>
