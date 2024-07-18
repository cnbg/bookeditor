<script setup>
import EditHeader from './edit/EditHeader.vue'
import SidebarChapter from './edit/SidebarChapter.vue'
import EditContent from './edit/EditContent.vue'

import { useBookStore } from '../../stores/book'

const props = defineProps({
  bookId: {type: String, required: true},
  chapterId: {type: String},
})

const bookSt = useBookStore()
bookSt.getBook(props.bookId, props.chapterId)
</script>

<template>
  <div v-if="bookSt.book">
    <EditHeader class="p-2" />
    <div class="flex flew-wrap flex-col md:flex-row gap-2 px-2 pb-2">
      <SidebarChapter class="w-1/5 min-w-[300px]" />
      <EditContent class="flex-1 flex flex-col" />
    </div>
  </div>
  <NotFoundPage v-else />
</template>

<style scoped>
</style>
