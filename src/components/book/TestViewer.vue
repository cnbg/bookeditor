<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  test: { type: Object, required: true }
});

const electron = (window as any).electron;

const { t } = useI18n();
const toast = useToast();

const testId = ref<string>('');

const testViewerUrl = computed(() => {
  return testId.value ? `testviewer:test/${testId.value}` : null;
});

const openInTestViewer = async () => {
  if (testId.value) {
    // console.log('Opening TestViewer with testId:', testId.value);
    try {
      const result = await electron.openTestViewer(testId.value);
      // console.log('openTestViewer result:', result);
      if (result.success) {
        toast.add({ severity: 'success', detail: t('general.testviewer-opened'), life: 3000 });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // console.error('Failed to open TestViewer:', error);
      toast.add({ severity: 'error', detail: t('general.cannot-open-testviewer'), life: 3000 });
    }
  } else {
    console.error('No test ID available');
    toast.add({ severity: 'error', summary: t('general.no-test-id'), detail: t('general.no-test-id-found'), life: 3000 });
  }
};

onMounted(() => {
  // console.log('TestViewer component mounted. Props:', props);
  testId.value = props.test.testId || '';
  // console.log('Test ID set to:', testId.value);
});
</script>

<template>
  <div class="test-link-container">
    <Button
      v-if="testId"
      @click="openInTestViewer"
      :label="t('general.open-test')"
      icon="pi pi-external-link"
      class="p-button-primary"
    />
    <p v-else class="error-message">{{ t('general.test-id-not-found') }}</p>
  </div>
</template>

<style scoped>
.test-link-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
}

.error-message {
  color: red;
  font-weight: bold;
}
</style>