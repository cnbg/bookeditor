
import { app, BrowserWindow, nativeTheme, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
// Remove squirrel startup import completely
const fsOld = require('fs');
const { exec } = require('child_process');

const fsPromises = fs.promises;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Remove squirrel startup check completely

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
                nodeIntegration: false,
                contextIsolation: true,
            },
            icon: 'src/data/icon.png'
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

    // Rest of your code remains exactly the same...
    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        app.setAsDefaultProtocolClient('bookEditor');
    });

    app.on('open-url', (event, url) => {
        event.preventDefault();
        // Parse the URL and handle it accordingly
        const testId = url.replace('bookEditor://test/', '');
        // You can now use this testId to open the specific test in your second app
        // For example, you might want to send this to your renderer process
        if (mainWindow) {
          mainWindow.webContents.send('open-test', testId);
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

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

        try {
            await fsPromises.mkdir(path.dirname(savePath), { recursive: true });
            
            // Determine if fileContent is base64 encoded or binary
            let buffer;
            if (typeof fileContent === 'string') {
                // It's a base64 string
                buffer = Buffer.from(fileContent, 'base64');
            } else if (fileContent instanceof Buffer) {
                // It's already a Buffer
                buffer = fileContent;
            } else if (fileContent instanceof Uint8Array || fileContent instanceof ArrayBuffer) {
                // It's some other binary format
                buffer = Buffer.from(fileContent);
            } else {
                // Default case, try to convert to buffer as is
                buffer = Buffer.from(fileContent);
            }
            
            await fsPromises.writeFile(savePath, buffer);
            
            // Calculate relative path for the response - DON'T include file:// protocol here
            let relativePath;
            if (app.isPackaged) {
                // For packaged app - use data/subdir/filename format
                relativePath = `data/${subdir}/${fileName}`;
            } else {
                // For development - use src/data/subdir/filename format
                relativePath = `src/data/${subdir}/${fileName}`;
            }
            
            // Make sure path uses forward slashes for consistency
            relativePath = relativePath.replace(/\\/g, '/');
            
            console.log(`File saved successfully: ${savePath}`);
            console.log(`Relative path: ${relativePath}`);
            
            return { 
                success: true, 
                filePath: `/${relativePath}`, // Add leading slash but no file:// protocol
                fullPath: savePath
            };
        } catch (error) {
            console.error(`Error saving file to ${savePath}:`, error);
            return { 
                success: false, 
                message: `Error saving file: ${error.message}` 
            };
        }
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

    ipcMain.handle('upload-ppt', async (event, { filePath, fileName, targetDir }) => {
        try {
          const resourcesPath = process.resourcesPath;
          const appPath = app.getAppPath();
          let uploadDir;
          let uploadPath;
          let sourceFilePath = filePath;

          if (!app.isPackaged) {
            uploadDir = path.join(appPath, targetDir);
            uploadPath = path.join(uploadDir, fileName);
          } else {
            uploadDir = path.join(resourcesPath, targetDir);
            uploadPath = path.join(uploadDir, fileName);
          }

          await fs.promises.mkdir(uploadDir, { recursive: true });

          // If filePath doesn't include a directory path, assume it's in the app's temp directory
          if (path.dirname(filePath) === '.') {
            sourceFilePath = path.join(app.getPath('temp'), filePath);
          }

          // Check if file already exists, if so, append a number to the filename
          let counter = 1;
          let finalFileName = fileName;
          while (await fs.promises.access(uploadPath).then(() => true).catch(() => false)) {
            const { name, ext } = path.parse(fileName);
            finalFileName = `${name} (${counter})${ext}`;
            uploadPath = path.join(uploadDir, finalFileName);
            counter++;
          }

          await fs.promises.copyFile(sourceFilePath, uploadPath);

          let relativePath;
          if (app.isPackaged) {
            relativePath = path.relative(resourcesPath, uploadPath).replace(/\\/g, '/');
          } else {
            relativePath = path.relative(appPath, uploadPath).replace(/\\/g, '/');
          }
          return { success: true, filePath: `/${relativePath}`, fileName: finalFileName };
        } catch (error) {
          console.error('Error uploading PPT:', error);
          return { success: false, message: error.message };
        }
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

    ipcMain.handle('save-book', async (event, book, fileName) => {
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
        console.log('Opening PPT file:', filePath); // Debug log
        if (filePath) {
          await shell.openPath(filePath);
          return { success: true };
        } else {
          throw new Error('File path is not provided.');
        }
      } catch (error) {
        console.error('Error opening PowerPoint file:', error);
        return { success: false, message: error.message };
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

                // Expanded image file extensions
                case '.png':
                case '.jpg':
                case '.jpeg':
                case '.gif':
                case '.bmp':
                case '.webp':  // Added webp support
                case '.tiff':  // Added tiff support
                case '.svg':   // Added svg support
                case '.ico':   // Added ico support
                    subdir = 'images';
                    break;

                // Expanded video file extensions
                case '.mp4':
                case '.avi':
                case '.mov':
                case '.wmv':
                case '.flv':
                case '.mkv':   // Added mkv support
                case '.webm':  // Added webm support
                case '.m4v':   // Added m4v support
                case '.3gp':   // Added 3gp support
                    subdir = 'videos';
                    break;

                // Expanded model file extensions
                case '.obj':
                case '.fbx':
                case '.gltf':
                case '.glb':
                case '.stl':   // Added stl support
                case '.dae':   // Added dae support
                case '.3ds':   // Added 3ds support
                    subdir = 'models';
                    break;

                // Expanded PowerPoint file extensions (including old and new presentation types)
                case '.ppt':
                case '.pptx':
                case '.pot':   // Added PowerPoint template file (old format)
                case '.potx':  // Added PowerPoint template file (new format)
                case '.pps':   // Added PowerPoint slideshow (old format)
                case '.ppsx':  // Added PowerPoint slideshow (new format)
                case '.odp':   // Added odp (OpenDocument Presentation) support
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
        return saveBookFile(book, `${book.id}.json`, 'books');
    });

    ipcMain.handle('save-image', async (event, { filePath, fileName }) => {
        return saveFile(filePath, fileName, 'images');
    });

    ipcMain.handle('save-book-file', async (event, { book, fileName }) => {
        return saveBookFile(book, fileName, 'books');
    });

    ipcMain.handle('import-survey-file', async () => {
        try {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
          });

          if (!canceled && filePaths.length > 0) {
            const content = await fs.readFile(filePaths[0], 'utf8');
            return { success: true, data: content };
          } else {
            return { success: false, message: 'File selection was cancelled' };
          }
        } catch (error) {
          console.error('Error importing survey file:', error);
          return { success: false, message: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
          await shell.openExternal(url);
          return { success: true };
        } catch (error) {
          console.error('Failed to open external URL:', error);
          return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-test-viewer', async (event, testId) => {
        try {
            const currentDir = path.dirname(app.getPath('exe'));
            const testViewerPath = path.join(currentDir, '..', 'testviewer', 'TestViewer.exe');
            // const testViewerPath = path.join(currentDir, 'testviewer', 'TestViewer.exe');
            const command = `"${testViewerPath}" --testId="${testId}"`;

            exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            if (stdout) console.log(`stdout: ${stdout}`);
            if (stderr) console.error(`stderr: ${stderr}`);
            });

            return { success: true };
        } catch (error) {
            console.error('Failed to open TestViewer:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-survey-files', async () => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let surveyDir;

            if (!app.isPackaged) {
                surveyDir = path.join(appPath, 'src', 'data', 'survey');
            } else {
                surveyDir = path.join(resourcesPath, 'data', 'survey');
            }

            // Check if directory exists
            if (!fs.existsSync(surveyDir)) {
                return { success: true, files: [] };
            }

            const surveyFiles = fs.readdirSync(surveyDir).filter(file => path.extname(file) === '.json');
            return { success: true, files: surveyFiles };
        } catch (error) {
            console.error('Error getting survey files:', error);
            return { success: false, message: error.message, files: [] };
        }
    });

    ipcMain.handle('get-testmaker-survey-files', async () => {
        try {
            const currentDir = path.dirname(app.getPath('exe'));
            const testMakerPath = path.join(currentDir, '..', 'TestMaker');
            const surveyDir = path.join(testMakerPath, 'resources', 'data', 'survey');

            console.log('Looking for TestMaker survey files in:', surveyDir);

            // Check if directory exists
            if (!fs.existsSync(surveyDir)) {
                console.log('TestMaker survey directory does not exist:', surveyDir);
                return { success: true, files: [], path: surveyDir };
            }

            const surveyFiles = fs.readdirSync(surveyDir).filter(file => 
                path.extname(file) === '.json' && file.startsWith('survey_')
            );
            
            console.log('Found survey files:', surveyFiles);
            return { success: true, files: surveyFiles, path: surveyDir };
        } catch (error) {
            console.error('Error getting TestMaker survey files:', error);
            return { success: false, message: error.message, files: [], path: null };
        }
    });

    ipcMain.handle('get-testmaker-survey', async (event, fileName) => {
        try {
            const currentDir = path.dirname(app.getPath('exe'));
            const testMakerPath = path.join(currentDir, '..', 'TestMaker');
            const surveyPath = path.join(testMakerPath, 'resources', 'data', 'survey', fileName);

            console.log('Reading TestMaker survey file:', surveyPath);

            if (!fs.existsSync(surveyPath)) {
                console.log('Survey file does not exist:', surveyPath);
                return { success: false, message: 'Survey file not found' };
            }

            const data = await fs.promises.readFile(surveyPath, 'utf-8');
            return { success: true, data: JSON.parse(data) };
        } catch (error) {
            console.error('Error reading TestMaker survey file:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('find-testmaker-survey-by-testid', async (event, testId) => {
        try {
            const currentDir = path.dirname(app.getPath('exe'));
            const testMakerPath = path.join(currentDir, '..', 'TestMaker');
            const surveyDir = path.join(testMakerPath, 'resources', 'data', 'survey');

            console.log('Looking for survey with testId:', testId, 'in:', surveyDir);

            if (!fs.existsSync(surveyDir)) {
                return { success: false, message: 'TestMaker survey directory not found' };
            }

            const surveyFiles = fs.readdirSync(surveyDir).filter(file => 
                path.extname(file) === '.json' && file.startsWith('survey_')
            );

            for (const fileName of surveyFiles) {
                try {
                    const filePath = path.join(surveyDir, fileName);
                    const data = await fs.promises.readFile(filePath, 'utf-8');
                    const surveyData = JSON.parse(data);
                    
                    if (surveyData.testId === testId) {
                        console.log('Found matching survey file:', fileName);
                        return { 
                            success: true, 
                            fileName: fileName,
                            data: surveyData,
                            filePath: filePath
                        };
                    }
                } catch (error) {
                    console.warn(`Failed to read survey file ${fileName}:`, error);
                }
            }

            console.log('No matching survey file found for testId:', testId);
            return { success: false, message: 'Survey file not found for testId' };
        } catch (error) {
            console.error('Error finding TestMaker survey by testId:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('read-file-from-storage', async (event, filePath) => {
        try {
            console.log(`📖 Reading file from storage: ${filePath}`);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ File does not exist: ${filePath}`);
                return null;
            }

            // Read file as buffer
            const fileBuffer = await fs.promises.readFile(filePath);
            console.log(`✅ Successfully read file: ${filePath} (${fileBuffer.length} bytes)`);
            
            return fileBuffer;
        } catch (error) {
            console.error(`❌ Error reading file from storage: ${filePath}`, error);
            return null;
        }
    });

    // Also add a helper to list files in storage directories (useful for debugging)
    ipcMain.handle('list-storage-files', async (event, subdir) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            let storageDir;

            if (!app.isPackaged) {
                storageDir = path.join(appPath, 'src', 'data', subdir);
            } else {
                storageDir = path.join(resourcesPath, 'data', subdir);
            }

            console.log(`📁 Listing files in storage directory: ${storageDir}`);

            if (!fs.existsSync(storageDir)) {
                console.warn(`⚠️ Storage directory does not exist: ${storageDir}`);
                return { success: true, files: [], directory: storageDir };
            }

            const files = fs.readdirSync(storageDir);
            console.log(`✅ Found ${files.length} files in ${storageDir}`);
            
            return { 
                success: true, 
                files: files,
                directory: storageDir 
            };
        } catch (error) {
            console.error(`❌ Error listing storage files in ${subdir}:`, error);
            return { 
                success: false, 
                message: error.message,
                files: [],
                directory: null 
            };
        }
    });

    // Add this IPC handler to your main.js file to better handle image path resolution

    ipcMain.handle('resolve-image-path', async (event, imagePath) => {
        try {
            const resourcesPath = process.resourcesPath;
            const appPath = app.getAppPath();
            
            // Clean the path
            let cleanPath = imagePath;
            if (cleanPath.startsWith('/')) {
                cleanPath = cleanPath.substring(1);
            }
            
            let resolvedPath;
            if (!app.isPackaged) {
                // Development mode
                resolvedPath = path.join(appPath, 'src', cleanPath);
            } else {
                // Packaged mode
                resolvedPath = path.join(resourcesPath, cleanPath);
            }
            
            // Check if file exists
            if (fs.existsSync(resolvedPath)) {
                console.log(`✅ Image path resolved: ${imagePath} -> ${resolvedPath}`);
                return {
                    success: true,
                    path: resolvedPath,
                    exists: true
                };
            } else {
                console.warn(`⚠️ Image file not found: ${resolvedPath}`);
                return {
                    success: false,
                    path: resolvedPath,
                    exists: false,
                    message: 'Image file not found'
                };
            }
            
        } catch (error) {
            console.error(`❌ Error resolving image path: ${imagePath}`, error);
        return {
            success: false,
            path: null,
            exists: false,
            message: error.message
        };
    }
    });

    ipcMain.handle('resolve-path', (event, filePath) => {
        try {
            let resolvedPath;
            
            // Remove any existing file:// protocol
            let cleanPath = filePath.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
            
            if (app.isPackaged) {
                // For packaged app
                if (cleanPath.startsWith('/')) {
                    // Remove leading slash for proper path joining
                    cleanPath = cleanPath.substring(1);
                }
                resolvedPath = path.join(process.resourcesPath, cleanPath);
            } else {
                // For development
                if (cleanPath.startsWith('src/')) {
                    resolvedPath = path.join(app.getAppPath(), cleanPath);
                } else if (cleanPath.startsWith('/src/')) {
                    resolvedPath = path.join(app.getAppPath(), cleanPath.substring(1));
                } else if (cleanPath.startsWith('/')) {
                    resolvedPath = path.join(app.getAppPath(), 'src', cleanPath.substring(1));
                } else {
                    resolvedPath = path.join(app.getAppPath(), cleanPath);
                }
            }
            
            // Normalize the path and return without file:// protocol
            resolvedPath = path.normalize(resolvedPath);
            
            console.log(`🔍 Path resolution: ${filePath} -> ${resolvedPath}`);
            return resolvedPath;
            
        } catch (error) {
            console.error(`❌ Error in resolve-path: ${filePath}`, error);
            return filePath; // Return original path as fallback
        }
    });
}