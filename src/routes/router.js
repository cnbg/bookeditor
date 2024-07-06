import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useBookStore } from '../stores/book'

import HomePage from '../pages/HomePage.vue'
import BookListPage from '../pages/book/ListPage.vue'
import BookCreatePage from '../pages/book/CreatePage.vue'
import BookEditPage from '../pages/book/EditPage.vue'
import BookViewPage from '../pages/book/ViewPage.vue'
import UserSettingsPage from '../pages/user/SettingsPage.vue'
import NotFoundPage from '../components/error/NotFoundPage.vue';
import ImportZipPage from '../pages/book/edit/ImportZipDialog.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomePage,
        },
        {
            path: '/book/list',
            name: 'book-list',
            component: BookListPage,
        },
        {
            path: '/book/create/:bookId?',
            name: 'book-create',
            component: BookCreatePage,
            props: true,
        },
        {
            path: '/book/edit/:bookId/:chapterId?',
            name: 'book-edit',
            component: BookEditPage,
            props: true,
            beforeEnter: (to, from) => {
                const bookSt = useBookStore()
                bookSt.clearStore()
            },
        },
        {
            path: '/book/view/:bookId/:chapterId?',
            name: 'book-view',
            component: BookViewPage,
            props: true,
            beforeEnter: (to, from) => {
                const bookSt = useBookStore()
                bookSt.clearStore()
            },
        },
        {
            path: '/user/settings',
            name: 'user-settings',
            component: UserSettingsPage,
        },
        {
            path: '/:fallback(.*)*',
            name: 'not-found',
            component: NotFoundPage,
        },
        {
            path: '/import-zip',
            name: 'import',
            component: ImportZipPage,
        },
    ],
})

router.beforeEach((to, from) => {
    const userSt = useUserStore()
    userSt.syncLocalStorage()

    if(to.name !== 'home' && (!userSt.name || !userSt.email || !userSt.locale)) return {name: 'home'}
})

export default router
