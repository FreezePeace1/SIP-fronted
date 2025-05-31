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

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1e2b 0%, #0c0e17 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.form-card {
  background: rgba(30, 33, 47, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 420px;
  z-index: 2;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-header {
  background: linear-gradient(90deg, #4361ee 0%, #3a0ca3 100%);
  padding: 25px;
  text-align: center;
}

.logo {
  color: white;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.auth-form {
  padding: 30px;
}

.title {
  color: #e0e0ff;
  text-align: center;
  margin-bottom: 30px;
  font-weight: 600;
  font-size: 1.8rem;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  color: #a0a7d0;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.form-control {
  width: 100%;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 23, 36, 0.7);
  color: #e0e0ff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #4361ee;
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.2);
  background: rgba(20, 23, 36, 0.9);
}

.auth-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(90deg, #4361ee 0%, #3a0ca3 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.auth-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(67, 97, 238, 0.4);
}

.switch-auth {
  text-align: center;
  color: #8a92b2;
  margin-top: 25px;
  font-size: 0.95rem;
}

.switch-auth a {
  color: #4cc9f0;
  text-decoration: none;
  margin-left: 5px;
  font-weight: 500;
  transition: color 0.3s;
}

.switch-auth a:hover {
  color: #4361ee;
  text-decoration: underline;
}

.decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
}

.circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.15;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: #4361ee;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 400px;
  height: 400px;
  background: #3a0ca3;
  bottom: -150px;
  left: -100px;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: #4cc9f0;
  top: 40%;
  left: 30%;
}
</style>
