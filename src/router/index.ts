import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import Home from '@/views/HomePage.vue'
import Login from '@/views/LoginPage.vue'
import Register from '@/views/RegisterPage.vue'
import ChatPage from '@/views/ChatPage.vue'
import VideoCall from '@/views/VideoCall.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  {
    path: '/chat',
    component: ChatPage,
    props: (route: RouteLocationNormalized) => ({
      friendId: route.query.friendId as string,
      friendName: route.query.friendName as string,
    }),
  },
  { path: '/call', component: VideoCall },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
