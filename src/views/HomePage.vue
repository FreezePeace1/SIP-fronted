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

    <!-- Секция истории звонков -->
    <div v-if="callingstory.length > 0" class="calling-history-section">
      <h3>История звонков</h3>
      <div v-for="story in callingstory" :key="story.id" class="story-item">
        <div class="story-info">
          <div class="participant">
            <span class="label">С кем:</span> {{ story.secondParticipantName }}
          </div>
          <div class="time">
            <span class="label">Начало:</span> {{ formatDateTime(story.createdAt) }}
          </div>
          <div v-if="story.endedAt" class="duration">
            <span class="label">Длительность:</span>
            {{ calculateDuration(story.createdAt, story.endedAt) }}
          </div>
          <div v-else class="status">
            <span class="badge bg-warning">В процессе</span>
          </div>
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
          <button @click="startCall(friend.id)" class="btn btn-sm btn-primary">Call</button>
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

interface CallingStory {
  id: number
  secondParticipantName: string
  createdAt: Date
  endedAt?: Date
}

interface CallingStoryResponse {
  id: number
  secondParticipantName: string
  createdAt: string // Сервер возвращает строку
  endedAt: string | null
}

export default {
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const message = ref('')
    const friends = ref<Friend[]>([])
    const friendRequests = ref<FriendRequest[]>([])
    const callingstory = ref<CallingStory[]>([])
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

    //Получение истории звонков
    const fetchCallingStories = async () => {
      try {
        const response = await axios.get<{ data: CallingStoryResponse[] }>(
          'http://localhost:5022/callingstory/getusercallingstories',
          { withCredentials: true },
        )

        callingstory.value = response.data.data.map((story) => ({
          id: story.id,
          secondParticipantName: story.secondParticipantName,
          createdAt: new Date(story.createdAt),
          endedAt: story.endedAt ? new Date(story.endedAt) : undefined,
        }))
      } catch (error) {
        console.error('Не удалось получить историю звонков', error)
      }
    }

    // Новые функции для работы с датами
    const formatDateTime = (date: Date) => {
      return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const calculateDuration = (start: Date, end: Date) => {
      const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60

      return `${minutes} мин. ${remainingSeconds} сек.`
    }

    // Начало звонка
    const startCall = async (friendId: number) => {
      try {
        const friend = friends.value.find((f) => f.id === friendId)
        if (!friend) {
          alert('Друг не найден')
          return
        }

        // 1. Создаем/получаем комнату для звонка
        const roomResponse = await axios.post(
          'http://localhost:5022/webchatroom/getuserswebchatroom',
          {
            SecondParticipantId: friendId.toString(),
          },
          { withCredentials: true },
        )

        if (!roomResponse.data.isSucceed) {
          throw new Error(roomResponse.data.errorMessage || 'Не удалось создать комнату')
        }

        const roomId = roomResponse.data.data.id

        // 2. Начинаем звонок (создаем запись в истории)
        await axios.post(
          'http://localhost:5022/callingstory/startuserscallingstory',
          {
            SecondParticipantId: friendId.toString(),
          },
          { withCredentials: true },
        )

        // 3. Переходим на страницу звонка с параметрами комнаты
        router.push({
          path: '/call',
          query: {
            friendId: friendId.toString(),
            friendName: friend.userName,
            roomId: roomId, // Передаем ID комнаты
          },
        })
      } catch (error) {
        console.error('Ошибка начала звонка:', error)
        alert('Произошла ошибка при начале звонка')
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
        await fetchFriends()
        await fetchRequests()
        await fetchCallingStories() // Добавьте этот вызов
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
      callingstory,
      formatDateTime,
      calculateDuration,
      startCall,
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
