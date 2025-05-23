import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function exportBookAsZip(book) {
  const zip = new JSZip();

  const folders = ['books', 'images', 'videos', 'models', 'ppt', 'survey'];
  folders.forEach(folder => {
    zip.folder(`data/${folder}`);
  });

  const sanitizedTitle = sanitizeFileName(book.title);
  
  // Create a modified book object with updated paths for the ZIP
  const modifiedBook = JSON.parse(JSON.stringify(book));
  const pathMapping = new Map(); // To track original -> new path mappings
  
  function sanitizeFileName(fileName) {
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  }

  const fetchPromises = [];

  // Helper function to get the actual file path in storage
  const getStorageFilePath = async (originalPath) => {
    if (!originalPath) return null;
    
    const isPackaged = await window.electron.isPackaged();
    const paths = await window.electron.getPaths();
    
    // Extract filename from the original path
    const fileName = originalPath.split('/').pop();
    
    // Determine which subdirectory this file belongs to based on the original path
    let subdir = 'images'; // default
    if (originalPath.includes('/videos/') || originalPath.includes('\\videos\\')) {
      subdir = 'videos';
    } else if (originalPath.includes('/models/') || originalPath.includes('\\models\\')) {
      subdir = 'models';
    } else if (originalPath.includes('/ppt/') || originalPath.includes('\\ppt\\')) {
      subdir = 'ppt';
    } else if (originalPath.includes('/survey/') || originalPath.includes('\\survey\\')) {
      subdir = 'survey';
    }
    
    let filePath;
    if (isPackaged) {
      // For packaged app: D:\Projects\bookeditor\out\BookEditor-win32-x64\resources\data\images
      filePath = `${paths.resourcesPath}/data/${subdir}/${fileName}`;
    } else {
      // For dev mode: D:\Projects\bookeditor\src\data\images
      filePath = `${paths.appPath}/src/data/${subdir}/${fileName}`;
    }
    
    return filePath;
  };

  const getOriginalFileName = (path) => {
    if (!path) return '';
    
    // Extract just the filename with extension
    const pathParts = path.split('/');
    return pathParts[pathParts.length - 1];
  };

  const updateBookPaths = (book, pathMapping) => {
    if (book.chapters) {
      book.chapters.forEach(chapter => {
        if (chapter.blocks) {
          chapter.blocks.forEach(block => {
            // Update image paths
            if (block.type === 'image' && block.content.html && Array.isArray(block.content.html)) {
              block.content.html.forEach(image => {
                if (image.src && pathMapping.has(image.src)) {
                  image.src = pathMapping.get(image.src);
                }
              });
            }
            
            // Update video paths
            if (block.type === 'video') {
              const videoPath = block.content.html?.path || block.content.path;
              if (videoPath && pathMapping.has(videoPath)) {
                if (block.content.html?.path) {
                  block.content.html.path = pathMapping.get(videoPath);
                }
                if (block.content.path) {
                  block.content.path = pathMapping.get(videoPath);
                }
              }
            }
            
            // Update model paths
            if (block.type === 'model' && block.content.html?.path) {
              if (pathMapping.has(block.content.html.path)) {
                block.content.html.path = pathMapping.get(block.content.html.path);
              }
            }
            
            // Update PowerPoint paths
            if ((block.type === 'ppt' || block.type === 'powerpoint')) {
              const pptPath = block.content.html?.path || block.content.path;
              if (pptPath && pathMapping.has(pptPath)) {
                if (block.content.html?.path) {
                  block.content.html.path = pathMapping.get(pptPath);
                }
                if (block.content.path) {
                  block.content.path = pathMapping.get(pptPath);
                }
              }
            }
          });
        }
      });
    }
    
    // Update book cover path
    if (book.cover && pathMapping.has(book.cover)) {
      book.cover = pathMapping.get(book.cover);
    }
  };

  // Collect all test IDs from the book
  const testIds = new Set();
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'test' && block.content.html) {
            const testId = block.content.html.testId || block.testId;
            if (testId) {
              testIds.add(testId);
            }
          }
        });
      }
    });
  }

  // Helper function to copy file from storage to ZIP
  const copyFileToZip = async (originalPath, targetFolder) => {
    try {
      const fileName = getOriginalFileName(originalPath);
      const storageFilePath = await getStorageFilePath(originalPath);
      
      if (!storageFilePath) {
        console.warn(`⚠️ Could not determine storage path for: ${originalPath}`);
        return null;
      }

      console.log(`📁 Copying from storage: ${storageFilePath}`);
      
      // Read file directly from storage using Electron's file system access
      const fileBuffer = await window.electron.readFileFromStorage(storageFilePath);
      
      if (fileBuffer) {
        // Create blob from buffer
        const blob = new Blob([fileBuffer]);
        
        // Add file to ZIP
        zip.folder(`data/${targetFolder}`).file(fileName, blob);
        console.log(`✅ Added ${targetFolder}: ${fileName}`);
        
        // Return new path for mapping
        return `/data/${targetFolder}/${fileName}`;
      } else {
        console.warn(`⚠️ File not found in storage: ${storageFilePath}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to copy file ${originalPath}:`, error);
      return null;
    }
  };

  // Process images from chapters
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'image' && block.content.html && Array.isArray(block.content.html)) {
            block.content.html.forEach(image => {
              if (typeof image.src === 'string') {
                const fetchPromise = copyFileToZip(image.src, 'images').then(newPath => {
                  if (newPath) {
                    pathMapping.set(image.src, newPath);
                  }
                });
                fetchPromises.push(fetchPromise);
              }
            });
          }
        });
      }
    });
  }

  // Process book cover image
  if (book.cover) {
    const fetchPromise = copyFileToZip(book.cover, 'images').then(newPath => {
      if (newPath) {
        pathMapping.set(book.cover, newPath);
      }
    });
    fetchPromises.push(fetchPromise);
  }

  // Process videos
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'video') {
            const originalPath = block.content.html?.path || block.content.path;
            if (originalPath) {
              const fetchPromise = copyFileToZip(originalPath, 'videos').then(newPath => {
                if (newPath) {
                  pathMapping.set(originalPath, newPath);
                }
              });
              fetchPromises.push(fetchPromise);
            }
          }
        });
      }
    });
  }

  // Process 3D models
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'model' && block.content.html && block.content.html.path) {
            if (typeof block.content.html.path === 'string') {
              const originalPath = block.content.html.path;
              const fetchPromise = copyFileToZip(originalPath, 'models').then(newPath => {
                if (newPath) {
                  pathMapping.set(originalPath, newPath);
                }
              });
              fetchPromises.push(fetchPromise);
            }
          }
        });
      }
    });
  }

  // Process PowerPoint presentations
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if ((block.type === 'ppt' || block.type === 'powerpoint')) {
            const originalPath = block.content.html?.path || block.content.path;
            if (originalPath) {
              const fetchPromise = copyFileToZip(originalPath, 'ppt').then(newPath => {
                if (newPath) {
                  pathMapping.set(originalPath, newPath);
                }
              });
              fetchPromises.push(fetchPromise);
            }
          }
        });
      }
    });
  }

  // Process survey files from TestMaker application
  for (const testId of testIds) {
    const surveyPromise = (async () => {
      try {
        console.log(`Looking for TestMaker survey file with testId: ${testId}`);
        
        // Use the new IPC method to find survey by testId
        const result = await window.electron.findTestMakerSurveyByTestId(testId);
        
        if (result.success) {
          // Add the survey file to the zip
          const surveyContent = JSON.stringify(result.data, null, 2);
          zip.folder('data/survey').file(result.fileName, surveyContent);
          console.log(`✅ Added TestMaker survey file: ${result.fileName} for testId: ${testId}`);
        } else {
          console.warn(`⚠️ TestMaker survey file not found for testId: ${testId} - ${result.message}`);
          
          // Fallback: try to find in local survey files
          try {
            const localResult = await window.electron.getSurvey(`survey_${testId}.json`);
            if (localResult.success && localResult.data.testId === testId) {
              const surveyContent = JSON.stringify(localResult.data, null, 2);
              zip.folder('data/survey').file(`survey_${testId}.json`, surveyContent);
              console.log(`✅ Added local survey file for testId: ${testId}`);
            }
          } catch (localError) {
            console.log(`Local survey file also not found for testId: ${testId}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to process survey for testId ${testId}:`, error);
      }
    })();
    
    fetchPromises.push(surveyPromise);
  }

  // Wait for all file operations to complete
  await Promise.all(fetchPromises);
  
  // Update the book JSON with new paths after all files are processed
  updateBookPaths(modifiedBook, pathMapping);
  
  // Replace the book JSON in the zip with updated paths
  zip.folder('data/books').file(`${sanitizedTitle}.json`, JSON.stringify(modifiedBook, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  saveAs(zipBlob, `${sanitizedTitle}.zip`);

  console.log(`📦 Export completed: ${sanitizedTitle}.zip`);
  console.log('Path mappings:', Array.from(pathMapping.entries()));

  return zipBlob;
}