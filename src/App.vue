<template>
  <div id="app">
    <Suspense>
      <template #default>
        <NavigationBar />
      </template>
      <template #fallback>
        <div>Загрузка...</div>
        <!-- Отображается пока загружается NavigationBar -->
      </template>
    </Suspense>
    <router-view />
  </div>
</template>

<script lang="ts">
import NavigationBar from '@/components/NavigationBar.vue'

export default {
  components: { NavigationBar },
}
</script>

<style>
.form-signin {
  width: 100%;
  max-width: 330px;
  padding: 15px;
  margin: auto;
}

.form-signin .checkbox {
  font-weight: 400;
}

.form-signin .form-floating:focus-within {
  z-index: 2;
}

.form-signin input[type='email'] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.form-signin input[type='password'] {
  margin-bottom: 10px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>
