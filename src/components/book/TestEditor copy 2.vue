<script setup>
import { ref, onMounted } from 'vue';
import { useBookStore } from '../../stores/book';
import { useToast } from 'primevue/usetoast';
import { useI18n } from 'vue-i18n';
import { Model } from 'survey-core';
import { DefaultLight } from "survey-core/themes/default-light";
import 'survey-core/defaultV2.min.css';
import 'survey-core/modern.min.css';

const bookSt = useBookStore();
const toast = useToast();
const { t } = useI18n();

const surveyData = ref(null);
const survey = ref(null);

const createSurvey = (data) => {
  const newSurvey = new Model(data);
  newSurvey.applyTheme(DefaultLight);
  newSurvey.onComplete.add(showResult);
  return newSurvey;
};

const importSurvey = async (event) => {
  const selectedFile = event.files[0];

  try {
    const fileContent = await readFileAsText(selectedFile);
    const parsedContent = JSON.parse(fileContent);

    if (parsedContent) {
      surveyData.value = parsedContent;
      survey.value = createSurvey(parsedContent);
      toast.add({ severity: 'success', summary: t('general.survey-imported'), life: 3000 });
    } else {
      throw new Error(t('general.invalid-survey-data'));
    }
  } catch (error) {
    console.error('Error importing survey:', error);
    toast.add({ severity: 'error', summary: t('general.import-failed'), detail: error.message, life: 3000 });
  }
};

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const save = () => {
  if (surveyData.value) {
    const content = {
      surveyData: surveyData.value
    };
    bookSt.block?.id ? bookSt.updateBlock(content) : bookSt.saveBlock(content);
    toast.add({ severity: 'success', summary: t('general.survey-saved'), life: 3000 });
  } else {
    toast.add({ severity: 'error', summary: t('general.no-survey-to-save'), life: 3000 });
  }
};

const showResult = (sender) => {
  const results = JSON.stringify(sender.data);
  console.log(results); // You can handle the results as needed
  toast.add({ severity: 'info', summary: t('general.survey-completed'), detail: t('general.check-console-for-results'), life: 5000 });
};

onMounted(() => {
  if (bookSt.block && bookSt.block.surveyData) {
    surveyData.value = bookSt.block.surveyData;
    survey.value = createSurvey(surveyData.value);
  }
});
</script>

<template>
  <div>
    <div class="flex flex-wrap justify-between gap-5">
      <FileUpload mode="basic" name="survey" accept=".json"
                  customUpload @uploader="importSurvey" auto
                  :chooseLabel="$t('general.import-survey')" />

      <Button v-if="surveyData" @click="save" icon="pi pi-save"
              :label="$t('general.save')" severity="success" />
    </div>
    <div v-if="survey" class="mt-4">
      <SurveyComponent :model="survey" />
    </div>
  </div>
</template>

<style scoped>
/* You can add any specific styles here if needed */
</style>