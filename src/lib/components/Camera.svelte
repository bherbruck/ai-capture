<script lang="ts">
  import type { Euler, OrientationData } from '$lib/types'
  import { localRotationDelta, quaternionToEuler } from '$lib/utils/angles'
  import { saveRecording } from '$lib/utils/recording'
  import { onDestroy, onMount } from 'svelte'
  import OrientationSensor from './OrientationSensor.svelte'
  import RecordingControls from './RecordingControls.svelte'
  import VideoCamera from './VideoCamera.svelte'

  let canvasElement: HTMLCanvasElement
  let isRecording = false
  let recordedChunks: Blob[] = []
  let orientationRecords: Euler[] = []
  let frameCount = 0

  let currentOrientation: OrientationData | null = null
  let previousOrientation: OrientationData | null = null
  let mediaRecorder: MediaRecorder | undefined
  let videoTrackGenerator: MediaStreamTrackGenerator<VideoFrame> | undefined
  let writable: WritableStreamDefaultWriter<VideoFrame> | undefined

  $: isLoading = !canvasElement || !currentOrientation

  onMount(() => {
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
      frameCount = 0
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
    if (!currentOrientation || !currentOrientation.quaternion) return

    if (previousOrientation && previousOrientation.timestamp !== currentOrientation.timestamp) {
      // // if all the quaternions are the same, skip it (maybe...)
      // if (
      //   currentOrientation.quaternion.x === previousOrientation.quaternion.x &&
      //   currentOrientation.quaternion.y === previousOrientation.quaternion.y &&
      //   currentOrientation.quaternion.z === previousOrientation.quaternion.z &&
      //   currentOrientation.quaternion.w === previousOrientation.quaternion.w
      // ) {
      //   return
      // }
      const rotationDeltaQuaternion = localRotationDelta(
        currentOrientation.quaternion,
        previousOrientation.quaternion,
      )
      const rotationDelta = quaternionToEuler(rotationDeltaQuaternion)
      drawOrientationDifference(rotationDelta)

      if (isRecording) {
        orientationRecords.push(rotationDelta)
        await writable?.write(frame)
      }
    }

    previousOrientation = currentOrientation
  }

  function drawOrientationDifference(rotationDelta: Euler) {
    if (!canvasElement) return
    const ctx = canvasElement.getContext('2d')
    if (!ctx) return

    const scale = Math.min(canvasElement.width, canvasElement.height) / 20
    const centerX = canvasElement.width / 2
    const centerY = canvasElement.height / 2

    const endX = centerX - rotationDelta.yaw * scale
    const endY = centerY + rotationDelta.pitch * scale

    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(endX, endY, 5, 0, 2 * Math.PI)
    ctx.fillStyle = 'red'
    ctx.fill()
  }
</script>

<div class="flex h-full w-full items-center justify-center bg-black">
  <canvas bind:this={canvasElement} class="max-h-full max-w-full portrait:w-full landscape:h-full">
    <VideoCamera {canvasElement} on:frame={handleFrame} />
  </canvas>
  <OrientationSensor bind:orientationData={currentOrientation} />
  <RecordingControls {isLoading} {isRecording} on:toggleRecording={toggleRecording} />
</div>
