<script lang="ts">
  import type { Euler, Quaternion } from '$lib/types'
  import { localRotationDelta, quaternionToEuler } from '$lib/utils/angles'
  import { saveRecording } from '$lib/utils/recording'
  import { onDestroy, onMount } from 'svelte'
  import OrientationSensor from './OrientationSensor.svelte'
  import RecordingControls from './RecordingControls.svelte'
  import VideoCamera from './VideoCamera.svelte'
  import DeviceOrientation from './DeviceOrientation.svelte'

  let canvasElement: HTMLCanvasElement
  let isRecording = false
  let recordedChunks: Blob[] = []
  let orientationRecords: Euler[] = []

  let currentQuaternion: Quaternion | undefined
  let previousQuaternion: Quaternion | undefined
  let mediaRecorder: MediaRecorder | undefined
  let videoTrackGenerator: MediaStreamTrackGenerator<VideoFrame> | undefined
  let writable: WritableStreamDefaultWriter<VideoFrame> | undefined

  let canvasCtx: CanvasRenderingContext2D | null = null

  $: isLoading = !canvasElement

  onMount(() => {
    canvasCtx = canvasElement.getContext('2d')
    if (!canvasCtx) {
      console.error('Failed to get canvas context.')
      return
    }

    videoTrackGenerator = new MediaStreamTrackGenerator({ kind: 'video' })
    writable = videoTrackGenerator.writable.getWriter()
    const mediaStream = new MediaStream([videoTrackGenerator])

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/mp4; codecs="avc1.424028"',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      await saveRecording(recordedChunks, orientationRecords)
      recordedChunks = []
      orientationRecords = []
    }
  })

  onDestroy(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    writable?.close()
  })

  async function toggleRecording() {
    if (!mediaRecorder) return
    isRecording = !isRecording
    isRecording ? mediaRecorder.start() : mediaRecorder.stop()
  }

  async function handleFrame({ detail: frame }: CustomEvent<VideoFrame>) {
    canvasElement.width = frame.displayWidth
    canvasElement.height = frame.displayHeight
    canvasCtx?.drawImage(frame, 0, 0)

    if (previousQuaternion && currentQuaternion) {
      const rotationDelta = quaternionToEuler(
        localRotationDelta(currentQuaternion, previousQuaternion),
      )

      if (rotationDelta.pitch || rotationDelta.yaw || rotationDelta.roll) {
        drawOrientationDifference(rotationDelta)

        if (isRecording) {
          orientationRecords.push(rotationDelta)
          await writable?.write(frame)
          frame.close()
        }
      }
    }

    if (currentQuaternion) previousQuaternion = currentQuaternion
    frame.close()
  }

  function handleQuaternion({ detail: quaternion }: CustomEvent<Quaternion>) {
    currentQuaternion = quaternion
  }

  function drawOrientationDifference(rotationDelta: Euler) {
    if (!canvasCtx) return

    const scale = Math.min(canvasElement.width, canvasElement.height) / 20
    const centerX = canvasElement.width / 2
    const centerY = canvasElement.height / 2

    const endX = centerX - rotationDelta.yaw * scale
    const endY = centerY + rotationDelta.pitch * scale

    canvasCtx.beginPath()
    canvasCtx.moveTo(centerX, centerY)
    canvasCtx.lineTo(endX, endY)
    canvasCtx.strokeStyle = 'red'
    canvasCtx.lineWidth = 3
    canvasCtx.stroke()

    canvasCtx.beginPath()
    canvasCtx.arc(endX, endY, 5, 0, 2 * Math.PI)
    canvasCtx.fillStyle = 'red'
    canvasCtx.fill()
  }
</script>

<div class="flex h-full w-full items-center justify-center bg-black">
  <canvas bind:this={canvasElement} class="max-h-full max-w-full portrait:w-full landscape:h-full">
    <VideoCamera on:frame={handleFrame} />
  </canvas>
  <OrientationSensor on:quaternion={handleQuaternion} />
  <RecordingControls {isLoading} {isRecording} on:toggleRecording={toggleRecording} />
</div>
