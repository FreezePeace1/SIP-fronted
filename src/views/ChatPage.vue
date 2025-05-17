<template>
  <div class="main-cont">
    <div class="chat-container">
      <div class="chat-header">
        <h2>{{ chatRoom }}</h2>
        <button @click="handleClose" class="close-button">×</button>
      </div>

      <div class="messages-list">
        <Message v-for="(message, index) in messages" :key="index" :message-info="message" />
      </div>

      <form @submit.prevent="sendMessage" class="message-form">
        <input
          type="text"
          v-model="newMessage"
          placeholder="Введите сообщение"
          class="message-input"
        />
        <button type="submit" class="send-button">Отправить</button>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import Message from '@/views/MessagePage.vue'

export default defineComponent({
  components: {
    Message,
  },

  props: {
    messages: {
      type: Array as () => Array<{
        userName: string
        message: string
        timestamp: number
      }>,
      required: true,
    },
    chatRoom: {
      type: String,
      required: true,
    },
    closeChat: {
      type: Function, // Явное указание типа
      required: true,
    },
  },

  setup(props, { emit }) {
    const newMessage = ref('')

    // Объявляем handleClose внутри setup
    const handleClose = () => {
      props.closeChat() // Вызываем переданный пропс
    }

    const sendMessage = async () => {
      if (newMessage.value.trim()) {
        await emit('send-message', newMessage.value)
        newMessage.value = ''
      }
    }

    return {
      newMessage,
      sendMessage,
      handleClose, // Возвращаем метод
    }
  },
})
</script>

<style>
.main-cont {
  width: 100%;
}

.chat-container {
  width: 100%;
  max-width: 800px;
  height: 90vh;
  margin: 0 auto;
  background: linear-gradient(145deg, #0f0f1a, #1a1a2e);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(45deg, #2a2a4a, #3d3d6b);
  border-bottom: 2px solid #4a4a7a;
}

.chat-header h2 {
  color: #e0e0ff;
  margin: 0;
  font-size: 1.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.messages-list {
  height: calc(90vh - 160px); /* Автоматический расчет высоты */
  padding: 1.5rem;
  overflow-y: auto;
  background: rgba(16, 16, 32, 0.8);
}

.close-button {
  color: #a0a0ff;
  font-size: 2rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.close-button:hover {
  transform: scale(1.2);
  color: #bdbdff;
}
</style>
