<script setup>
import { ref, computed } from 'vue'
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

const totalPages = computed(() => {
  if (!bookSt.book) return 0;
  return (bookSt.book.chapters?.length || 0) + 1; // +1 for the chapter list page
})

const renderChapterTree = (chapters, parentId = null, level = 0) => {
  return chapters
    .filter(chapter => chapter.parent === parentId)
    .map((chapter, index) => {
      const hasChildren = chapters.some(ch => ch.parent === chapter.id);
      const chapterIndex = chapters.findIndex(ch => ch.id === chapter.id) + 1;
      return `
        <div class="chapter-item" style="margin-left: ${level * 10}px;">
          <span>${'•'.repeat(level + 1)}
            <a href="#" class="chapter-link" onclick="window.goToChapter(${chapterIndex}); return false;">
              ${chapter.title}
            </a>
          </span>
          ${hasChildren ? renderChapterTree(chapters, chapter.id, level + 1) : ''}
        </div>
      `;
    })
    .join('');
};

const goToChapter = (chapterIndex) => {
  page.value = chapterIndex;
};

if (typeof window !== 'undefined') {
  window.goToChapter = goToChapter;
}

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

const sidebarChapterTree = computed(() => {
  if (!bookSt.book || !bookSt.book.chapters) return []

  const buildTree = (chapters, parentId = null) => {
    return chapters
      .filter(chapter => chapter.parent === parentId)
      .map(chapter => ({
        key: chapter.id,
        label: chapter.title,
        children: buildTree(chapters, chapter.id)
      }))
  }

  return buildTree(bookSt.book.chapters)
})

const pageChapterTree = computed(() => {
  if (!bookSt.book || !bookSt.book.chapters) return []

  const buildTree = (chapters, parentId = null) => {
    return chapters
      .filter(chapter => chapter.parent === parentId)
      .map(chapter => ({
        key: chapter.id,
        label: chapter.title,
        children: buildTree(chapters, chapter.id)
      }))
  }

  const tree = buildTree(bookSt.book.chapters)

  // Set all nodes as expanded for the page tree
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
  bookSt.chapter = bookSt.book.chapters.find(ch => ch.id === chapterId)
  selectedChapterKey.value = { [chapterId]: true }
  router.push({ name: 'book-view', params: { bookId: bookSt.book.id, chapterId } })
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
  router.push({ name: 'book-view', params: { bookId: props.bookId } })
  // Reset the selected chapter in the store if necessary
  bookSt.chapter = null
  selectedChapterKey.value = {}
}
</script>

<template>
  <div class="book-viewer-container flex h-screen overflow-hidden">
    <aside class="w-1/5 min-w-[300px]">
      <div class="p-4">
        <div class="bg-surface-0 dark:bg-surface-900 py-3 px-5 rounded-lg flex items-center gap-2">
          <div class="text-2xl m-0 flex-auto">{{ $t('general.chapters') }}</div>
          <Button icon="pi pi-align-left" text plain @click="goToBookHome"></Button>
        </div>
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
    </aside>

    <main class="flex-1 overflow-y-auto p-4">
      <div class="content-area">
        <div v-if="bookSt.book" class="mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-4/4 xl:w-4/5">
          <div class="bg-surface-0 dark:bg-surface-900 py-3 px-5 rounded-lg flex items-center gap-3">
            <div class="text-2xl m-0 flex-auto">{{ bookSt.book.title }}</div>
            <Button @click="toggleMenu" icon="pi pi-cog" text plain />
            <Button icon="pi pi-times" text plain @click="goTo('home')">
            </Button>
            <Menu ref="menu" :model="panelMenuItems" popup />
          </div>
          <div v-if="chapterId && bookSt.chapter">
            <div id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
              <ContentViewer :chapter="bookSt.chapter" />
            </div>
          </div>
          <div v-else>
            <div v-if="page === -1" id="html-content" class="bg-surface-0 dark:bg-surface-900 my-3 md:my-4 p-4 md:p-12 rounded-lg">
              <img :src="bookSt.book.cover" class="w-full h-full object-contain" />
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
            <div v-if="pager" class="fixed bottom-0 left-0 right-0 px-5 md:px-2 py-5 text-center w-full">
              <div class="flex justify-between flex-col sm:flex-row gap-4 mx-auto w-full sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-3/5">
                <Button :disabled="page <= -1" size="small"
                        :severity="userSt.darkMode ? 'success' : 'secondary'"
                        class="w-full text-sm font-bold flex items-center gap-3"
                        @click="page--">
                  <i class="pi pi-chevron-left"></i>
                  <span class="truncate grow">
                    {{ page === 0 ? $t('general.cover') :
                      page === 1 ? $t('general.table-of-contents') :
                      bookSt.book.chapters[page - 2]?.title ?? $t('general.homepage') }}
                  </span>
                </Button>
                <Button :disabled="page >= totalPages" size="small"
                        :severity="userSt.darkMode ? 'success' : 'secondary'"
                        class="w-full text-sm font-bold flex items-center gap-3"
                        @click="page++">
                  <span class="truncate grow">
                    {{ page === -1 ? $t('general.table-of-contents') :
                      page === 0 ? bookSt.book.chapters[0]?.title :
                      page < totalPages ? bookSt.book.chapters[page]?.title : '' }}
                  </span>
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
    </main>
  </div>
</template>

<style scoped>
.chapter-list-container {
  font-family: Arial, sans-serif;
}
.chapter-item {
  margin-bottom: 10px;
}
.chapter-link {
  text-decoration: none;
  transition: all 0.3s ease;
}
.chapter-link:visited {
  color: #551A8B;
}
.chapter-link:hover, .chapter-link:focus {
  color: #FF0000;
  text-decoration: underline;
}
.chapter-link:active {
  color: #FF0000;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .chapter-link {
    color: #9999FF;
  }
  .chapter-link:visited {
    color: #CC99FF;
  }
  .chapter-link:hover, .chapter-link:focus, .chapter-link:active {
    color: #FF6666;
  }
}

:global(.dark-mode) .chapter-link {
  color: #9999FF;
}
:global(.dark-mode) .chapter-link:visited {
  color: #CC99FF;
}
:global(.dark-mode) .chapter-link:hover,
:global(.dark-mode) .chapter-link:focus,
:global(.dark-mode) .chapter-link:active {
  color: #FF6666;
}

.book-viewer-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  min-width: 300px;
  width: 100%;
  height: 100%;
  background-color: var(--surface-0);
  border-right: 1px solid var(--surface-200);
  /* overflow-y: auto; */
}

.content-area {
  flex-grow: 1;
  overflow-y: auto;
}

.chapter-tree {
  margin-top: 1rem;
}

.chapter-tree :deep(.p-tree) {
  border: none;
}

/* Dark mode adjustments */
:global(.dark-mode) .sidebar {
  background-color: var(--surface-900);
  border-right-color: var(--surface-700);
}


.chapter-tree :deep(li>div){
  padding: 0;
}

</style>