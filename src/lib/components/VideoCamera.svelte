<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ frame: VideoFrame }>()

  let videoStream: MediaStream | null = null

  onMount(async () => {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      const videoTrack = videoStream.getVideoTracks()[0]

      const processor = new MediaStreamTrackProcessor({ track: videoTrack })
      const reader = processor.readable.getReader()

      processFrame(reader)
    } catch (error) {
      console.error('Error setting up video camera:', error)
    }
  })

  async function processFrame(reader: ReadableStreamDefaultReader<VideoFrame>) {
    const { value: videoFrame, done } = await reader.read()
    if (done || !videoFrame) return

    dispatch('frame', videoFrame.clone())

    videoFrame.close()
    requestAnimationFrame(() => processFrame(reader))
  }

  onDestroy(() => {
    videoStream?.getTracks().forEach((track) => track.stop())
  })
</script>
