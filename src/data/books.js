import { faker } from '@faker-js/faker'

const images = () => {
    const images = []
    for(let i = 1; i < 10; i++) {
        const img = '/src/data/images/' + i + '.jpg'
        images.push({title: faker.lorem.sentence(), alt: '', src: img, thumb: img})
    }

    return images
}

const chapter = () => {


    return {
        id: faker.string.uuid(),
        parent: null,
        title: faker.lorem.sentence(),
        desc: faker.lorem.sentences({min: 2, max: 5}),
        tags: faker.lorem.words({min: 1, max: 3}).split(' '),
        date: faker.date.recent(),
        pages: faker.string.numeric({length: {min: 2, max: 3}}),
        expanded: false,
        order: 0,
        items: 0,
        blocks: [
            {id: faker.string.uuid(), type: 'html', content: faker.lorem.paragraphs({min: 2, max: 5})},
            {id: faker.string.uuid(), type: 'image', content: images()},
            {id: faker.string.uuid(), type: 'html', content: faker.lorem.paragraphs({min: 2, max: 5})},
            {id: faker.string.uuid(), type: 'html', content: faker.lorem.paragraphs({min: 2, max: 5})},
            {id: faker.string.uuid(), type: 'html', content: faker.lorem.paragraphs({min: 2, max: 5})},
            {id: faker.string.uuid(), type: 'image', content: images()},
        ],
    }
}

const fillBooks = () => {
    for(let i = 0; i < 5; i++) {
        const book = {
            id: faker.string.uuid(),
            title: faker.lorem.sentence(),
            desc: faker.lorem.sentences({min: 2, max: 5}),
            author: {
                name: faker.person.fullName(),
                email: faker.internet.email(),
                phone: faker.phone.number(),
                bio: faker.person.bio(),
                avatar: faker.image.avatar(),
            },
            tags: faker.lorem.words({min: 1, max: 3}).split(' '),
            date: faker.date.recent(),
            cover: faker.image.urlLoremFlickr({category: 'history'}),
            pages: faker.string.numeric({length: {min: 2, max: 3}}),
            chapters: [],
        }

        for(let j = 0; j < 5; j++) {
            const ch1 = chapter()
            ch1.book_id = book.id
            ch1.order = j
            ch1.items = 4
            book.chapters.push(ch1)

            for(let k = 0; k < ch1.items; k++) {
                const ch2 = chapter()
                ch2.book_id = book.id
                ch2.parent = ch1.id
                ch2.order = k

                book.chapters.push(ch2)
            }
        }

        books.push(book)
    }
}

// const books = []
// fillBooks()
// console.log(books)

// const books = [
//     algoData,
//     kgData,
//     bioData,
//     mathData,
//     histData,
//     enData,
//     ...bookData,
// ]

// export default books

const loadBooks = async () => {
    try {
        const response = await window.electron.loadBooks();
        if (response.success) {
            return response.books;
        } else {
            console.error('Error loading books:', response.message);
            return [];
        }
    } catch (error) {
        console.error('Error loading books:', error);
        return [];
    }
};

const books = await loadBooks();

export default books;