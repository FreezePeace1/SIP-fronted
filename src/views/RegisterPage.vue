<template>
  <div
    class="container d-flex align-items-start justify-content-center"
    style="min-height: 100vh; padding-top: 5vh"
  >
    <div class="row justify-content-center">
      <div class="col-md-20 form-container">
        <form @submit.prevent="submit">
          <h1 class="h3 mb-3 fw-normal text-center">Пожалуйста зарегистрируйтесь</h1>

          <div class="form-floating mb-3">
            <input v-model="data.userName" type="text" class="form-control" placeholder="Name" />
            <label>Желаемое имя</label>
          </div>
          <div class="form-floating mb-3">
            <input
              v-model="data.email"
              type="email"
              class="form-control"
              placeholder="name@example.com"
            />
            <label>Почта</label>
          </div>
          <div class="form-floating mb-3">
            <input
              v-model="data.phoneNumber"
              type="tel"
              class="form-control"
              placeholder="Номер телефона"
            />
            <label>Номер телефона</label>
          </div>
          <div class="form-floating mb-3">
            <input
              v-model="data.password"
              type="password"
              class="form-control"
              placeholder="Password"
            />
            <label>Пароль</label>
          </div>
          <div class="form-floating mb-3">
            <input
              v-model="data.repeatPassword"
              type="password"
              class="form-control"
              placeholder="Password"
            />
            <label>Повторите пароль</label>
          </div>

          <button class="w-100 btn btn-lg btn-primary" type="submit">Зарегистрироваться</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

export default {
  setup() {
    const data = reactive({
      userName: '',
      email: '',
      phoneNumber: '',
      password: '',
      repeatPassword: '',
    })

    const router = useRouter()
    const authStore = useAuthStore()

    const submit = async () => {
      const response = await fetch('http://localhost:5022/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.status == 200) {
        authStore.setAuth(true)
        await router.push('/')
      }
    }

    return {
      data,
      submit,
      authStore,
    }
  },
}
</script>

<style lang=""></style>
