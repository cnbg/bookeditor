<script setup>
import { useBookStore } from '../../stores/book'
import Model3DEditor from './Model3DEditor.vue'

const bookSt = useBookStore()
</script>

<template>
  <div v-if="bookSt.block" style="height: calc(100vh - 259px)">
    <HtmlEditor v-if="bookSt.block.type === 'html'" :html="bookSt.block.content" />
    <ImageEditor v-else-if="bookSt.block.type === 'image'" />
    <VideoEditor v-else-if="bookSt.block.type === 'video'" />
    <Model3DEditor v-else-if="bookSt.block.type === 'model'" />
    <TestEditor v-else-if="bookSt.block.type === 'test'" />
    <PptEditor v-else-if="bookSt.block.type === 'ppt' || bookSt.block.type === 'powerpoint'" />
  </div>
</template>

<style scoped>
</style>
