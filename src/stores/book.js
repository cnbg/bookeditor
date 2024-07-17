import { defineStore } from 'pinia'
import { v4 as uuid } from 'uuid'
import books from '../data/books'

export const useBookStore = defineStore('book', {
    state: () => ({
        books: books,
        book: null,
        bookFileName: null,
        chapter: null,
        block: null,
        editing: false,
    }),
    persist: false,
    getters: {},
    actions: {
        async getBook(bookId, chapterId = null) {
            this.book = this.books?.find(book => book.id === bookId)

            if (this.book) {
                this.bookFileName = await window.electron.getBookFileName(bookId);
            }

            if(chapterId) {
                this.chapter = this.book?.chapters?.find(chapter => chapter.id === chapterId)
                this.expandChapter(this.chapter)
            }
        },
        expandChapter(chapter) {
            this.book?.chapters?.find(ch => {
                if(ch.id === chapter?.parent) {
                    ch.expanded = true
                    if(ch.parent)
                        this.expandChapter(ch)
                    else
                        return true
                }

                return false
            })
        },
        getChapters(parentId = null, s = '') {
            return this.book?.chapters?.filter(chapter => {
                if(s.length > 0) {
                    return chapter.parent === parentId && (
                        chapter.title.match(new RegExp(s, 'i'))
                        // || chapter.desc.match(new RegExp(s, 'i'))
                        // || chapter.tags.includes(s)
                    )
                }
                return chapter.parent === parentId
            }) ?? []
        },
        async saveBook(book) {
            book.id = uuid()
            book.date = new Date()
            book.author = {
                phone: '',
                bio: '',
                avatar: '',
                ...book.author,
            }
            book.pages = 0
            book.chapters = []

            this.books.push(book)  // Ensure this.books is an array and push the new book
            console.log('Books after push:', this.books); // Debug log to check if book is added
            const fileName = await window.electron.getBookFileName(book.id) || `${book.id}.json`
            await window.electron.updateBook(JSON.parse(JSON.stringify(book)), fileName)
        },
        async updateBook(book) {
            this.books = this.books?.map(b => b.id === book.id ? book : b)
            if (!this.bookFileName) {
                this.bookFileName = await window.electron.getBookFileName(book.id);
            }
            await window.electron.updateBook(JSON.parse(JSON.stringify(book)), this.bookFileName)
        },
        async deleteBook(bookId) {
            const book = this.books.find(b => b.id === bookId);
            if (book) {
                const fileName = await window.electron.getBookFileName(bookId);
                if (fileName) {
                    const response = await window.electron.deleteBook(fileName);
                    if (response.success) {
                        this.books = this.books.filter(book => book.id !== bookId);
                    } else {
                        console.error('Error deleting book:', response.message);
                    }
                }
            }
        },
        async saveChapter(chapter) {
            chapter.id = uuid()
            chapter.date = new Date()

            if (!this.book.chapters) {
                this.book.chapters = []
            }

            this.book.chapters.push(chapter)

            if (chapter?.parent) {
                this.book.chapters.map(ch => {
                    if (ch.id === chapter.parent) ch.items++
                    return ch
                })
            }
            if (!this.bookFileName) {
                this.bookFileName = await window.electron.getBookFileName(this.book.id);
            }

            await window.electron.updateBook(JSON.parse(JSON.stringify(this.book)), this.bookFileName)
        },
        async updateChapter(chapter) {
            this.chapter = chapter
            this.book.chapters = this.book.chapters?.map(ch => ch.id === chapter.id ? chapter : ch)

            // Ensure bookFileName is correctly set before updating the book
            if (!this.bookFileName) {
                this.bookFileName = await window.electron.getBookFileName(this.book.id);
            }

            await window.electron.updateBook(JSON.parse(JSON.stringify(this.book)), this.bookFileName)
        },
        async reorderChapters(newOrder) {
            this.book.chapters = this.updateChapterOrder(this.book.chapters, newOrder);
            await this.updateBook(this.book);  // This will save the changes to the file
        },

        updateChapterOrder(originalChapters, newOrder) {
            const updatedChapters = [...originalChapters];

            newOrder.forEach((chapter, index) => {
              const originalIndex = updatedChapters.findIndex(c => c.id === chapter.id);
              if (originalIndex !== -1) {
                updatedChapters[originalIndex] = { ...updatedChapters[originalIndex], order: index };
              }
            });

            // Sort the chapters based on the new order
            updatedChapters.sort((a, b) => a.order - b.order);

            return updatedChapters;
        },
        deleteChapter() {
            if(this.book && this.chapter) {
                this.book.chapters = this.book.chapters.filter(ch => ch.id !== this.chapter.id)
                this.updateBook(this.book)

                this.chapter = null
                this.editing = false
                this.block = null

                return true
            }

            return false
        },
        clearStore() {
            this.book = null
            this.chapter = null
            this.block = null
            this.editing = false
        },
        saveBlock(content = '') {
            if(content.length > 0 ||
                content.path?.length > 0 ||
                content.src?.length > 0 ||
                content.testId?.length > 0
            ) {
                this.chapter?.blocks?.push({
                    ...this.block,
                    ...{
                        id: uuid(),
                        content: {
                            html:content,
                        },
                    },
                })
                console.log(this.chapter);
                this.updateChapter(this.chapter)
            }
            this.block = null
            this.editing = false
        },
        updateBlock(content = '') {
            // this.chapter?.blocks?.push({
            //     ...this.block,
            //     ...{
            //         id: uuid(),
            //         content: content,
            //     },
            // })

            // this.updateChapter(this.chapter)

            this.block = null
            this.editing = false
        },
        updateOrCreateTestBlock(content) {
            if (this.chapter && this.chapter.blocks) {
                const testBlockIndex = this.chapter.blocks.findIndex(block => block.type === 'test');
                if (testBlockIndex !== -1) {
                    // Update existing test block
                    this.chapter.blocks[testBlockIndex] = {
                        ...this.chapter.blocks[testBlockIndex],
                        content: {
                            html: {
                                testId: content.testId
                            }
                        }
                    };
                } else {
                    // Create new test block
                    this.chapter.blocks.push({
                        id: crypto.randomUUID(),
                        type: 'test',
                        content: {
                            html: {
                                testId: content.testId
                            }
                        }
                    });
                }
                this.updateChapter(this.chapter);
            }
        },
        async updateBlockContent(index, updatedContent) {
         /*    if (!updatedContent || typeof updatedContent !== 'object') {
                console.error('Expected updatedContent to be an object:', updatedContent);
                return;
            } */

            if (this.chapter && this.chapter.blocks && this.chapter.blocks[index]) {
                if (!updatedContent.html || updatedContent.html.trim() === '') {
                    this.chapter.blocks.splice(index, 1);
                } else {
                    this.chapter.blocks[index].content = {
                        html: updatedContent.html,
                        backgroundColor: updatedContent.backgroundColor || this.chapter.blocks[index].content.backgroundColor
                    };
                }
                await this.saveBookToFile();
            }
        },

        async updateImageBlock(blockIndex, imageIndex, updatedImage) {
            if (this.chapter && this.chapter.blocks && this.chapter.blocks[blockIndex] && this.chapter.blocks[blockIndex].content[imageIndex]) {
              this.chapter.blocks[blockIndex].content[imageIndex] = updatedImage;
              await this.saveBookToFile();
            }
          },
          async deleteImageBlock(blockIndex, imageIndex) {
            if (this.chapter && this.chapter.blocks) {
                this.chapter.blocks.splice(blockIndex, 1);
                await this.saveBookToFile();
            }
          },
          async updateVideoBlock(blockIndex, updatedVideo) {
            if (this.chapter && this.chapter.blocks && this.chapter.blocks[blockIndex]) {
              this.chapter.blocks[blockIndex].content = updatedVideo;
              await this.saveBookToFile();
            }
          },
          async deleteVideoBlock(blockIndex) {
            if (this.chapter && this.chapter.blocks) {
              this.chapter.blocks.splice(blockIndex, 1);
              await this.saveBookToFile();
            }
          },
          async updateModelBlock(blockIndex, updatedModel) {
            if (this.chapter && this.chapter.blocks && this.chapter.blocks[blockIndex]) {
              this.chapter.blocks[blockIndex].content = updatedModel;
              await this.saveBookToFile();
            }
          },
          async deleteModelBlock(blockIndex) {
            if (this.chapter && this.chapter.blocks) {
              this.chapter.blocks.splice(blockIndex, 1);
              await this.saveBookToFile();
            }
          },
          async updatePptBlock(blockIndex, updatedPpt) {
            if (this.chapter && this.chapter.blocks && this.chapter.blocks[blockIndex]) {
              this.chapter.blocks[blockIndex].content = updatedPpt;
              await this.saveBookToFile();
            }
          },
          async deletePptBlock(blockIndex) {
            if (this.chapter && this.chapter.blocks) {
              this.chapter.blocks.splice(blockIndex, 1);
              await this.saveBookToFile();
            }
          },
        async saveBookToFile() {
            if (!this.bookFileName) {
                console.error('Cannot save book: missing file name.');
                return;
            }
            this.chapter.blocks.forEach(block => {
                if (block.content && typeof block.content === 'object') {
                  block.content.backgroundColor = block.content.backgroundColor || '';
                }
            });
            await window.electron.updateBook(JSON.parse(JSON.stringify(this.book)), this.bookFileName);
        },
        setEditor(type = 'html') {
            this.editing = true;
            this.block = {
              ...{
                id: '',
                type: type,
                content: '',
              },
              ...this.block,
            };
            if (type === 'html') {
              const existingHtmlBlock = this.chapter.blocks.find(b => b.type === 'html');
              if (existingHtmlBlock) {
                this.block = { ...existingHtmlBlock };
              }
            }
          },


        closeEditor() {
            this.editing = false
            this.block = null
        },
        chapterObj(obj, bookId) {
            return {
                ...{
                    id: '',
                    parent: null,
                    book_id: bookId,
                    title: '',
                    desc: '',
                    tags: [],
                    date: null,
                    pages: 0,
                    expanded: false,
                    order: 0,
                    items: 0,
                    blocks: [],
                },
                ...obj,
            };
        },

    },
})
