<template>
  <div>
    <div class="flex flex-wrap justify-end gap-5 mb-5">
      <Button @click="save" icon="pi pi-save" :label="$t('general.save')" severity="success" />
    </div>
    <textarea id="editor" v-model="content"></textarea>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useBookStore } from '../../stores/book';
import { useUserStore } from '../../stores/user';
const props = defineProps(['html', 'backgroundColor']);
const bookSt = useBookStore();
const userSt = useUserStore();
const content = ref("");

const save = () => {
  const editor = tinymce.get('editor');
  if (editor) {
    const editorContent = editor.getContent();
    if (editorContent !== props.html) {
      bookSt.saveBlock(editorContent);
    }
  }
};

watch(() => props.html, (newVal) => {
  if (!content.value) {
    content.value = newVal;
  }
  const editor = tinymce.get('editor');
  if (editor && !editor.initialized) {
    editor.setContent(newVal);
  }
});

const editorConfig = ref(getEditorConfig(userSt.darkMode));

watch(() => userSt.darkMode, (newVal) => {
  editorConfig.value = getEditorConfig(newVal);
  const editor = tinymce.get('editor');
  if (editor) {
    editor.destroy();
    tinymce.init({
      ...editorConfig.value,
      target: document.getElementById('editor'),
      setup: (editor) => {
        editor.on('change', () => {
          content.value = editor.getContent();
        });
      }
    });
  }
});

function getEditorConfig(isDarkMode) {
  return {
    base_url: '',
    suffix: '.min',
    license_key: 'gpl',
    height: 'calc(100vh - 330px)',
    width: 'calc(100vw - 440px)',
    plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help quickbars emoticons',
    automatic_uploads: false,
    promotion: false,
    file_picker_types: 'image media',
    file_picker_callback: (cb, value, meta) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', meta.filetype === 'image' ? 'image/*' : 'video/*');
      input.onchange = function () {
        const file = this.files[0];
        const reader = new FileReader();
        reader.onload = function () {
          const id = 'blobid' + (new Date()).getTime();
          const blobCache = tinymce.activeEditor.editorUpload.blobCache;
          const base64 = reader.result.split(',')[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);
          cb(blobInfo.blobUri(), { title: file.name });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    },
    extended_valid_elements: '*[.*]',
    draggable_modal: true,
    skin: isDarkMode ? 'oxide-dark' : 'oxide',
    content_css: isDarkMode ? 'dark' : 'default',
    statusbar: false,
    language: 'ru',
    setup: (editor) => {
      editor.on('init', () => {
        editor.setContent(props.html);
        import('../../tinymce/langs/ru').catch((error) => {
          console.error('Failed to load translation file:', error);
        });
      });
    },
  };
}

onMounted(async () => {
  const baseUrl = await window.electron.getTinyMCEBaseUrl();
  tinymce.init({
    ...editorConfig.value,
    base_url: baseUrl,
    target: document.getElementById('editor'),
    setup: (editor) => {
      editor.on('change', () => {
        content.value = editor.getContent();
      });
    }
  });
});

onBeforeUnmount(() => {
  const editor = tinymce.get('editor');
  if (editor) {
    editor.remove();
  }
});
</script>

<style>
</style>
