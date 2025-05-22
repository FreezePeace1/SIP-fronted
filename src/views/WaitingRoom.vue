<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <!-- Форма подключения -->
    <form
      v-if="!isConnected"
      @submit.prevent="joinChat"
      class="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl space-y-6"
    >
      <div class="chat-container">
        <h2>Онлайн чат</h2>

        <div class="form-group">
          <label>Имя пользователя</label>
          <input type="text" placeholder="Введите ваше имя" v-model="data.UserName" />
        </div>

        <div class="form-group">
          <label>Название чата</label>
          <input type="text" placeholder="Введите название чата" v-model="data.ChatRoom" />
        </div>

        <button class="join-button" :disabled="!isFormValid">Присоединиться</button>
      </div>
    </form>
    <Chat
      v-else
      :messages="messages"
      :chat-room="data.ChatRoom"
      :close-chat="leaveChat"
      @send-message="sendMessage"
      class="w-full max-w-4xl bg-white rounded-xl shadow-lg"
    />
  </div>
</template>

<script lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr'

interface Message {
  userName: string
  message: string
  timestamp: number
}

export default {
  setup() {
    const data = reactive({
      UserName: '',
      ChatRoom: '',
    })

    const isConnected = ref(false)
    const isConnecting = ref(false)
    const messages = ref<Message[]>([])
    const connection = ref<HubConnection | null>(null)

    // Инициализация из URL параметров
    onMounted(() => {
      const params = new URLSearchParams(window.location.search)
      data.UserName = decodeURIComponent(params.get('userName') || '')
      data.ChatRoom = decodeURIComponent(params.get('chatRoom') || '')

      if (data.UserName && data.ChatRoom) {
        joinChat()
      }
    })

    const isFormValid = computed(() => {
      return data.UserName.trim() && data.ChatRoom.trim()
    })

    const joinChat = async () => {
      try {
        isConnecting.value = true

        // Обновляем URL
        const searchParams = new URLSearchParams({
          userName: encodeURIComponent(data.UserName),
          chatRoom: encodeURIComponent(data.ChatRoom),
        })
        window.history.replaceState({}, '', `?${searchParams}`)

        connection.value = new HubConnectionBuilder()
          .withUrl('http://localhost:5022/chat', {
            headers: {
              userName: encodeURIComponent(data.UserName),
              chatRoom: encodeURIComponent(data.ChatRoom),
            },
          })
          .withAutomaticReconnect()
          .build()

        connection.value.on('ReceiveMessage', (userName: string, message: string) => {
          messages.value.push({
            userName,
            message,
            timestamp: Date.now(),
          })
        })

        await connection.value.start()
        await connection.value.invoke('JoinChat', {
          userName: data.UserName,
          chatRoom: data.ChatRoom,
        })

        isConnected.value = true
      } catch (error) {
        console.error('Ошибка подключения:', error)
      } finally {
        isConnecting.value = false
      }
    }

    const leaveChat = async () => {
      if (connection.value) {
        await connection.value.stop()
      }
      isConnected.value = false
      messages.value = []
      window.history.replaceState({}, '', '/') // Очистка URL
    }

    const sendMessage = async (message: string) => {
      if (connection.value) {
        try {
          await connection.value.invoke('SendMessage', message)
        } catch (error) {
          console.error('Ошибка отправки сообщения:', error)
        }
      }
    }

    // Обработка отключения
    connection.value?.onclose(() => {
      isConnected.value = false
      messages.value = []
    })

    return {
      data,
      isConnected,
      isConnecting,
      messages,
      connection,
      isFormValid,
      joinChat,
      leaveChat,
      sendMessage,
    }
  },
}
</script>

<style>
.join-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.chat-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  font-family: Arial;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.join-button {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.join-button:hover {
  background: #0056b3;
}
</style>
