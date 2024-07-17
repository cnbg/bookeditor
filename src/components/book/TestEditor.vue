<script setup>
import { ref, onMounted, computed } from 'vue';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';

const bookSt = useBookStore();
const toast = useToast();
const { t } = useI18n();

const testId = ref('');
const newTestId = ref('');

const updateTestId = () => {
  if (newTestId.value) {
    testId.value = newTestId.value;
    saveTestId();
    toast.add({ severity: 'success', summary: t('general.test-id-updated'), detail: t('general.new-test-id-saved'), life: 3000 });
  } else {
    toast.add({ severity: 'error', summary: t('general.invalid-test-id'), detail: t('general.please-enter-valid-test-id'), life: 3000 });
  }
};

const saveTestId = () => {
  const content = {
    testId: testId.value,
  };
  bookSt.updateOrCreateTestBlock(content);
};

const testViewerUrl = computed(() => {
  return testId.value ? `testviewer:test/${testId.value}` : null;
});

const openInTestViewer = async () => {
  if (testId.value) {
    console.log('Opening TestViewer with testId:', testId.value);
    try {
      const result = await window.electron.openTestViewer(testId.value);
      console.log('openTestViewer result:', result);
      if (result.success) {
        toast.add({ severity: 'success', detail: t('general.testviewer-opened'), life: 3000 });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to open TestViewer:', error);
      toast.add({ severity: 'error', detail: t('general.cannot-open-testviewer'), life: 3000 });
    }
  } else {
    console.error('No test ID available');
    toast.add({ severity: 'error', summary: t('general.no-test-id'), detail: t('general.no-test-id-found'), life: 3000 });
  }
};

onMounted(() => {
  const testBlock = bookSt.chapter?.blocks.find(x => x.type === 'test');
  if (testBlock && testBlock.content && testBlock.content.html && testBlock.content.html.testId) {
    testId.value = testBlock.content.html.testId;
    newTestId.value = testId.value;
  } else {
    testId.value = '';
    newTestId.value = '';
  }
});
</script>

<template>
  <div>
    <div class="flex flex-wrap justify-between gap-5 mb-4">
      <div class="flex items-center">
        <InputText id="testId" v-model="newTestId" :placeholder="$t('general.enter-test-id')" />
        <Button @click="updateTestId" icon="pi pi-check" :label="$t('general.update-test-id')" class="ml-2" />
      </div>
    </div>
    <div v-if="testId" class="mb-4">
      <strong>{{ $t('general.current-test-id') }}:</strong> {{ testId }}
      <Button v-if="testViewerUrl" @click="openInTestViewer" icon="pi pi-external-link" :label="$t('general.open-in-test-viewer')" severity="info" class="ml-2" />
    </div>
  </div>
</template>
