<template>
  <div class="chat-container">
    <div v-if="loading" class="loading">Подключение к чату...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="chat-main">
      <div class="chat-header">Чат с пользователем</div>

      <div class="messages-list">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message"
          :class="{ 'my-message': message.isCurrentUser }"
        >
          <div class="message-header">
            <span class="sender">{{ message.senderName }}</span>
            <span class="time">
              {{ message.sentAt.toLocaleTimeString() }}
            </span>
          </div>
          <div class="message-content">
            {{ message.content }}
          </div>
        </div>
      </div>

      <div class="message-input">
        <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Введите сообщение..." />
        <button @click="sendMessage">Отправить</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr'
import { useAuthStore } from '@/store/auth'

interface MessageDto {
  content: string
  sentAt: Date
  senderName: string
  isCurrentUser: boolean
}

interface ChatInfo {
  chatId: string
  participantsUserNames: string[]
}

export default defineComponent({
  setup() {
    const route = useRoute()
    const connection = ref<HubConnection | null>(null)
    const messages = ref<MessageDto[]>([])
    const newMessage = ref('')
    const chatId = ref<string | null>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)
    const currentUserName = ref<string>('')
    const authStore = useAuthStore()
    authStore.setAuth(true)

    const connectToChat = async () => {
      try {
        connection.value = new HubConnectionBuilder()
          .withUrl('http://localhost:5022/chat', {})
          .withAutomaticReconnect()
          .build()

        // Исправленный обработчик сообщений
        connection.value.on('ReceiveMessage', (senderName: string, content: string) => {
          messages.value.push({
            content,
            sentAt: new Date(),
            senderName,
            isCurrentUser: senderName === currentUserName.value,
          })
        })

        // Обработчик истории сообщений
        connection.value.on('LoadMessageHistory', (history: MessageDto[]) => {
          messages.value = history.map((msg) => ({
            ...msg,
            sentAt: new Date(msg.sentAt),
            isCurrentUser: msg.senderName === currentUserName.value,
          }))
        })

        connection.value.on('ReceiveError', (errorMsg: string) => {
          error.value = errorMsg
          console.error('Chat error:', errorMsg)
        })

        await connection.value.start()

        const chatInfo = await connection.value.invoke<ChatInfo>('JoinChat', route.query.friendId)

        chatId.value = chatInfo.chatId
        await loadChatHistory()
      } catch (err) {
        error.value = 'Ошибка подключения к чату'
        console.error('Connection error:', err)
      } finally {
        loading.value = false
      }
    }

    const loadChatHistory = async () => {
      if (!chatId.value || !connection.value) return
      try {
        await connection.value.invoke('LoadChatHistory', chatId.value)
      } catch (err) {
        error.value = 'Ошибка загрузки истории'
        console.error('History load error:', err)
      }
    }

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !connection.value || !chatId.value) return

      try {
        await connection.value.invoke('SendMessage', chatId.value, newMessage.value.trim())
        newMessage.value = ''
      } catch (err) {
        error.value = 'Ошибка отправки сообщения'
        console.error('Send error:', err)
      }
    }

    onMounted(() => {
      connectToChat()
    })

    onUnmounted(() => {
      connection.value?.stop()
    })

    return {
      messages,
      newMessage,
      loading,
      error,
      sendMessage,
    }
  },
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin: 10px;
  padding: 15px;
  border-radius: 12px;
  background: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 80%;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.sender {
  font-weight: 600;
  color: #2c3e50;
}

.time {
  color: #7f8c8d;
  font-size: 0.85em;
}

.message-content {
  font-size: 1.1em;
  color: #34495e;
  line-height: 1.4;
}

.message-input {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
}

input {
  flex: 1;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

button {
  padding: 0.8rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background: #0056b3;
}

.loading {
  padding: 2rem;
  text-align: center;
  font-size: 1.2em;
  color: #666;
}

.error {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
  background: #ffeef0;
  border-radius: 8px;
  margin: 1rem;
}
</style>
