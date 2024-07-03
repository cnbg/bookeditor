<script setup lang="ts">
import { Model } from "survey-core";
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../stores/user'; 
import { DefaultLight } from "survey-core/themes/default-light";
import { BorderlessDark } from "survey-core/themes/borderless-dark";

const props = defineProps(['test']);
const electron = (window as any).electron;
const json = ref<JSON>({});
const survey = new Model();
const result = new Model();
const showDialog = ref(false);
const rightCount = ref(0);
const wrongCount = ref(0);
const isSurveyCompleted = ref<boolean>(false);
const userSt = useUserStore(); 

const { t } = useI18n();
const correctStr = t('general.correctStr');
const inCorrectStr = t('general.inCorrectStr');

const closeDialog = () => {
  showDialog.value = false;
  isSurveyCompleted.value = true;
};

onMounted(async () => {
  try {
    const response = await electron.getSurvey(props.test);
    if (response.success) {
      survey.fromJSON(response.data);
      json.value = response.data;
      console.log(survey);
    }
  } catch (error) {
    console.error('Error initializing survey model:', error);
  }
});

watch(() => userSt.darkMode, (newVal) => {
  applyTheme(newVal);
});

const applyTheme = (isDarkMode) => {
  const theme = isDarkMode ? BorderlessDark : DefaultLight;
  survey.applyTheme(theme);
  result.applyTheme(theme);
};

applyTheme(userSt.darkMode);
survey.showCompletedPage = false;
survey.onComplete.add(sender => {
  showDialog.value = true;

  result.fromJSON(json.value);
  result.applyTheme(userSt.darkMode ? BorderlessDark : DefaultLight);
  result.data = sender.data;
  result.mode = "display";
  result.widthMode = "static";
  result.questionsOnPageMode = "singlePage";
  result.showNavigationButtons = "none";
  result.showProgressBar = "off";
  result.showTimerPanel = "none";
  result.maxTimeToFinishPage = 0;
  result.maxTimeToFinish = 0;
  result.showPageNumbers = false;
  result.showQuestionNumbers = true;
  result.showCompletedPage = false;

  function getTextHtml(text, str, isCorrect) {
    if (text.indexOf(str) < 0) return undefined;
    return text.substring(0, text.indexOf(str)) + "<span class='" + (isCorrect ? "correctAnswer" : "incorrectAnswer") + "'>" + str + "</span>";
  }

  function renderCorrectAnswer(question, index) {
    if (question.getType() != 'html' && question.getType() != 'image') {
      if (question.getNestedQuestions().length > 0) {
        question.getNestedQuestions().forEach(
          (element) => {
            if (!element) return;
            const isCorrectEl = element.isAnswerCorrect();
            if (isCorrectEl) {
              rightCount.value++;
            } else {
              wrongCount.value++;
            }

            if (!element.prevTitle) {
              element.prevTitle = element.title;
            }

            if (isCorrectEl === undefined) {
              element.title = element.prevTitle;
            }

            element.title = element.prevTitle + ' ' + (isCorrectEl ? correctStr : inCorrectStr);
          }
        );
      } else {
        if (!question) return;
        const isCorrect = question.isAnswerCorrect();

        if (isCorrect) {
          rightCount.value++;
        } else {
          wrongCount.value++;
        }

        if (!question.prevTitle) {
          question.prevTitle = question.title;
        }

        if (isCorrect === undefined) {
          question.title = question.prevTitle;
        }
        question.title = question.prevTitle + ' ' + (isCorrect ? correctStr : inCorrectStr);
      }
    }
  }

  result.onTextMarkdown.add((sender, options) => {
    var text = options.text;
    var html = getTextHtml(text, correctStr, true);

    if (!html) {
      html = getTextHtml(text, inCorrectStr, false);
    }
    if (!!html) {
      options.html = html;
    }
  });
  result.getAllQuestions().forEach((question, index) => renderCorrectAnswer(question, index));
});

</script>

<template>
  <div>
    <div v-if="isSurveyCompleted">
      <Toolbar>
        <template #end>
          <div class="flex justify-end gap-4">
            <Message severity="success" :closable="false">
              <p class="text-lg font-medium text-600">{{$t('general.correct-answers')}}:
                 <Badge value="" size="large">{{ rightCount }}</Badge></p>
            </Message>
            <Message severity="error" :closable="false">
              <p class="text-lg font-medium text-600">{{$t('general.incorrect-answers')}}: 
                <Badge value="" size="large" style="background-color: red;">{{ wrongCount }}</Badge></p>
            </Message>
          </div>
        </template>
      </Toolbar>
      <SurveyComponent :model="result"></SurveyComponent>
    </div>
    <SurveyComponent :model="survey"></SurveyComponent>
    <Dialog :closable="false" v-model:visible="showDialog" modal style="max-width: 400px;">
      <div class="text-center">
        <div class="text-2xl text-gray-900 dark:text-white mb-8">{{$t('general.result') }}</div>
        <p class="text-lg font-medium text-600 mb-6"><Badge value="" size="large">{{ rightCount }}</Badge> {{$t('general.correct-answers')}}
          <Badge value="" size="large" style="background-color: red">{{ wrongCount }}</Badge> {{$t('general.incorrect-answers')}}</p>
        <Button @click="closeDialog" class="sm:w-20 h-8 ml-auto mb-4" outlined>Ок</Button>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.correctAnswer {
  color: green;
}
.incorrectAnswer {
  color: red;
}
.sd-root-modern .sd-container-modern__title {
  display: none !important;
}
</style>
