<template>
  <div class="video-call">
    <h1>Vue.js Video Call</h1>

    <div class="videos">
      <div class="video-container">
        <h2>Your Video</h2>
        <video ref="localVideo" autoplay muted v-if="cameraEnabled && localStream"></video>
        <p v-else>Camera is disabled</p>
      </div>
      <div class="video-container">
        <h2>Partner's Video</h2>
        <video ref="remoteVideo" autoplay></video>
      </div>
    </div>

    <div class="controls">
      <template v-if="!isInitiator">
        <input
          type="text"
          v-model="roomIdInput"
          placeholder="Enter Room ID"
          :disabled="isCalling"
        />
      </template>
      <button @click="startCallHandler" :disabled="isCalling">
        {{ buttonText }}
      </button>
      <button @click="endCall" :disabled="!isCalling">End Call</button>
      <button @click="toggleCamera">
        {{ cameraEnabled ? 'Disable Camera' : 'Enable Camera' }}
      </button>
      <button @click="toggleMicrophone">
        {{ microphoneEnabled ? 'Disable Microphone' : 'Enable Microphone' }}
      </button>
      <p>Room ID: {{ currentRoomId || 'Not connected' }}</p>
      <p class="status">Status: {{ statusMessage }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr'

const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // {
    //   urls: 'turn:a.relay.metered.ca:80',
    //   username: '14b1ceb850b0118c900edcf6',
    //   credential: 'lqC6h0O5G9Hk3X2B',
    // },
    // {
    //   urls: 'turn:a.relay.metered.ca:443',
    //   username: '14b1ceb850b0118c900edcf6',
    //   credential: 'lqC6h0O5G9Hk3X2B',
    // },
  ],
  // iceTransportPolicy: 'relay' as RTCIceTransportPolicy, // Временно отключено для отладки
}

type SignalMessage =
  | { type: 'offer'; roomId: string; offer: RTCSessionDescriptionInit }
  | { type: 'answer'; roomId: string; answer: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; roomId: string; candidate: RTCIceCandidateInit }

export default defineComponent({
  name: 'VideoCall',
  setup() {
    const connection = ref<HubConnection | null>(null)
    const localVideo = ref<HTMLVideoElement | null>(null)
    const remoteVideo = ref<HTMLVideoElement | null>(null)
    const peerConnection = ref<RTCPeerConnection | null>(null)
    const localStream = ref<MediaStream | null>(null)

    const roomIdInput = ref('')
    const currentRoomId = ref('')
    const isCalling = ref(false)
    const hasPermissions = ref(false)
    const statusMessage = ref('Initializing...')
    const isInitiator = ref(false)
    const pendingCandidates = ref<RTCIceCandidateInit[]>([])
    const cameraEnabled = ref(false)
    const microphoneEnabled = ref(false)
    const isSignalRConnected = ref(false)

    const buttonText = computed(() => {
      if (!hasPermissions.value) return 'Request Permissions'
      return isCalling.value ? 'Connecting...' : isInitiator.value ? 'Start New Call' : 'Join Call'
    })

    const initMediaStream = async () => {
      try {
        setStatus('Requesting media permissions...')

        const constraints: MediaStreamConstraints = {
          audio: microphoneEnabled.value,
          video: cameraEnabled.value
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
        }

        localStream.value = await navigator.mediaDevices.getUserMedia(constraints)
        console.log('[MEDIA] Local stream initialized:', localStream.value)

        if (localVideo.value) {
          localVideo.value.srcObject = localStream.value
          hasPermissions.value = true
          setStatus('Ready to connect')
        }
      } catch (error: unknown) {
        console.error('Error accessing media devices:', error)
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            setStatus('Camera permission denied.')
          } else if (error.name === 'NotFoundError') {
            setStatus('No camera found.')
          } else if (error.name === 'NotReadableError') {
            setStatus(`Camera is already in use or not available.  ${error.message}`)
          } else {
            setStatus(`Failed to access camera/microphone: ${error.name} - ${error.message}`)
          }
        } else {
          console.error('MediaStream error', error)
        }
        hasPermissions.value = true
      }
    }

    const toggleCamera = async () => {
      cameraEnabled.value = !cameraEnabled.value
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
        localStream.value = null
      }
      await initMediaStream()
      if (peerConnection.value) {
        // Update tracks in peer connection
        const senders = peerConnection.value.getSenders()
        senders.forEach((sender) => {
          if (sender.track && sender.track.kind === 'video') {
            sender.replaceTrack(localStream.value?.getVideoTracks()[0] || null)
          }
        })
      }
    }

    const toggleMicrophone = async () => {
      microphoneEnabled.value = !microphoneEnabled.value
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
        localStream.value = null
      }
      await initMediaStream()
      if (peerConnection.value) {
        // Update tracks in peerConnection
        const senders = peerConnection.value.getSenders()
        senders.forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.replaceTrack(localStream.value?.getAudioTracks()[0] || null)
          }
        })
      }
    }

    const handleRemoteOffer = async (offer: RTCSessionDescriptionInit) => {
      console.log('[SIGNALR] Received Offer:', offer)
      try {
        if (!peerConnection.value) await initPeerConnection(false)

        console.log('[OFFER] Setting remote description')
        await peerConnection.value!.setRemoteDescription(new RTCSessionDescription(offer))

        console.log('[ANSWER] Creating answer')
        const answer = await peerConnection.value!.createAnswer()
        await peerConnection.value!.setLocalDescription(answer)

        sendSignal({
          type: 'answer',
          roomId: currentRoomId.value,
          answer: peerConnection.value!.localDescription!,
        })
      } catch (error: unknown) {
        console.error('[ERROR] Offer handling failed:', error)
        setStatus('Connection error')
      }
    }

    const handleRemoteAnswer = async (answer: RTCSessionDescriptionInit) => {
      console.log('[SIGNALR] Received Answer:', answer)
      try {
        if (!peerConnection.value) throw new Error('PeerConnection not initialized')

        console.log('[ANSWER] Setting remote description')
        await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer))
        setStatus('Call connected!')
      } catch (error: unknown) {
        console.error('[ERROR] Answer handling failed:', error)
        setStatus('Connection error')
      }
    }

    const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
      console.log('[SIGNALR] Received ICE Candidate:', candidate)
      console.log('[ICE] Received candidate:', candidate)
      if (!peerConnection.value) {
        pendingCandidates.value.push(candidate)
        console.log('[ICE] candidate pushed to pendingCandidates')
        return
      }

      try {
        await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('[ICE] Candidate added to peerConnection')
      } catch (error: unknown) {
        console.error('[ERROR] ICE candidate error:', error)
      }
    }

    const startCallHandler = async () => {
      try {
        isCalling.value = true
        currentRoomId.value = roomIdInput.value.trim() || generateRoomId()
        isInitiator.value = !roomIdInput.value.trim()

        console.log('Attempting to join room, isInitiator = ' + isInitiator.value)
        await initPeerConnection(isInitiator.value)
        await connection.value!.invoke('JoinRoom', currentRoomId.value)

        if (isInitiator.value) {
          console.log('Is initiator, creating offer')
          const offer = await peerConnection.value!.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await peerConnection.value!.setLocalDescription(offer)

          sendSignal({
            type: 'offer',
            roomId: currentRoomId.value,
            offer: peerConnection.value!.localDescription!,
          })
          setStatus('Waiting for partner...')
        }
      } catch (error: unknown) {
        console.error('[ERROR] Call start failed:', error)
        endCall()
      }
    }

    onMounted(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !RTCPeerConnection) {
          throw new Error('WebRTC not supported')
        }

        await initMediaStream()

        connection.value = new HubConnectionBuilder()
          .withUrl('http://localhost:5022/callHub')
          .withAutomaticReconnect()
          .build()

        connection.value.on('ReceiveOffer', handleRemoteOffer)
        connection.value.on('ReceiveAnswer', handleRemoteAnswer)
        connection.value.on('ReceiveIceCandidate', handleIceCandidate)

        connection.value.on('NeedsOffer', async (targetClientId: string) => {
          console.log('[SIGNALR] Needs new offer for client ID:', targetClientId)

          try {
            // Do same thing as starting a call, but specific to sending new offer to client.
            const offer = await peerConnection.value!.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await peerConnection.value!.setLocalDescription(offer)

            // Send the offer ONLY to the new client
            console.log(`[SIGNALR] Sending offer to target client: ${targetClientId}`)
            await connection.value!.invoke(
              'SendOfferToClient',
              currentRoomId.value,
              offer,
              targetClientId,
            ) // Server needs to send offer only to target client
            setStatus('Waiting for partner...')
          } catch (error: unknown) {
            console.error('[ERROR] Call start failed:', error)
            endCall()
          }
        })

        connection.value.onreconnected(() => {
          console.log('[SIGNALR] Reconnected')
          if (currentRoomId.value) {
            connection.value!.invoke('JoinRoom', currentRoomId.value)
          }
        })

        connection.value.onclose(() => {
          console.log('[SIGNALR] Connection closed')
          endCall()
        })

        await connection.value.start()
        setStatus('Connected to signaling server')
        isSignalRConnected.value = true // Set to true after successful connection
      } catch (error: unknown) {
        console.error('[ERROR] Initialization failed:', error)
        setStatus('Initialization error')
      }
    })

    onBeforeUnmount(() => endCall())

    const initPeerConnection = async (initiator: boolean) => {
      try {
        if (peerConnection.value) {
          peerConnection.value.close()
          peerConnection.value = null
        }

        peerConnection.value = new RTCPeerConnection(iceConfig)
        console.log('[PEER] New RTCPeerConnection created', iceConfig)
        setStatus('Initializing connection...')

        peerConnection.value.onicecandidateerror = (event) => {
          console.error('ICE Candidate error', event)
        }

        peerConnection.value.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[ICE] Sending candidate:', event.candidate)
            sendSignal({
              type: 'ice-candidate',
              roomId: currentRoomId.value,
              candidate: event.candidate.toJSON(),
            })
          } else {
            console.log('[ICE] ICE gathering complete!')
          }
        }

        if (localStream.value) {
          const tracks = localStream.value.getTracks()
          tracks.forEach((track) => {
            console.log('[PEER] Adding track:', track.kind, track)
            peerConnection.value!.addTrack(track, localStream.value!)
          })
        }

        peerConnection.value.ontrack = (event) => {
          console.log('[PEER] ontrack event:', event)

          if (!remoteVideo.value) {
            console.warn('remoteVideo element is null')
            return
          }

          const stream = event.streams[0] // Directly use the stream from the event

          if (stream) {
            remoteVideo.value.srcObject = stream
            remoteVideo.value
              .play()
              .catch((error) => console.error('Error playing remote video:', error))
            setStatus('Remote stream received')
          } else {
            console.warn('No stream available in the ontrack event')
          }
        }

        peerConnection.value.oniceconnectionstatechange = () => {
          const state = peerConnection.value?.iceConnectionState
          console.log('[ICE] ICE Connection State:', state)
        }

        peerConnection.value.onconnectionstatechange = () => {
          const state = peerConnection.value?.connectionState
          console.log('[PEER] Peer Connection State:', state)
        }

        pendingCandidates.value.forEach((candidate) => {
          try {
            peerConnection.value!.addIceCandidate(new RTCIceCandidate(candidate))
            console.log('[ICE] Pending candidate added to peerConnection')
          } catch (error: unknown) {
            console.error('[ERROR] Error adding pending candidate:', error)
          }
        })
        pendingCandidates.value = []

        isInitiator.value = initiator
      } catch (error: unknown) {
        console.error('[ERROR] PeerConnection error:', error)
        setStatus('Connection error')
      }
    }

    const endCall = () => {
      isCalling.value = false
      currentRoomId.value = ''
      roomIdInput.value = ''
      isInitiator.value = false
      pendingCandidates.value = []

      if (peerConnection.value) {
        peerConnection.value.close()
        peerConnection.value = null
      }

      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop())
        localStream.value = null
      }

      setStatus('Call ended')
    }

    const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase()

    const setStatus = (message: string) => {
      statusMessage.value = message
      console.log('[STATUS]', message)
    }

    const sendSignal = (message: SignalMessage) => {
      if (connection.value?.state === 'Connected') {
        switch (message.type) {
          case 'offer':
            connection.value.invoke('SendOffer', message.roomId, message.offer)
            break
          case 'answer':
            connection.value.invoke('SendAnswer', message.roomId, message.answer)
            break
          case 'ice-candidate':
            connection.value.invoke('SendIceCandidate', message.roomId, message.candidate)
            break
        }
      }
    }

    return {
      localVideo,
      remoteVideo,
      currentRoomId,
      isCalling,
      hasPermissions,
      statusMessage,
      roomIdInput,
      startCallHandler,
      endCall,
      buttonText,
      isInitiator,
      cameraEnabled,
      microphoneEnabled,
      toggleCamera,
      toggleMicrophone,
      localStream,
      isSignalRConnected,
    }
  },
})
</script>

<style scoped>
.video-call {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.videos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.video-container {
  position: relative;
  background: #1a1a1a;
  border-radius: 10px;
  overflow: hidden;
  min-height: 300px;
}

video {
  width: 100%;
  height: 100%;
  background: #000;
  transform: scaleX(-1);
  object-fit: cover;
}

.video-container h2 {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 1;
  margin: 0;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 5px;
}

.controls {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

button {
  margin: 0 5px;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

button:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

input[type='text'] {
  padding: 10px 15px;
  margin-right: 10px;
  width: 200px;
  border: 2px solid #ddd;
  border-radius: 5px;
  transition: border-color 0.3s ease;
  font-size: 14px;
}

input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.status {
  color: #666;
  margin-top: 15px;
  font-size: 0.9em;
  font-weight: 500;
}
</style>
