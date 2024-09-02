<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'

  export let canvasElement: HTMLCanvasElement

  const dispatch = createEventDispatcher()

  let videoStream: MediaStream | null = null

  onMount(async () => {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      const videoTrack = videoStream.getVideoTracks()[0]

      const canvasCtx = canvasElement.getContext('2d')
      if (!canvasCtx) {
        console.error('Failed to get canvas context.')
        return
      }

      const processor = new MediaStreamTrackProcessor({ track: videoTrack })
      const reader = processor.readable.getReader()

      processFrame(reader, canvasElement, canvasCtx)
    } catch (error) {
      console.error('Error setting up video camera:', error)
    }
  })

  async function processFrame(
    reader: ReadableStreamDefaultReader<VideoFrame>,
    canvasElement: HTMLCanvasElement,
    canvasCtx: CanvasRenderingContext2D,
  ) {
    const { value: videoFrame, done } = await reader.read()
    if (done || !videoFrame) return

    canvasElement.width = videoFrame.displayWidth
    canvasElement.height = videoFrame.displayHeight
    canvasCtx.drawImage(videoFrame, 0, 0)
    dispatch('frame', videoFrame)

    videoFrame.close()
    requestAnimationFrame(() => processFrame(reader, canvasElement, canvasCtx))
  }

  onDestroy(() => {
    videoStream?.getTracks().forEach((track) => track.stop())
  })
</script>
