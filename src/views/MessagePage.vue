<template>
  <div class="message-container" :class="{ 'system-message': messageInfo.userName === 'Admin' }">
    <template v-if="messageInfo.userName === 'Admin'">
      <div class="system-message-content">
        {{ messageInfo.message }}
        <span class="timestamp">
          {{ new Date(messageInfo.timestamp).toLocaleTimeString() }}
        </span>
      </div>
    </template>
    <template v-else>
      <span class="user-name">{{ messageInfo.userName }}</span>
      <div class="message-content">
        {{ messageInfo.message }}
        <span class="timestamp">
          {{ new Date(messageInfo.timestamp).toLocaleTimeString() }}
        </span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    messageInfo: {
      type: Object as () => {
        userName: string
        message: string
        timestamp: number
      },
      required: true,
    },
  },
})
</script>

<style>
.message-container {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #2d2d4d, #3c3c6e);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid #4a4a7a;
  position: relative;
  overflow: hidden;
}

.message-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 25%, rgba(106, 90, 205, 0.2) 50%, transparent 75%);
  animation: shine 6s infinite linear;
}

@keyframes shine {
  100% {
    transform: translate(50%, 50%);
  }
}

.user-name {
  color: #b8b8ff;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.message-content {
  color: #e0e0ff;
  font-size: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  color: #9090d0;
  font-size: 0.8rem;
  margin-left: 1rem;
  flex-shrink: 0;
}

/* Стили для системных сообщений */
.system-message {
  background: transparent;
  box-shadow: none;
  border: none;
  text-align: center;
  padding: 0.5rem;
}

.system-message .message-content {
  color: #a0a0ff;
  font-style: italic;
  font-size: 0.9rem;
  justify-content: center;
}

.system-message::before {
  display: none;
}
</style>
