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

  const resolvePath = async (path) => {
    if (!path) return '';
    
    const isPackaged = await window.electron.isPackaged();
    // Remove any leading '/src' or '/resources'
    const cleanPath = path.replace(/^\/(src|resources)\//, '');
    
    // For packaged app, point directly to the resources/data folder
    if (isPackaged) {
      return path.replace('/src/data', 'resources/data');
    }
    
    // For development
    return `/src/${cleanPath}`;
  };
  

  const resolveFileName = (path, baseFolder) => {
    if (!path) return '';
    
    // For packaged app, handle paths with 'src' or 'resources'
    const fileName = path.split(/\/(src|resources)\/data\/[^/]+\//)[2] || path.split('/').pop();
    return `data/${baseFolder}/${fileName}`;
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
          if (block.type === 'video') {
            // Check both content.html.path and content.path
            const videoPath = block.content.html?.path || block.content.path;
            if (videoPath) {
              const resolvedVideoPath = resolvePath(videoPath);
              const fetchPromise = fetch(resolvedVideoPath)
                .then(res => res.blob())
                .then(blob => {
                  const fileName = resolveFileName(videoPath, 'videos');
                  zip.file(fileName, blob);
                })
                .catch(error => console.error(`Failed to fetch video: ${videoPath}`, error));
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
          if ((block.type === 'ppt' || block.type === 'powerpoint')) {
            // Check both content.html.path and content.path since the structure can vary
            const pptPath = block.content.html?.path || block.content.path;
            if (pptPath) {
              const resolvedPptPath = resolvePath(pptPath);
              const fetchPromise = fetch(resolvedPptPath)
                .then(res => res.blob())
                .then(blob => {
                  const fileName = resolveFileName(pptPath, 'ppt');
                  zip.file(fileName, blob);
                })
                .catch(error => console.error(`Failed to fetch PowerPoint: ${pptPath}`, error));
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
          if (block.type === 'test' && block.content.html) {


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
