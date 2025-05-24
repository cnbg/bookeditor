<template>
  <div>
    <div class="flex flex-wrap justify-end gap-5 mb-5">
      <Button @click="save" icon="pi pi-save" :label="$t('general.save')" severity="success" />
    </div>
    123
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

// Helper function to escape regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\// Helper function to check if string is base64 data URL');
};

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

// Function to process HTML content and resolve image paths for editor display
const processHtmlForEditor = async (htmlContent) => {
  if (!htmlContent) return '';
  
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const images = tempDiv.querySelectorAll('img');
    
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && !isBase64DataUrl(src) && !src.startsWith('blob:') && !src.startsWith('http')) {
        try {
          // First normalize the path to ensure consistent format
          const normalizedPath = await normalizeImagePath(src);
          // Then resolve it for display
          const resolvedSrc = await resolveFilePath(normalizedPath);
          img.setAttribute('src', resolvedSrc);
        } catch (error) {
          console.error('Error resolving image path:', error);
        }
      }
    }
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.error('Error processing HTML:', error);
    return htmlContent;
  }
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

const save = async () => {
  const editor = tinymce.get('editor');
  if (editor) {
    let editorContent = editor.getContent();
    
    // Create DOM parser to normalize image paths
    const parser = new DOMParser();
    const doc = parser.parseFromString(editorContent, 'text/html');
    
    const images = doc.querySelectorAll('img');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src) {
        const normalizedSrc = await normalizeImagePath(src);
        img.setAttribute('src', normalizedSrc);
      }
    }
    
    editorContent = doc.body.innerHTML;
    
    if (editorContent !== props.html) {
      bookSt.saveBlock(editorContent);
      
      // Refresh editor display with processed content
      setTimeout(async () => {
        const processedContent = await processHtmlForEditor(editorContent);
        editor.setContent(processedContent);
      }, 100);
    }
  }
};

watch(() => props.html, async (newVal) => {
  if (!content.value) {
    content.value = newVal;
  }
  const editor = tinymce.get('editor');
  if (editor && !editor.initialized) {
    // Process HTML content before setting it in editor
    const processedContent = await processHtmlForEditor(newVal);
    editor.setContent(processedContent);
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
            const response = await electron.saveImportedFile({
              fileContent: base64Data,
              fileName: fileName
            });
            
            if (response.success) {
              let filePath = response.filePath.replace(/\\/g, '/');
              
              // Create the path that should be stored in JSON
              const packaged = await window.electron.isPackaged();
              let storedPath = filePath;
              if (packaged) {
                storedPath = filePath.replace(/.*\/data/, '/data');
              } else {
                storedPath = filePath.replace(/.*\/src\/data/, '/src/data');
              }
              
              // Resolve the path for immediate display
              const displayPath = await resolveFilePath(storedPath);
              
              // Return the display path to TinyMCE
              success(displayPath);
              
              // After a short delay, replace the display path with stored path in editor content
              setTimeout(async () => {
                const editor = tinymce.get('editor');
                if (editor) {
                  let content = editor.getContent();
                  // Replace all instances of the display path with stored path
                  content = content.replace(new RegExp(escapeRegExp(displayPath), 'g'), storedPath);
                  editor.setContent(content);
                  
                  // Then immediately process again for display
                  const processedContent = await processHtmlForEditor(content);
                  editor.setContent(processedContent);
                }
              }, 100);
            } else {
              failure('Upload failed: ' + response.message);
            }
          } catch (error) {
            failure('Error: ' + error.message);
          }
        };
        
        reader.onerror = () => failure('Could not read file');
        reader.readAsDataURL(blob);
      } catch (error) {
        failure('Upload error: ' + error.message);
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
            const response = await electron.uploadFile(file.path, file.name);
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
      } else if (meta.filetype !== 'image') {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', meta.filetype === 'media' ? 'video/*' : '*/*');
        
        input.onchange = async function() {
          const file = this.files[0];
          try {
            let response;
            if (meta.filetype === 'media') {
              response = await electron.uploadVideo(file.path, file.name);
            } else {
              return;
            }            
            if (response.success) {
              let finalPath = response.filePath;
              if (finalPath.includes('\\')) {
                finalPath = finalPath.replace(/\\/g, '/');
              }
              
              // Store relative path for consistency
              const packaged = await window.electron.isPackaged();
              if (packaged && !finalPath.startsWith('/data')) {
                finalPath = finalPath.replace(/.*\/data/, '/data');
              }
              
              // Resolve for display
              const displayPath = await resolveFilePath(finalPath);
              cb(displayPath, { title: file.name });
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
    urlconverter_callback: async (url, node, onSave, name) => {      
      // Only process image URLs
      if (node.tagName === 'IMG' && url && !url.startsWith('data:') && !url.startsWith('blob:')) {
        try {
          // For display, resolve the path
          if (!onSave) {
            const normalized = await normalizeImagePath(url);
            return await resolveFilePath(normalized);
          }
          // For saving, normalize the path
          return await normalizeImagePath(url);
        } catch (error) {
          console.error('URL conversion error:', error);
          return url;
        }
      }
      return url;
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
        // Process and set initial content
        const processedContent = await processHtmlForEditor(props.html);
        editor.setContent(processedContent);
        
        // Load language pack
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