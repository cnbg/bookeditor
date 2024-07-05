<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

import { useUserStore } from '../../stores/user'
import { useBookStore } from '../../stores/book'
import { v4 as uuidv4 } from 'uuid';
const { electron } = window;

const props = defineProps({
  bookId: {type: String},
})

const router = useRouter()
const userSt = useUserStore()
const bookSt = useBookStore()
bookSt.getBook(props.bookId)

const book = reactive(bookSt.book || {
  id: '',
  title: '',
  desc: '',
  tags: [],
  author: {
    name: userSt.name,
    email: userSt.email,
  },
  cover: '',
})
const sanitizeObject = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

const generateFileName = (title) => {
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_');
  const randomNumber = Math.floor(Math.random() * 10000); 
  return `${sanitizedTitle}_${randomNumber}.json`;
};


const save = async () => {
    try {
        if (book.title) {
            if (!book.id) {
                book.id = uuidv4();
                const sanitizedBook = sanitizeObject(book);
                const fileName = generateFileName(book.title);
                const response = await electron.saveBook(sanitizedBook, fileName);
                if (response.success) {
                    bookSt.books.push(book);
                    router.push({ name: 'book-list' });
                } else {
                    console.error('Error saving book:', response.message);
                }
            } else {
                const response = await electron.updateBook(sanitizeObject(book), bookSt.bookFileName);
                if (response.success) {
                    await bookSt.updateBook(book);
                    router.push({ name: 'book-list' });
                } else {
                    console.error('Error updating book:', response.message);
                }
            }
        }
    } catch (error) {
        console.error('Error saving or updating book:', error);
    }
};

const customBase64Uploader = async (event) => {
  const file = event.files[0]
  const reader = new FileReader()
  let blob = await fetch(file.objectURL).then((r) => r.blob()) 

  reader.readAsDataURL(blob)

  reader.onloadend = function() {
    book.cover = reader.result
  }
}
</script>

<template>
  <TopMenu class="p-2" />
  <div class="p-6 flex flex-col gap-5">
    <div>
      <label for="book-title">{{ $t('general.enter-title').concat('...') }}</label>
      <InputText id="book-title" v-model="book.title" class="text-2xl w-full" />
      <span v-show="!book.title" class="lowercase text-red-700">{{ $t('general.enter-book-title') }}</span>
    </div>
    <div>
      <label for="book-desc">{{ $t('general.enter-description') }}</label>
      <Textarea v-model="book.desc" id="book-desc" class="w-full h-32" placeholder="..." />
    </div>
    <div>
      <label for="book-tags" class="mt-3 mb-1">{{ $t('general.tags') }}</label>
      <Chips v-model="book.tags" id="book-tags" />
    </div>

    <div class="flex flex-wrap justify-between gap-5">
      <FileUpload mode="basic" name="cover" accept="image/*" :maxFileSize="90000000"
                  auto customUpload @uploader="customBase64Uploader"
                  :chooseLabel="$t('general.select-cover')" />

      <Button @click="save" icon="pi pi-save"
              class="sm:w-56 ml-auto" size="large"
              :label="$t('general.save')" severity="success" outlined />
    </div>

    <div v-if="book.cover" class=" p-5">
      <img :src="book.cover" class="h-96 w-full object-contain" />
    </div>

  </div>
</template>

<style scoped>

</style>
