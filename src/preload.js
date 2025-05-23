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
  uploadPpt: (filePath, fileName, targetDir) => ipcRenderer.invoke('upload-ppt', { filePath, fileName, targetDir }),
  resolvePath: (filePath) => {
    return ipcRenderer.invoke('resolve-path', filePath);
  },
  resolveImagePath: (imagePath) => {
    return ipcRenderer.invoke('resolve-image-path', imagePath);
  },
  openPptFile: (filePath) => {
    return ipcRenderer.invoke('open-ppt-file', filePath);
  },
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
  saveSurvey: (survey, fileName) => ipcRenderer.invoke('save-survey', survey, fileName),
  getSurvey: (fileName) => ipcRenderer.invoke('get-survey', fileName),
  saveImportedFile: (data) => ipcRenderer.invoke('import-file', data),
  importSurveyFile: () => ipcRenderer.invoke('import-survey-file'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openTestViewer: (testId) => ipcRenderer.invoke('open-test-viewer', testId),
  getSurveyFiles: () => ipcRenderer.invoke('get-survey-files'),
  getTestMakerSurveyFiles: () => ipcRenderer.invoke('get-testmaker-survey-files'),
  getTestMakerSurvey: (fileName) => ipcRenderer.invoke('get-testmaker-survey', fileName),
  findTestMakerSurveyByTestId: (testId) => ipcRenderer.invoke('find-testmaker-survey-by-testid', testId),
  
  // Storage functions
  readFileFromStorage: (filePath) => ipcRenderer.invoke('read-file-from-storage', filePath),
  listStorageFiles: (subdir) => ipcRenderer.invoke('list-storage-files', subdir),
});