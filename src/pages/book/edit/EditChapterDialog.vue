<script setup>
import {ref} from 'vue'
const props = defineProps({
  chapter: Object,
})
const ch = ref(props.chapter)
</script>

<template>
  <div>
    <div class="flex flex-col gap-4">
      <label>
        {{ $t('general.title') }}
        <InputText v-model="ch.title" class="w-full" autocomplete="off" />
        <span v-show="!ch.title" class="text-sm text-red-700">{{ $t('general.required-field') }}</span>
      </label>
      <!-- <label>
        {{ $t('general.enter-description') }}
        <Textarea v-model="ch.desc" class="w-full h-32" />
      </label> -->
      <label>
        {{ $t('general.tags') }}
        <Chips v-model="ch.tags" id="chapter-tags" class="w-full" />
      </label>
    </div>
    <div class="flex justify-end mt-8 gap-10">
      <Button @click="$emit('close', {})" :label="$t('general.close')" type="button" plain text />
      <Button @click="$emit('close', ch)" :label="$t('general.save')" type="button" outlined />
    </div>
  </div>
</template>

<style scoped>
</style>
