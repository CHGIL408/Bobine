import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/movies/:id',
      name: 'movie-details',
      meta: { title: 'Film' }, // remplacé par le titre du film une fois chargé
      component: () => import('../views/MovieView.vue'),
    },
    {
      path: '/cinemas',
      name : 'cinemas',
      meta: { title: 'Cinémas' },
      component: () => import('../views/CinemasView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      meta: { title: 'Administration' },
      component: () => import('../views/AdminView.vue'),
    }
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Bobine` : 'Bobine'
})

export default router
