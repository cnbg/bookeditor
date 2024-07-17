import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function exportBookAsZip(book) {
  const zip = new JSZip();

  const folders = ['books', 'images', 'videos', 'models', 'ppt', 'survey'];
  folders.forEach(folder => {
    zip.folder(`data/${folder}`);
  });

  const sanitizedTitle = sanitizeFileName(book.title);
  zip.folder('data/books').file(`${sanitizedTitle}.json`, JSON.stringify(book));

  function sanitizeFileName(fileName) {
    return fileName.replace(/[<>:"/\\|?*]/g, '_');
  }

  const fetchPromises = [];

  const resolvePath = (path) => {
    const isPackaged = process.env.NODE_ENV === 'production';
     const resourcesPath = process.env.NODE_ENV === 'resourcesPath';
    const resolvedPath = isPackaged ? path.replace(resourcesPath, '/resources/data/', 'resources/data/') : path;
    return resolvedPath;
  };

  const resolveFileName = (path, baseFolder) => {
    const isPackaged = process.env.NODE_ENV === 'production';
    const relativePath = isPackaged ? path.split(`../resources/data/${baseFolder}/`)[1] : path.split(`/src/data/${baseFolder}/`)[1];
    const fileName = `data/${baseFolder}/${relativePath}`;
    return fileName;

  };

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


  if (book.chapters) {
    book.chapters.forEach(chapter => {
      if (chapter.blocks) {
        chapter.blocks.forEach(block => {
          if (block.type === 'test' && block.content.html) {
            const surveyPath = resolvePath(block.path);
            const fetchPromise = fetch(surveyPath)
              .then(res => res.blob())
              .then(blob => {
                const fileName = resolveFileName(block.path, 'survey');
                zip.file(fileName, blob);
              })
              .catch(error => console.error(`Failed to fetch survey: ${block.path}`, error));
            fetchPromises.push(fetchPromise);
          }
        });
      }
    });
  }

  await Promise.all(fetchPromises);

  const zipBlob = await zip.generateAsync({ type: 'blob' });

  saveAs(zipBlob, `${sanitizedTitle}`);

  return zipBlob;
}
