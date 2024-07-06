const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  uploadFile: (filePath, fileName) => ipcRenderer.invoke('upload-file', { filePath, fileName }),
  uploadVideo: (filePath, fileName) => ipcRenderer.invoke('upload-video', { filePath, fileName }),
  uploadModel: (filePath, fileName) => ipcRenderer.invoke('upload-model', { filePath, fileName }),
  getPaths: () => ipcRenderer.invoke('get-paths'),
  saveBook: (book, fileName) => ipcRenderer.invoke('save-book', book, fileName),
  updateBook: async (book, fileName) => ipcRenderer.invoke('save-book', book, fileName),
  loadBooks: () => ipcRenderer.invoke('load-books'),
  getBookFileName: (bookId) => ipcRenderer.invoke('get-book-filename', bookId),
  deleteBook: (fileName) => ipcRenderer.invoke('delete-book', fileName),
  getTinyMCEBaseUrl: async () => await ipcRenderer.invoke('get-tinymce-base-path'),
  uploadPpt: (filePath, fileName) => ipcRenderer.invoke('upload-ppt', { filePath, fileName }),
  openPptFile: (filePath) => ipcRenderer.invoke('open-ppt-file', filePath),
  resolvePath: (filePath) => ipcRenderer.invoke('resolve-path', filePath),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
  saveSurvey: (survey, fileName) => ipcRenderer.invoke('save-survey', survey, fileName),
  getSurvey: (fileName) => ipcRenderer.invoke('get-survey', fileName),
  saveImportedFile: (data) => ipcRenderer.invoke('import-file', data), 
});
