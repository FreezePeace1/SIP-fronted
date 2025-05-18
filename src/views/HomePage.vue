<template>
  <div class="container">
    {{ message }}
    <hr />

    <div v-if="friends.length > 0 && authStore.isLoggedIn" class="friends-list">
      <p class="friends-title">Ваши друзья</p>
      <div v-for="friend in friends" :key="friend.id" class="friend-item">
        <span class="friend-name">{{ friend.userName }}</span>
        <div class="buttons">
          <button
            class="btn btn-sm btn-outline-primary"
            @click="openChat(friend.id.toString(), friend.userName)"
          >
            Написать
          </button>
          <button class="btn btn-sm btn-outline-primary">Позвонить</button>
        </div>
      </div>
    </div>
    <p v-if="authStore.isLoggedIn && friends.length <= 0">Пока что нет друзей :(</p>
  </div>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'
import axios from 'axios'

interface Friend {
  id: number
  userName: string
}

export default {
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const message = ref('')
    const friends = ref<Friend[]>([])

    const openChat = (friendId: string, friendName: string) => {
      router.push({
        path: '/chat',
        query: {
          friendId: friendId,
          friendName: friendName,
        },
      })
    }

    const getFriends = async () => {
      try {
        const response = await axios.get(
          'http://localhost:5022/relationships/getallrelationships',
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          },
        )

        if (Array.isArray(response.data.data)) {
          friends.value = response.data.data as Friend[]
        } else {
          console.error('Unexpected response format:', response.data)
        }
      } catch (error) {
        console.error('Error fetching friends:', error)
      }
    }

    onMounted(async () => {
      try {
        const response = await fetch('http://localhost:5022/auth/account', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        const content = await response.json()

        if (response.status == 200) {
          authStore.setAuth(true)
          message.value = 'Добро пожаловать, ' + content.data.userName
          await getFriends()
        } else {
          message.value = 'Вы не вошли в аккаунт'
          authStore.setAuth(false)
        }
      } catch (error) {
        console.log('Error fetching account data:', error)
      }
    })

    return {
      message,
      authStore,
      friends,
      openChat,
    }
  },
}
</script>

<style scoped>
/* Стили остаются без изменений */
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.friends-list {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
}

.friends-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.friend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-name {
  font-size: 1rem;
}

.buttons {
  display: flex;
  gap: 5px;
}
</style>
