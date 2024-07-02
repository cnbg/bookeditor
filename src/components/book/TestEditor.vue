<script lang="ts" setup>
import { useBookStore } from '../../stores/book';
import 'survey-core/defaultV2.min.css';
import "survey-creator-core/survey-creator-core.min.css";
import { ref, onMounted } from 'vue';
import { SurveyCreatorModel, localization } from "survey-creator-core";
import type { ICreatorOptions, ICreatorPlugin } from "survey-creator-core";
import { Serializer } from "survey-core";

const electron = (window as any).electron;

const props = defineProps({
  bookId: {type: String, required: true},
  chapterId: {type: String},
})

const bookSt = useBookStore();

localization.getLocale("ru");
Serializer.addProperty("question", {name:"tag", category: "general"});
Serializer.findProperty("question", "tag").readOnly = true;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

const creatorOptions: ICreatorOptions = {
    showLogicTab: true,
    isAutoSave: true,
    showDesignerTab: true,
    showTestSurveyTab: true,
    showTranslationTab: false,
    showJSONEditorTab: false,
    showThemeTab: false,
    showToolbox: false
};

const creator = new SurveyCreatorModel(creatorOptions);
creator.toolbox.allowExpandMultipleCategories = false;
creator.toolbox.showCategoryTitles = false;
creator.allowModifyPages = false;

var questionCounter = 1;
creator.onQuestionAdded.add(function(sender, creatorOptions){
    var q = creatorOptions.question;
    q.tag = guid();
    questionCounter ++;
});

// let data = bookSt.getBook(props.bookId, props.chapterId)
const sfileName = 'survey_'+bookSt.bookFileName;

creator.saveSurveyFunc = async () => {
    try {
        const response = await electron.saveSurvey(creator.text, sfileName);
        if (!response.success) {
            console.error('Error saving survey:', response.message);
        }
    } catch (error) {
        console.error('Error survey:', error);
    }
};

const save = () => {
  let fileNameS = 'survey_'+bookSt.bookFileName;
  bookSt.block?.id ? bookSt.updateBlock(fileNameS) : bookSt.saveBlock(fileNameS);
}

onMounted(async () => {
    try {
        const response = await electron.getSurvey(sfileName);
        if (response.success) {
          creator.JSON = response.data;
        }
    } catch (error) {
        console.error('Error initializing survey model:', error);
    }
});
</script>

<template>
      <div class="flex justify-end mt-2 edit-controls">
      <Button @click="save" icon="pi pi-save" :label="$t('general.save')" severity="success" />
    </div>
  <SurveyCreatorComponent :model="creator" />
</template>

<style scoped>
.edit-controls {
  margin-bottom: 10px;
}
</style>
