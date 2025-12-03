import { createRouter, createWebHistory } from 'vue-router'
import TestSuiteView from './views/TestSuiteView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'test-suite',
      component: TestSuiteView
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('./views/HistoryView.vue')
    },
    {
      path: '/compare',
      name: 'compare',
      component: () => import('./views/CompareView.vue')
    },
    {
      path: '/compare/:id1/:id2',
      name: 'compare-with-ids',
      component: () => import('./views/CompareView.vue')
    }
  ]
})

export default router
