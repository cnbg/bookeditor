<template>
  <div>
    <div class="flex flex-wrap justify-end gap-5 mb-5">
      <Button @click="save" icon="pi pi-save" :label="$t('general.save')" severity="success" />
    </div>
    <textarea id="editor" v-model="content" class="w-full"></textarea>
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
    plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help quickbars emoticons',
    convert_urls: false,
    relative_urls: false,
    remove_script_host: false,    
    automatic_uploads: true,
    promotion: false,
    images_reuse_filename: true,
    paste_data_images: true,
    image_advtab: true,
    image_uploadtab: false,
    statusbar: false,    
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
      if (meta.filetype !== 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', meta.filetype === 'media' ? 'video/*' : '*/*');
        
        input.onchange = async function() {
          const file = this.files[0];
          try {
            let response;
            if (meta.filetype === 'media') {
              response = await window.electron.uploadVideo(file.path, file.name);
            } else {
              return;
            }            
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
      }
    },    
    extended_valid_elements: '*[.*]',
    draggable_modal: true,
    skin: isDarkMode ? 'oxide-dark' : 'oxide',
    content_css: isDarkMode ? 'dark' : 'default',
    language: 'ru',
    notify_no_image_upload_callback: false,
    remove_trailing_brs: true,
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
      editor.on('init', async () => {
        // Process existing content to fix image paths
        let initialContent = props.html;
        if (initialContent) {
          const isPackaged = await window.electron.isPackaged();
          if (isPackaged) {
            // Fix existing image paths in the content
            initialContent = await fixImagePathsInContent(initialContent);
          }
          editor.setContent(initialContent);
        }
        
        import('../../tinymce/langs/ru').catch((error) => {
          console.error('Failed to load translation file:', error);
        });
      });      
      editor.on('change', () => {
        content.value = editor.getContent();
      });
    }
  };
}

// Helper function to fix image paths in existing content
async function fixImagePathsInContent(content) {
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

<style scoped>
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