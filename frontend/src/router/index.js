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
      component: () => import('../views/MovieView.vue'),
    },
    {
      path: '/cinemas',
      name : 'cinemas',
      component: () => import('../views/CinemasView.vue'),
    }
  ],
})

export default router
