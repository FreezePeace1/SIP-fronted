<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <div class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item" v-if="!authStore.isLoggedIn">
              <router-link to="/register" class="nav-link active" aria-current="page"
                >Register</router-link
              >
            </li>
            <li class="nav-item" v-if="!authStore.isLoggedIn">
              <router-link to="/login" class="nav-link" href="#">Login</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/" class="nav-link" href="#">Home</router-link>
            </li>
            <li class="nav-item" v-if="authStore.isLoggedIn">
              <router-link to="/" class="nav-link" @click="logout">Logout</router-link>
            </li>
            <li class="nav-item">
              <router-link to="/chat" class="nav-link">Chat</router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </div>
</template>

<script lang="ts">
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

export default {
  async setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const logout = async () => {
      const response = await fetch('http://localhost:5022/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (response.status == 200) {
        authStore.setAuth(false)
        router.push('/login')
      }
    }

    return { logout, authStore }
  },
}
</script>
