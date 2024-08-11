<script setup>
import { onMounted, ref } from 'vue'
import { useBookStore } from '../../stores/book'

const bookSt = useBookStore()
const books = ref(bookSt.books || [])

const search = (s) => {
  books.value = s.length === 0 ? bookSt.books : filter(bookSt.books, s)
}
const filter = (items, s) => {
  return items.filter(i => {
    return i.title.match(new RegExp(s, 'i')) ||
        i.author.name.match(new RegExp(s, 'i')) ||
        i.desc.match(new RegExp(s, 'i')) ||
        i.tags.includes(s)
  })
}
const refreshBooks = async () => {
  await bookSt.fetchBooks()
  books.value = bookSt.books
}

onMounted(() => {
  refreshBooks()
})
</script>

<template>
  <TopMenu class="p-2" searchable @search="search" @refresh="refreshBooks" />

  <ScrollPanel style="width: 100%; height: calc(100vh - 80px)">
    <div class="px-2 py-5 flex flex-wrap justify-center gap-x-6 gap-y-10">
      <BookCard v-for="book in books" :key="book.id" :book="book" />
    </div>
  </ScrollPanel>
</template>
