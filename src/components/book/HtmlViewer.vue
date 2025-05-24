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
const processedHtml = ref('');
let editorInstance = null;
const containerBackgroundColor = ref('');
const textBackgroundColor = ref('');

// Helper function to check if string is base64 data URL
const isBase64DataUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:') && str.includes('base64,');
};

// Helper function to modify path
const modifyPath = async (path) => {
  if (!path) return '';
  try {
    const packaged = await window.electron.isPackaged();
    if (packaged) {
      // Remove 'src' from the beginning of the path for packaged app
      return path.replace(/^\/src\//, '/');
    }
    return path;
  } catch (error) {
    console.error('Error checking package status:', error);
    return path;
  }
};

// Helper function to resolve file path
const resolveFilePath = async (filePath) => {
  if (!filePath) return '';
  
  try {
    const modifiedPath = await modifyPath(filePath);
    const packaged = await window.electron.isPackaged();
    
    if (!packaged) {
      // Development mode - ensure path starts with /src
      if (modifiedPath.startsWith('/data/')) {
        return `/src${modifiedPath}`;
      }
      return modifiedPath;
    } else {
      // Packaged mode - resolve to file:// URL
      const resolvedPath = await window.electron.resolvePath(modifiedPath);
      return `file:///${resolvedPath.replace(/\\/g, '/')}`;
    }
  } catch (error) {
    console.error('Error resolving path:', error);
    return filePath;
  }
};

// Function to process HTML content and resolve image paths
const processHtmlContent = async (htmlContent) => {
  if (!htmlContent) return '';
  
  try {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Find all img elements
    const images = tempDiv.querySelectorAll('img');
    
    // Process each image
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && !isBase64DataUrl(src) && !src.startsWith('blob:') && !src.startsWith('http')) {
        try {
          const resolvedSrc = await resolveFilePath(src);
          img.setAttribute('src', resolvedSrc);
          console.log('Resolved image in HTML:', { original: src, resolved: resolvedSrc });
        } catch (error) {
          console.error('Error resolving image path in HTML:', error);
        }
      }
    }
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.error('Error processing HTML content:', error);
    return htmlContent;
  }
};

// Watch for HTML changes and process them
watch(() => props.html, async (newHtml) => {
  processedHtml.value = await processHtmlContent(newHtml);
  editedContent.value = newHtml;
  originalContent.value = newHtml;
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
              if (filePath.includes('\\')) {
                filePath = filePath.replace(/\\/g, '/');
              }
              
              // Normalize the path for storage
              const packaged = await window.electron.isPackaged();
              let storedPath = filePath;
              if (packaged && !filePath.startsWith('/data')) {
                storedPath = filePath.replace(/.*\/data/, '/data');
              }
              
              // Resolve the path for immediate display in editor
              const displayPath = await resolveFilePath(storedPath);
              
              console.log('Image upload paths:', {
                original: filePath,
                stored: storedPath,
                display: displayPath
              });
              
              // Return the display path to TinyMCE for immediate showing
              success(displayPath);
              
              setTimeout(() => {
                const editor = tinymce.get('editor');
                if (editor) {
                  let content = editor.getContent();
                  const blobRegex = /src="(blob:[^"]+)"/g;
                  if (blobRegex.test(content)) {
                    content = content.replace(blobRegex, function(match, blobUrl) {
                      if (blobUrl === blobInfo.blobUri()) {
                        return `src="${displayPath}"`;
                      }
                      return match;
                    });
                    editor.setContent(content);
                  }
                }
              }, 100);
            } else {
              failure('Image upload failed: ' + response.message);
            }
          } catch (error) {
            failure('Image upload error: ' + error.message);
          }
        };        
        reader.onerror = function() {
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
              let filePath = response.filePath;
              if (filePath.includes('\\')) {
                filePath = filePath.replace(/\\/g, '/');
              }
              
              // Normalize the path for storage
              const packaged = await window.electron.isPackaged();
              let storedPath = filePath;
              if (packaged && !filePath.startsWith('/data')) {
                storedPath = filePath.replace(/.*\/data/, '/data');
              }
              
              // Resolve the path for display in editor
              const displayPath = await resolveFilePath(storedPath);
              
              console.log('File picker paths:', {
                original: filePath,
                stored: storedPath,
                display: displayPath
              });
              
              cb(displayPath, { title: file.name });
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
              let finalPath = response.filePath;
              if (finalPath.includes('\\')) {
                finalPath = finalPath.replace(/\\/g, '/');
              }
              
              // Normalize the path for storage
              const packaged = await window.electron.isPackaged();
              let storedPath = finalPath;
              if (packaged && !finalPath.startsWith('/data')) {
                storedPath = finalPath.replace(/.*\/data/, '/data');
              }
              
              // Resolve for display
              const displayPath = await resolveFilePath(storedPath);
              cb(displayPath, { title: file.name });
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
          // Process the content before setting it in the editor
          const processedContent = await processHtmlContent(editedContent.value);
          editor.setContent(processedContent);
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

const startEdit = () => {
  editing.value = true;
  editedContent.value = props.html;
  initTinyMCE();
};

const cancelEdit = () => {
  editing.value = false;
  editedContent.value = originalContent.value;
  destroyTinyMCE();
};

const normalizeImagePath = async (path) => {
  if (!path) return path;
  
  try {
    const packaged = await window.electron.isPackaged();
    if (packaged) {
      // For packaged app, convert any absolute path back to /data/... format
      if (path.startsWith('file:///')) {
        const match = path.match(/\/data\/images\/[^"]+/);
        if (match) {
          return match[0];
        }
      }
      return path.replace(/^\/src\//, '/');
    } else {
      // For dev mode, ensure path starts with /src/data
      if (path.startsWith('/data/')) {
        return `/src${path}`;
      }
      return path;
    }
  } catch (error) {
    console.error('Error normalizing path:', error);
    return path;
  }
};

const saveEdit = async () => {
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

    // Normalize image paths back to relative paths before saving
    const images = doc.querySelectorAll('img');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src) {
        const normalizedSrc = await normalizeImagePath(src);
        img.setAttribute('src', normalizedSrc);
        console.log('Normalized image path for saving:', { original: src, normalized: normalizedSrc });
      }
    }

    editedContent.value = doc.body.innerHTML;
    editing.value = false;
    originalContent.value = editedContent.value;
    
    // Update processed HTML for display
    processedHtml.value = await processHtmlContent(editedContent.value);
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
  setTimeout(async () => {
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
  
  // Process HTML content for display
  processedHtml.value = await processHtmlContent(props.html);
  
  const baseUrl = await getTinyMCEBaseUrl();
  tinymce.init({
    ...editorConfig.value,
    base_url: baseUrl,
    target: document.getElementById('editor'),
    setup: (editor) => {
      editorInstance = editor;
      editor.on('init', async () => {
        import('../../tinymce/langs/ru').catch((error) => {
          console.error('Failed to load translation file:', error);
        });
        if (editing.value) {
          const processedContent = await processHtmlContent(editedContent.value);
          editor.setContent(processedContent);
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