import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
  }),
  actions: {
    setAuth(status: boolean) {
      this.isLoggedIn = status
    },
  },
})
