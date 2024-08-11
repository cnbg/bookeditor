<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../../stores/user'
import { useBookStore } from '../../stores/book'
import { exportPdf } from '../../lib/exportpdf'
import { exportBookAsZip } from '../../lib/exportzip'

import Tree from 'primevue/tree'
import Menu from 'primevue/menu'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

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
const selectedChapterKey = ref({})
const expandedKeys = ref({})

const userSt = useUserStore()
const bookSt = useBookStore()
bookSt.getBook(props.bookId, props.chapterId)

const toggleMenu = (event) => {
  menu.value.toggle(event)
}

const panelMenuItems = ref([
  {
    label: t('general.edit'),
    icon: 'pi pi-pencil',
    command: () => {
      router.push({ name: 'book-edit', params: { bookId: props.bookId, chapterId: bookSt.chapter?.id } })
    },
  },
  { separator: true },
  {
    label: t('general.change-view-format'),
    icon: 'pi pi-images',
    command: () => { pager.value = !pager.value },
  },
  { separator: true },
  {
    label: t('general.send'),
    icon: 'pi pi-send',
    command: () => { showSendDialog.value = true },
  },
  { separator: true },
  {
    label: t('general.download-as-pdf'),
    icon: 'pi pi-download',
    command: () => {
      const html = document.querySelector('#html-content').innerHTML
      exportPdf(html, bookSt.book?.title)
    },
  },
  { separator: true },
  {
    label: t('general.export-book'),
    icon: 'pi pi-file-export',
    command: () => { exportBookAsZip(bookSt.book) },
  },
])

const currentPageIndex = computed(() => {
  if (page.value === -1) return -1
  if (page.value === 0) return 0
  return bookSt.book.chapters.findIndex(ch => ch.id === bookSt.chapter?.id) + 1
})

const totalPages = computed(() => {
  if (!bookSt.book) return 0
  return (bookSt.book.chapters?.length || 0) + 1 // +1 for the chapter list page
})

const goTo = (route, params = {}) => {
  if (bookSt.editing) {
    toast.add({ severity: 'error', summary: t('general.dont-forget-to-save'), life: 4000 })
  } else {
    if (route === 'home') {
      router.push({ path: '/' })
    } else {
      router.push({ name: route, params: params })
    }
  }
}

const buildTree = (chapters, parentId = null) => {
  return chapters
    .filter(chapter => chapter.parent === parentId)
    .map(chapter => ({
      key: chapter.id,
      label: chapter.title,
      children: buildTree(chapters, chapter.id)
    }))
}

const sidebarChapterTree = computed(() => {
  if (!bookSt.book || !bookSt.book.chapters) return []

  const chapterListNode = {
    key: 'chapter-list',
    label: t('general.table-of-contents'),
    selectable: true,
  }

  return [chapterListNode, ...buildTree(bookSt.book.chapters)]
})

const pageChapterTree = computed(() => {
  if (!bookSt.book || !bookSt.book.chapters) return []

  const tree = buildTree(bookSt.book.chapters)
  const setExpandedKeys = (nodes) => {
    nodes.forEach(node => {
      expandedKeys.value[node.key] = true
      if (node.children) {
        setExpandedKeys(node.children)
      }
    })
  }
  setExpandedKeys(tree)

  return tree
})

const onChapterSelect = (node) => {
  const chapterId = node.key
  if (chapterId === 'chapter-list') {
    page.value = 0
    bookSt.chapter = null
  } else {
    bookSt.chapter = bookSt.book.chapters.find(ch => ch.id === chapterId)
    page.value = bookSt.book.chapters.indexOf(bookSt.chapter) + 1
  }
  selectedChapterKey.value = { [chapterId]: true }
  router.push({ name: 'book-view', params: { bookId: bookSt.book.id, chapterId } })
}

const goToPage = (newPage) => {
  page.value = newPage
  if (newPage === -1) {
    bookSt.chapter = null
    selectedChapterKey.value = {}
  } else if (newPage === 0) {
    bookSt.chapter = null
    selectedChapterKey.value = { 'chapter-list': true }
  } else {
    bookSt.chapter = bookSt.book.chapters[newPage - 1]
    selectedChapterKey.value = { [bookSt.chapter.id]: true }
  }
}

const onNodeToggle = (node) => {
  const expandedKeysValue = { ...expandedKeys.value }
  if (node.expanded)
    delete expandedKeysValue[node.key]
  else
    expandedKeysValue[node.key] = true
  expandedKeys.value = expandedKeysValue
}

const goToBookHome = () => {
  page.value = -1
  bookSt.chapter = null
  selectedChapterKey.value = {}
  router.replace({
    name: 'book-view',
    params: { bookId: props.bookId },
    query: { page: 'toc' }
  }, { shallow: true })
}

watch(currentPageIndex, (newIndex) => {
  if (newIndex === 0) {
    selectedChapterKey.value = {}
  } else if (newIndex > 0) {
    const selectedChapter = bookSt.book.chapters[newIndex - 1]
    selectedChapterKey.value = { [selectedChapter.id]: true }
  }
})

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="book-viewer-container flex h-screen overflow-hidden">
    <aside class="w-1/5 book-viewer-container-aside">
      <div class="p-4">
        <div class="bg-surface-0 dark:bg-surface-900 py-3 px-5 rounded-lg flex items-center gap-2">
          <div class="text-2xl m-0 flex-auto">{{ $t('general.chapters') }}</div>
          <Button icon="pi pi-align-left" text plain @click="goToBookHome"></Button>
        </div>
        <div class="chapter-tree-container">
          <Tree
            :value="sidebarChapterTree"
            selectionMode="single"
            :selectionKeys="selectedChapterKey"
            @node-select="onChapterSelect"
            class="chapter-tree mt-4"
          >
            <template #default="slotProps">
              <span>{{ slotProps.node.label }}</span>
            </template>
          </Tree>
        </div>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto p-4 flex flex-col">
      <div class="content-area flex-grow">
        <div v-if="bookSt.book" class="mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-4/4 xl:w-4/5">
          <div class="bg-surface-0 dark:bg-surface-900 py-3 px-5 rounded-lg flex items-center gap-3">
            <div class="text-2xl m-0 flex-auto">{{ bookSt.book.title }}</div>
            <Button @click="toggleMenu" icon="pi pi-cog" text plain />
            <Button icon="pi pi-times" text plain @click="goBack" />
            <Button icon="pi pi-home" text plain @click="goTo('home')" />
            <Menu ref="menu" :model="panelMenuItems" popup />
          </div>
          <div v-if="chapterId && bookSt.chapter">
            <div id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
              <ContentViewer :chapter="bookSt.chapter" />
            </div>
          </div>
          <div v-else>
            <div v-if="page === -1" id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
              <img :src="bookSt.book.cover" class="w-full h-full object-contain" alt="Book cover" />
            </div>
            <div v-else-if="page === 0" id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg chapter-list-container">
              <h2>{{ $t('general.table-of-contents') }}</h2>
              <Tree
                :value="pageChapterTree"
                selectionMode="single"
                :selectionKeys="selectedChapterKey"
                :expandedKeys="expandedKeys"
                @node-select="onChapterSelect"
                @node-toggle="onNodeToggle"
                class="chapters-tree p-0"
              >
                <template #default="slotProps">
                  <span>{{ slotProps.node.label }}</span>
                </template>
              </Tree>
            </div>
            <div v-else-if="pager">
              <div id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
                <ContentViewer :chapter="bookSt.book.chapters[page - 1]" />
              </div>
            </div>
            <div v-else id="html-content">
              <div v-for="chapter in bookSt.book.chapters" :key="chapter.id"
                   class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
                <ContentViewer :chapter="chapter" />
              </div>
            </div>
          </div>
        </div>
        <NotFoundPage v-else />
      </div>
      <div v-if="bookSt.book" class="mt-auto py-5">
        <div class="flex justify-between gap-4 mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-3/5">
          <Button :disabled="currentPageIndex <= -1" size="small"
                  :severity="userSt.darkMode ? 'success' : 'secondary'"
                  class="w-full text-sm font-bold flex items-center gap-3"
                  @click="goToPage(currentPageIndex - 1)">
            <i class="pi pi-chevron-left"></i>
            <span class="truncate grow">
              {{ currentPageIndex === 0 ? $t('general.cover') :
                 currentPageIndex === 1 ? $t('general.chapter-list') :
                 bookSt.book.chapters[currentPageIndex - 2]?.title ?? $t('general.homepage') }}
            </span>
          </Button>
          <Button :disabled="currentPageIndex >= totalPages" size="small"
                  :severity="userSt.darkMode ? 'success' : 'secondary'"
                  class="w-full text-sm font-bold flex items-center gap-3"
                  @click="goToPage(currentPageIndex + 1)">
            <span class="truncate grow">
              {{ currentPageIndex === -1 ? $t('general.table-of-contents') :
                 currentPageIndex === 0 ? bookSt.book.chapters[0]?.title :
                 currentPageIndex < totalPages ? bookSt.book.chapters[currentPageIndex]?.title : '' }}
            </span>
            <i class="pi pi-chevron-right"></i>
          </Button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.content-area {
  flex-grow: 1;
  overflow-y: auto;
}
.book-viewer-container-aside {
  max-width: 350px;
  width: 100%;
}

.chapter-tree{
  padding: 1.25rem 0.5rem;
}

.chapter-tree-container :deep(.p-tree) {
  border: none;
  background: transparent;
}

.chapter-tree-container :deep(.p-treenode-content) {
  padding: 0.5rem 0;
}

.chapter-tree-container :deep(.p-tree-toggler) {
  margin-right: 0.5rem;
}

.chapter-tree-container :deep(.p-treenode-icon) {
  margin-right: 0.5rem;
  width: 1rem;
  text-align: center;
}

.chapter-tree-container :deep(.p-treenode-label) {
  margin-left: 0.5rem;
}

.chapters-tree li {
  padding: 0;
}
.chapters-tree :deep(ul > li) {
  padding: 0;
}
.chapters-tree :deep(ul > li > button) {
  width: 50px;
}

.chapters-tree :deep(ul > li > div) {
  padding: 0;
}

:deep(.chapter-tree li > div ) {
  padding: 0;
}

:deep(.chapter-tree button ) {
  min-width: 35px;
  padding: 0;
  margin: 0;
}
:deep(.chapter-tree button:focus ) {
  box-shadow: none;
  outline: none;
}

:global(.dark-mode) .sidebar {
  background-color: var(--surface-900);
  border-right-color: var(--surface-700);
}

:global(.dark-mode) .pager {
  border-top-color: var(--surface-700);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}
</style>