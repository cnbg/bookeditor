import { app, BrowserWindow, nativeTheme, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'original-fs';
const fsOld = require('fs');


const fsPromises = fs.promises;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;

    const createWindow = () => {
        mainWindow = new BrowserWindow({
            backgroundColor: nativeTheme.shouldUseDarkColors ? '#333' : '#fff',
            width: 1300,
            height: 800,
            titleBarStyle: 'hidden-inset',
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                devTools: true,
                webSecurity: false,
                nodeIntegration: true, // nodeIntegration should be false for security
            },
        });

        if (!app.isPackaged) {
            mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
            mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
        }

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        if (!app.isPackaged) {
            mainWindow.webContents.openDevTools();
        }
    };

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    if (require('electron-squirrel-startup')) {
        app.quit();
    }

    ipcMain.handle('get-tinymce-base-path', async () => {
        if (!app.isPackaged) {
            return '/src/tinymce/';
        } else {
            return path.join(process.resourcesPath, 'tinymce');
        }
    });

    const saveFile = async (filePath, fileName, subdir) => {
        const resourcesPath = process.resourcesPath;
        const appPath = app.getAppPath();
        let uploadDir;
        let uploadPath;

        if (!app.isPackaged) {
            uploadDir = path.join(appPath, 'src', 'data', subdir);
            uploadPath = path.join(uploadDir, fileName);
        } else {
            uploadDir = path.join(resourcesPath, 'data', subdir);
            uploadPath = path.join(uploadDir, fileName);
        }

        await fs.promises.mkdir(uploadDir, { recursive: true });
        await fs.promises.copyFile(filePath, uploadPath);

        let relativePath;
        if (app.isPackaged) {
            relativePath = `../resources/data/${subdir}/${fileName}`;
        } else {
            relativePath = path.relative(appPath, uploadPath).replace(/\\/g, '/');
        }
        return { success: true, filePath: `/${relativePath}` };
    };

    const saveImportedFile = async (fileContent, fileName, subdir) => {
        const resourcesPath = process.resourcesPath;
        const appPath = app.getAppPath();
        let savePath;

        if (!app.isPackaged) {
            savePath = path.join(appPath, 'src', 'data', subdir, fileName);
        } else {
            savePath = path.join(resourcesPath, 'data', subdir, fileName);
        }

        await fsPromises.mkdir(path.dirname(savePath), { recursive: true });
        await fsPromises.writeFile(savePath, Buffer.from(fileContent));

        return { success: true, filePath: savePath };
    };

    ipcMain.handle('upload-file', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'images');
    });

    ipcMain.handle('upload-video', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'videos');
    });

    ipcMain.handle('upload-model', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'models');
    });

    ipcMain.handle('upload-ppt', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'ppt');
    });

    ipcMain.handle('get-paths', async () => {
        const resourcesPath = process.resourcesPath;
        const userDataPath = app.getPath('userData');
        const appPath = app.getAppPath();

        return {
            success: true,
            resourcesPath,
            userDataPath,
            appPath,
        };
    });

    ipcMain.handle('save-book', async (event, book, fileName) => {
        const saveBookFile = async (book, fileName, subdir) => {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let booksDir;
            let bookPath;

            if (!app.isPackaged) {
                booksDir = path.join(appPath, 'src', 'data', subdir);
                bookPath = path.join(booksDir, fileName);
            } else {
                booksDir = path.join(resourcesPath, 'data', subdir);
                bookPath = path.join(booksDir, fileName);
            }

            await fs.promises.mkdir(booksDir, { recursive: true });
            await fs.promises.writeFile(bookPath, JSON.stringify(book, null, 2));

            return { success: true, message: 'Book saved successfully.' };
        };

        return saveBookFile(book, fileName, 'books');
    });

    ipcMain.handle('update-book', async (event, { book, fileName }) => {
        return saveBookFile(book, fileName, 'books');
    });

    ipcMain.handle('load-books', async () => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            
            let booksDir;

            if (!app.isPackaged) {
                booksDir = path.join(appPath, 'src/data/books');
            } else {
                booksDir = path.join(resourcesPath, 'data/books');
            }

            const bookFiles = fs.readdirSync(booksDir).filter(file => path.extname(file) === '.json');
            const books = bookFiles.map(file => {
                const filePath = path.join(booksDir, file);
                const bookData = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(bookData);
            });
            return { success: true, books };
        } catch (error) {
            console.error('Error loading books:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('delete-book', async (event, fileName) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let booksDir;
            let bookPath;

            if (!app.isPackaged) {
                booksDir = path.join(appPath, 'src', 'data', 'books');
                bookPath = path.join(booksDir, fileName);
            } else {
                booksDir = path.join(resourcesPath, 'data', 'books');
                bookPath = path.join(booksDir, fileName);
            }

            await fs.promises.unlink(bookPath);

            return { success: true, message: 'Book deleted successfully.' };
        } catch (error) {
            console.error('Error deleting book:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('get-book-filename', async (event, bookId) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let booksDir;

            if (!app.isPackaged) {
                booksDir = path.join(appPath, 'src', 'data', 'books');
            } else {
                booksDir = path.join(resourcesPath, 'data', 'books');
            }

            const bookFiles = fs.readdirSync(booksDir).filter(file => path.extname(file) === '.json');
            const bookFileName = bookFiles.find(file => {
                const filePath = path.join(booksDir, file);
                const bookData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                return bookData.id === bookId;
            });

            return bookFileName || null;
        } catch (error) {
            console.error('Error getting book file name:', error);
            return null;
        }
    });

    ipcMain.handle('open-ppt-file', async (event, filePath) => {
        try {
            if (filePath) {
                shell.openPath(filePath);
                return { success: true };
            } else {
                throw new Error('File path is not provided.');
            }
        } catch (error) {
            console.error('Error opening PowerPoint file:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('resolve-path', (event, filePath) => {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, filePath);
        } else {
            return path.join(app.getAppPath(), filePath);
        }
    });

    ipcMain.handle('is-packaged', () => app.isPackaged);

    ipcMain.handle('save-survey', async (event, survey, fileName) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let surveyDir;
            let surveyPath;
    
            if (!app.isPackaged) {
                surveyDir = path.join(appPath, 'src', 'data', 'survey');
                surveyPath = path.join(surveyDir, fileName);
            } else {
                surveyDir = path.join(resourcesPath, 'data', 'survey');
                surveyPath = path.join(surveyDir, fileName);
            }
    
            await fs.promises.mkdir(surveyDir, { recursive: true });
            await fs.promises.writeFile(surveyPath, survey);
    
            let relativePath;
            if (app.isPackaged) {
                relativePath = `../resources/data/survey/${fileName}`;
            } else {
                relativePath = path.relative(appPath, surveyPath).replace(/\\/g, '/');
                
            }
            return { success: true, surveyPath: `/${relativePath}` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    });
    

    ipcMain.handle('get-survey', async (event, fileName) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let surveyDir;
            let surveyPath;

            if (!app.isPackaged) {
                surveyDir = path.join(appPath, 'src', 'data', 'survey');
                surveyPath = path.join(surveyDir, fileName);
            } else {
                surveyDir = path.join(resourcesPath, 'data', 'survey');
                surveyPath = path.join(surveyDir, fileName);
            }

            const data = await fs.promises.readFile(surveyPath, 'utf-8');
            return { success: true, data: JSON.parse(data) };
        } catch (error) {
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('import-file', async (event, { fileContent, fileName }) => {
        try {
          const fileExtension = path.extname(fileName).toLowerCase();
          let subdir;
      
          switch (fileExtension) {
            case '.json':
              if (fileName.toLowerCase().includes('survey')) {
                subdir = 'survey';
              } else {
                subdir = 'books';
              }
              break;
            case '.png':
            case '.jpg':
            case '.jpeg':
            case '.gif':
            case '.bmp':
              subdir = 'images';
              break;
            case '.mp4':
            case '.avi':
            case '.mov':
            case '.wmv':
            case '.flv':
              subdir = 'videos';
              break;
            case '.obj':
            case '.fbx':
            case '.gltf':
            case '.glb':
              subdir = 'models';
              break;
            case '.ppt':
            case '.pptx':
              subdir = 'ppt';
              break;
            default:
              throw new Error('Unsupported file type');
          }
      
          return await saveImportedFile(fileContent, fileName, subdir);
        } catch (error) {
          console.error('Error importing file:', error);
          return { success: false, message: error.message };
        }
      });

    ipcMain.handle('import-book', async (event, book) => {
        const saveBookFile = async (book, fileName, subdir) => {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let booksDir;
            let bookPath;

            if (!app.isPackaged) {
                booksDir = path.join(appPath, 'src', 'data', subdir);
                bookPath = path.join(booksDir, fileName);
            } else {
                booksDir = path.join(resourcesPath, 'data', subdir);
                bookPath = path.join(booksDir, fileName);
            }

            await fsPromises.mkdir(booksDir, { recursive: true });
            await fsPromises.writeFile(bookPath, JSON.stringify(book, null, 2));

            return { success: true, message: 'Book saved successfully.' };
        };

        return saveBookFile(book, `${book.id}.json`, 'books');
    });

    ipcMain.handle('save-image', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'images');
    });

    ipcMain.handle('save-book-file', async (event, { book, fileName }) => {
        return saveBookFile(book, fileName, 'books');
    });
}
