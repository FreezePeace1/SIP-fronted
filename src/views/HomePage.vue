<template>
  <div class="container">
    {{ message }}
    <hr />

    <!-- Поиск и добавление друзей -->
    <div class="search-section" v-if="authStore.isLoggedIn">
      <input v-model="searchQuery" placeholder="Введите имя пользователя..." class="search-input" />
      <button @click="handleSearch" class="btn btn-primary">Найти</button>
      <div v-if="searchResult" class="search-result">
        Найден пользователь: {{ searchResult.userName }}
        <button @click="sendFriendRequest" class btn btn-sm btn-success>Отправить запрос</button>
      </div>
    </div>

    <!-- Входящие запросы -->
    <div v-if="friendRequests.length > 0" class="requests-section">
      <h3>Запросы в друзья</h3>
      <div v-for="request in friendRequests" :key="request.id" class="request-item">
        <span>{{ request.userName }}</span>
        <div class="request-actions">
          <button @click="acceptRequest(request.id)" class="btn btn-sm btn-success">Принять</button>
          <button @click="declineRequest(request.id)" class="btn btn-sm btn-danger">
            Отклонить
          </button>
        </div>
      </div>
    </div>

    <!-- Список друзей -->
    <div v-if="friends.length > 0" class="friends-section">
      <h3>Ваши друзья</h3>
      <div v-for="friend in friends" :key="friend.id" class="friend-item">
        <span>{{ friend.userName }}</span>
        <div class="friend-actions">
          <button
            @click="openChat(friend.id.toString(), friend.userName)"
            class="btn btn-sm btn-primary"
          >
            Чат
          </button>
          <button class="btn btn-sm btn-primary" v-if="authStore.isLoggedIn">
            <router-link to="/call" class="nav-link">Call</router-link>
          </button>
          <button @click="removeFriend(friend.id)" class="btn btn-sm btn-danger">
            Удалить из друзей
          </button>
        </div>
      </div>
    </div>

    <!-- Сообщения об отсутствии данных -->
    <div
      v-if="authStore.isLoggedIn && !friends.length && !friendRequests.length"
      class="empty-state"
    >
      <p>Список друзей пуст</p>
    </div>
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

interface FriendRequest {
  id: number
  userName: string
}

export default {
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const message = ref('')
    const friends = ref<Friend[]>([])
    const friendRequests = ref<FriendRequest[]>([])
    const searchQuery = ref('')
    const searchResult = ref<Friend | null>(null)

    const declineRequest = async (requestId: number) => {
      try {
        await axios.delete('http://localhost:5022/relationships/deletefriendrequest', {
          params: { friendId: requestId },
          withCredentials: true,
        })
        await fetchRequests()
        await fetchFriends()
      } catch (error) {
        console.error('Ошибка отклонения запроса:', error)
      }
    }

    const openChat = (friendId: string, friendName: string) => {
      router.push({
        path: '/chat',
        query: {
          friendId: friendId,
          friendName: friendName,
        },
      })
    }

    // Получение списка друзей
    const fetchFriends = async () => {
      try {
        const response = await axios.get(
          'http://localhost:5022/relationships/getallrelationships',
          { withCredentials: true },
        )
        friends.value = response.data.data
      } catch (error) {
        console.error('Ошибка загрузки друзей:', error)
      }
    }

    // Получение входящих запросов
    const fetchRequests = async () => {
      try {
        const response = await axios.get('http://localhost:5022/relationships/getallrequests', {
          withCredentials: true,
        })
        friendRequests.value = response.data.data
      } catch (error) {
        console.error('Ошибка загрузки запросов:', error)
      }
    }

    const handleSearch = async () => {
      try {
        const response = await axios.get('http://localhost:5022/relationships/findfriend', {
          params: {
            userName: searchQuery.value.trim(), // Добавьте trim()
          },
          withCredentials: true,
        })

        // Добавьте вывод ответа в консоль
        console.log('Search response:', response.data)

        if (response.data.isSucceed) {
          searchResult.value = response.data.data
        } else {
          alert(response.data.message || 'Пользователь не найден')
          searchResult.value = null
        }
      } catch (error) {
        console.error('Полная информация об ошибке:', error)

        searchResult.value = null
      }
    }

    // Отправка запроса в друзья
    const sendFriendRequest = async () => {
      if (!searchResult.value) return

      try {
        await axios.post(
          'http://localhost:5022/relationships/makerelationship',
          { userName: searchResult.value.userName },
          { withCredentials: true },
        )
        alert('Запрос отправлен!')
        searchQuery.value = ''
        searchResult.value = null
      } catch (error) {
        console.error('Ошибка отправки запроса:', error)
      }
    }

    // Принятие запроса
    const acceptRequest = async (requestId: number) => {
      try {
        await axios.put(
          'http://localhost:5022/relationships/acceptfriendrequest',
          { friendId: requestId },
          { withCredentials: true },
        )
        await fetchRequests()
        await fetchFriends()
      } catch (error) {
        console.error('Ошибка принятия запроса:', error)
      }
    }

    // Удаление друга
    const removeFriend = async (friendId: number) => {
      try {
        await axios.delete('http://localhost:5022/relationships/deletefriend', {
          params: { friendId },
          withCredentials: true,
        })
        await fetchFriends()
      } catch (error) {
        console.error('Ошибка удаления друга:', error)
      }
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

        await fetchFriends()
        await fetchRequests()
      } catch (error) {
        console.log('Error fetching account data:', error)
      }
    })

    return {
      message,
      authStore,
      friends,
      friendRequests,
      searchQuery,
      searchResult,
      handleSearch,
      sendFriendRequest,
      acceptRequest,
      removeFriend,
      openChat,
      declineRequest,
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

.search-section {
  margin-bottom: 30px;
}

.search-input {
  width: 300px;
  margin-right: 10px;
  padding: 8px;
}

.requests-section,
.friends-section {
  margin-top: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 15px;
}

.request-item,
.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.request-actions,
.friend-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 40px 0;
}
</style>
