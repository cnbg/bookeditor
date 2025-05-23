<template>
  <div class="editor-container">
    <Button v-if="!editing" @click="startEdit" icon="pi pi-pencil" :label="$t('general.edit')" class="edit-button" />
    <div v-if="!editing" ref="htmlContent" class="ql-editor" :style="{ backgroundColor: backgroundColor }" v-html="processedHtml"></div>
    <div v-else>
      <div class="flex justify-end mt-2 edit-controls">
        <Button @click="saveEdit" :label="$t('general.save')" icon="pi pi-save" class="mr-2" severity="success" />
        <Button @click="cancelEdit" :label="$t('general.cancel')" icon="pi pi-times" severity="secondary" />
      </div>
      <textarea id="editor"></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useUserStore } from '../../stores/user';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps(['html', 'backgroundColor']);
const emit = defineEmits(['content-updated']);
const userSt = useUserStore();
const editorConfig = ref(getEditorConfig(userSt.darkMode));
const editing = ref(false);
const editedContent = ref(props.html);
const originalContent = ref(props.html);
let editorInstance = null;
const containerBackgroundColor = ref('');
const textBackgroundColor = ref('');
const processedHtml = ref('');

// Process HTML to fix image paths for display
const processHtmlForDisplay = async (html) => {
  if (!html) return '';
  
  const isPackaged = await window.electron.isPackaged();
  
  if (!isPackaged) {
    return html;
  }
  
  // Fix image paths for packaged app display
  let processedContent = html;
  const imgRegex = /src="([^"]*\/data\/images\/[^"]*)"/g;
  let match;
  const pathPromises = [];
  
  while ((match = imgRegex.exec(html)) !== null) {
    const originalPath = match[1];
    pathPromises.push(
      window.electron.resolvePath(originalPath).then(resolvedPath => ({
        original: originalPath,
        resolved: `file:///${resolvedPath.replace(/\\/g, '/')}`
      })).catch(error => {
        console.warn('Could not resolve image path:', originalPath, error);
        return null;
      })
    );
  }
  
  const resolvedPaths = await Promise.all(pathPromises);
  
  resolvedPaths.forEach(pathMapping => {
    if (pathMapping) {
      processedContent = processedContent.replace(pathMapping.original, pathMapping.resolved);
    }
  });
  
  return processedContent;
};

// Update processed HTML when props change
watch(() => props.html, async (newVal) => {
  processedHtml.value = await processHtmlForDisplay(newVal);
}, { immediate: true });

watch(() => userSt.darkMode, (newVal) => {
  editorConfig.value = getEditorConfig(newVal);
});

async function getTinyMCEBaseUrl() {
  return await window.electron.getTinyMCEBaseUrl();
}

function getEditorConfig(isDarkMode) {
  const borderColor = isDarkMode ? '#888888' : '#BEBEBE';
  return {
    license_key: 'gpl',
    base_url: '',
    suffix: '.min',
    height: 'calc(100vh - 330px)',
    plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help quickbars emoticons',
    automatic_uploads: true,
    promotion: false,
    images_reuse_filename: true,
    paste_data_images: true,
    image_advtab: true,
    image_uploadtab: false,
    statusbar: false,
    notify_no_image_upload_callback: false,
    convert_urls: false,
    relative_urls: false,
    remove_script_host: false,
    images_upload_handler: async (blobInfo, success, failure, progress) => {
      try {
        const blob = blobInfo.blob();
        const fileExtension = blobInfo.filename().split('.').pop() || 'png';
        const fileName = `image_${Date.now()}.${fileExtension}`;
        const reader = new FileReader();        
        
        reader.onload = async function() {
          try {
            const base64Data = reader.result.split(',')[1];
            const response = await window.electron.saveImportedFile({
              fileContent: base64Data,
              fileName: fileName
            });            
            
            if (response.success) {
              let filePath = response.filePath;
              
              // Fix path separators
              if (filePath.includes('\\')) {
                filePath = filePath.replace(/\\/g, '/');
              }
              
              // Convert the path to a proper format for the built app
              const isPackaged = await window.electron.isPackaged();
              let finalPath;
              
              if (isPackaged) {
                // For packaged app, we need to resolve the path properly
                const resolvedPath = await window.electron.resolvePath(filePath);
                // Convert to file:// URL for TinyMCE to display properly
                finalPath = `file:///${resolvedPath.replace(/\\/g, '/')}`;
              } else {
                // For development, use the relative path as-is
                finalPath = filePath;
              }
              
              console.log('Image saved successfully:', {
                originalPath: filePath,
                resolvedPath: finalPath,
                isPackaged: isPackaged
              });
              
              success(finalPath);
              
              // Replace blob URLs with the actual file path after a short delay
              setTimeout(() => {
                const editor = tinymce.get('editor');
                if (editor) {
                  let content = editor.getContent();
                  const blobRegex = /src="(blob:[^"]+)"/g;
                  if (blobRegex.test(content)) {
                    content = content.replace(blobRegex, function(match, blobUrl) {
                      if (blobUrl === blobInfo.blobUri()) {
                        return `src="${finalPath}"`;
                      }
                      return match;
                    });
                    editor.setContent(content);
                  }
                }
              }, 100);
            } else {
              console.error('Image upload failed:', response.message);
              failure('Image upload failed: ' + response.message);
            }
          } catch (error) {
            console.error('Image upload error:', error);
            failure('Image upload error: ' + error.message);
          }
        };        
        
        reader.onerror = function() {
          console.error('Could not read image file');
          failure('Could not read image file');
        };        
        
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error in image handler:', error);
        failure('Image upload failed: ' + error.message);
      }
    },
    file_picker_callback: (cb, value, meta) => {
      if (meta.filetype === 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');        
        input.onchange = async function() {
          const file = this.files[0];
          try {
            const response = await window.electron.uploadFile(file.path, file.name);
            if (response.success) {
              // Resolve path for packaged app
              const isPackaged = await window.electron.isPackaged();
              let finalPath = response.filePath;
              
              if (isPackaged) {
                const resolvedPath = await window.electron.resolvePath(finalPath);
                finalPath = `file:///${resolvedPath.replace(/\\/g, '/')}`;
              }
              
              cb(finalPath, { title: file.name });
            } else {
              console.error('Error uploading file:', response.message);
            }
          } catch (error) {
            console.error('Error uploading file:', error);
          }
        };        
        input.click();
      } else if (meta.filetype === 'media') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*');
        
        input.onchange = async function() {
          const file = this.files[0];
          try {
            const response = await window.electron.uploadVideo(file.path, file.name);
            if (response.success) {
              // Resolve path for packaged app
              const isPackaged = await window.electron.isPackaged();
              let finalPath = response.filePath;
              
              if (isPackaged) {
                const resolvedPath = await window.electron.resolvePath(finalPath);
                finalPath = `file:///${resolvedPath.replace(/\\/g, '/')}`;
              }
              
              cb(finalPath, { title: file.name });
            } else {
              console.error('Error uploading video:', response.message);
            }
          } catch (error) {
            console.error('Error uploading video:', error);
          }
        };
        
        input.click();
      }
    },
    extended_valid_elements: '*[.*]',
    draggable_modal: true,
    skin: isDarkMode ? 'oxide-dark' : 'oxide',
    content_css: isDarkMode ? 'dark' : 'default',
    language: 'ru',
    init_instance_callback: function(editor) {
      editor.notificationManager.open = function() { 
        return { 
          close: function() {},
          progressBar: { value: function() {} },
          reposition: function() {},
          getEl: function() { return document.createElement('div'); },
          moveTo: function() {},
          moveRel: function() {},
          text: function() {},
          settings: {}
        };
      };
    },
    toolbar: 'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
    setup: (editor) => {
      editorInstance = editor;
      editor.on('init', async () => {
        import('../../tinymce/langs/ru').catch((error) => {
          console.error('Failed to load translation file:', error);
        });
        if (editing.value) {
          // Process content for editor
          let contentForEditor = editedContent.value;
          const isPackaged = await window.electron.isPackaged();
          if (isPackaged) {
            contentForEditor = await fixImagePathsForEditor(contentForEditor);
          }
          editor.setContent(contentForEditor);
        }
      });
      editor.on('change', () => {
        editedContent.value = editor.getContent();
      });
      editor.on('ExecCommand', (e) => {
        if (e.command === 'mceApplyTextcolor' && e.value) {
          textBackgroundColor.value = e.value;
        } else if (e.command === 'mceApplyBackcolor' && e.value) {
          containerBackgroundColor.value = e.value;
        }
      });
      editor.on('SelectionChange', () => {
        const selectedText = editor.selection.getContent({ format: 'text' }).trim();
        if (selectedText === '') {
          containerBackgroundColor.value = textBackgroundColor.value;
        }
      });
    },
  };
}

// Helper function to fix image paths for TinyMCE editor
async function fixImagePathsForEditor(content) {
  const isPackaged = await window.electron.isPackaged();
  if (!isPackaged) return content;
  
  // Find all image src attributes
  const imgRegex = /src="([^"]*\/data\/images\/[^"]*)"/g;
  let match;
  let updatedContent = content;
  
  while ((match = imgRegex.exec(content)) !== null) {
    const originalPath = match[1];
    try {
      const resolvedPath = await window.electron.resolvePath(originalPath);
      const finalPath = `file:///${resolvedPath.replace(/\\/g, '/')}`;
      updatedContent = updatedContent.replace(originalPath, finalPath);
    } catch (error) {
      console.warn('Could not resolve image path:', originalPath, error);
    }
  }
  
  return updatedContent;
}

const startEdit = async () => {
  editing.value = true;
  editedContent.value = props.html;
  await initTinyMCE();
};

const cancelEdit = () => {
  editing.value = false;
  editedContent.value = originalContent.value;
  destroyTinyMCE();
};

const saveEdit = () => {
  if (editedContent.value.trim() === '') {
    originalContent.value = '';
    editing.value = false;
  } else {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent.value, 'text/html');
    const borderColor = userSt.darkMode ? '#888888' : '#BEBEBE';
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      table.style.borderColor = borderColor;
      table.style.borderWidth = '1px';
      table.style.borderStyle = 'solid';

      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        cell.style.borderColor = borderColor;
        cell.style.borderWidth = '1px';
        cell.style.borderStyle = 'solid';
      });
    });

    const links = doc.querySelectorAll('a');
    links.forEach(link => {
      link.style.color = 'blue';
      link.style.textDecoration = 'underline';
    });

    editedContent.value = doc.body.innerHTML;
    editing.value = false;
    originalContent.value = editedContent.value;
  }
  const updatedContent = {
    html: editedContent.value,
    backgroundColor: containerBackgroundColor.value
  };

  emit('content-updated', updatedContent);
  destroyTinyMCE();
};

async function initTinyMCE() {
  const baseUrl = await getTinyMCEBaseUrl();
  setTimeout(() => {
    tinymce.init({
      ...editorConfig.value,
      base_url: baseUrl,
      target: document.getElementById('editor')
    });
  });
}

function destroyTinyMCE() {
  if (editorInstance) {
    editorInstance.remove();
    editorInstance = null;
  }
}

onMounted(async () => {
  if (props.html) {
    let parsedContent;
    try {
      parsedContent = JSON.parse(props.html);
    } catch (error) {
      editedContent.value = props.html;
    }
  }
  
  // Process HTML for initial display
  processedHtml.value = await processHtmlForDisplay(props.html);
  
  const baseUrl = await getTinyMCEBaseUrl();
  tinymce.init({
    ...editorConfig.value,
    base_url: baseUrl,
    target: document.getElementById('editor'),
    setup: (editor) => {
      editorInstance = editor;
      editor.on('init', () => {
        import('../../tinymce/langs/ru').catch((error) => {
          console.error('Failed to load translation file:', error);
        });
        if (editing.value) {
          editor.setContent(editedContent.value);
        }
      });
      editor.on('change', () => {
        editedContent.value = editor.getContent();
      });
    }
  });
});

onBeforeUnmount(() => {
  destroyTinyMCE();
});
</script>

<style scoped>
.editor-container {
  position: relative;
  padding-top: 30px;
}

.edit-button {
  position: absolute;
  top: 0;
  left: 0;
  /* width: 30px; */
  height: 30px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  display: none;
}

.editor-container:hover .edit-button {
  display: flex;
}

.edit-controls {
  margin-bottom: 10px;
}
:deep(table) {
  border-collapse: collapse;
  width: 100%;
  border: 1px solid #ccc;
}

:deep(table th),
:deep(table td) {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
}

:deep(table thead) {
  background-color: #f9f9f9;
}

:deep(img),
:deep(svg),
:deep(video),
:deep(canvas),
:deep(audio),
:deep(iframe),
:deep(embed),
:deep(object){
  display: initial !important;
  vertical-align: initial !important;
}
:deep(ol),
:deep(ul),
:deep(menu){
    list-style: inside;
}
</style>