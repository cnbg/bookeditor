import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function exportBookAsZip(book) {
  const zip = new JSZip();

  // Create folders for each type inside 'data'
  const folders = ['books', 'images', 'videos', 'models', 'ppt', /* 'survey' */];
  folders.forEach(folder => {
    zip.folder(`data/${folder}`); // Nested inside 'data' folder
  });

  const sanitizedTitle = sanitizeFileName(book.title); // Sanitize title for filename
  zip.folder('data/books').file(`${sanitizedTitle}.json`, JSON.stringify(book));

  // Function to sanitize filename
  function sanitizeFileName(fileName) {
    // Replace invalid characters in filename
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  }

  // Array to store all fetch promises
  const fetchPromises = [];

  // Function to resolve paths based on packaging status
  const resolvePath = (path) => {
    const isPackaged = process.env.NODE_ENV === 'production'; // Check if packaged
     const resourcesPath = process.env.NODE_ENV === 'resourcesPath';
    const resolvedPath = isPackaged ? path.replace(resourcesPath, '/resources/data/', 'resources/data/') : path;
    return resolvedPath;
  };

  // Function to resolve file name based on path
  const resolveFileName = (path, baseFolder) => {
    const isPackaged = process.env.NODE_ENV === 'production'; // Check if packaged
    const relativePath = isPackaged ? path.split(`../resources/data/${baseFolder}/`)[1] : path.split(`/src/data/${baseFolder}/`)[1];
    const fileName = `data/${baseFolder}/${relativePath}`;
    return fileName;
    
  };

  // Add images from chapters to the 'images' folder
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'image' && block.content.html && block.content.html.length > 0) {
            block.content.html.forEach(image => {
              if (typeof image.src === 'string') {
                const imagePath = resolvePath(image.src);
                const fetchPromise = fetch(imagePath)
                  .then(res => res.blob())
                  .then(blob => {
                    const fileName = resolveFileName(image.src, 'images');
                    zip.file(fileName, blob);
                  })
                  .catch(error => console.error(`Failed to fetch image: ${image.src}`, error));
                fetchPromises.push(fetchPromise);
              }
            });
          }
        });
      }
    });
  }

  // Add videos from chapters to the 'videos' folder
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'video' && block.content.html && block.content.html.path) {
            if (typeof block.content.html.path === 'string') {
              const videoPath = resolvePath(block.content.html.path);
              const fetchPromise = fetch(videoPath)
                .then(res => res.blob())
                .then(blob => {
                  const fileName = resolveFileName(block.content.html.path, 'videos');
                  zip.file(fileName, blob);
                })
                .catch(error => console.error(`Failed to fetch video: ${block.content.html.path}`, error));
              fetchPromises.push(fetchPromise);
            }
          }
        });
      }
    });
  }

  // Add models from chapters to the 'models' folder
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'model' && block.content.html && block.content.html.path) {
            if (typeof block.content.html.path === 'string') {
              const modelPath = resolvePath(block.content.html.path);
              const fetchPromise = fetch(modelPath)
                .then(res => res.blob())
                .then(blob => {
                  const fileName = resolveFileName(block.content.html.path, 'models');
                  zip.file(fileName, blob);
                })
                .catch(error => console.error(`Failed to fetch model: ${block.content.html.path}`, error));
              fetchPromises.push(fetchPromise);
            }
          }
        });
      }
    });
  }

  // Add PowerPoint files from chapters to the 'ppt' folder
  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'powerpoint' && block.content.html && block.content.html.path) {
            const pptPath = resolvePath(block.content.html.path);
            const fetchPromise = fetch(pptPath)
              .then(res => res.blob())
              .then(blob => {
                const fileName = resolveFileName(block.content.html.path, 'ppt');
                zip.file(fileName, blob);
              })
              .catch(error => console.error(`Failed to fetch PowerPoint: ${block.content.html.path}`, error));
            fetchPromises.push(fetchPromise);
          }
        });
      }
    });
  }

  // Wait for all fetches to complete before generating the zip
  await Promise.all(fetchPromises);

  // Generate the zip file
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Save the zip file using FileSaver.js or any other method
  saveAs(zipBlob, `${sanitizedTitle}`);

  return zipBlob; // Optional: Return the zip blob if needed
}
