<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import JSZip from 'jszip'
  import saveAs from 'file-saver'
  import {
    calculateLocalRotationDelta as localRotationDelta,
    quaternionToEuler,
    type Euler,
    type Quaternion,
  } from '$lib/utils/angles'

  let canvasElement: HTMLCanvasElement
  let canvasCtx: CanvasRenderingContext2D
  let cameraStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | undefined = undefined
  let recordedChunks: Blob[] = []
  let csvContent = 'frame,timestamp,yaw,pitch,roll\n'

  let currentOrientation: Quaternion
  let previousOrientation: Quaternion

  let rotationDelta: Euler

  let isRecording = false
  let isCapturing = false

  let orientationSensor: RelativeOrientationSensor | null = null

  let frameCount = 0

  let currentSensorTimestamp: number = 0
  let previousSensorTimestamp: number = 0

  function handleOrientation(event: Event) {
    const sensor = event.target as RelativeOrientationSensor

    if (!sensor?.quaternion) return

    currentOrientation = {
      x: sensor.quaternion[0],
      y: sensor.quaternion[1],
      z: sensor.quaternion[2],
      w: sensor.quaternion[3],
    }

    currentSensorTimestamp = sensor.timestamp ?? 0
  }

  function startVideoFeed() {
    if (!canvasCtx || !cameraStream) return

    const videoTrack = cameraStream.getVideoTracks()[0]
    const processor = new MediaStreamTrackProcessor({ track: videoTrack })
    const reader = processor.readable.getReader()

    // Create a MediaStream and a MediaStreamTrackGenerator
    const mediaStream = new MediaStream()
    const videoTrackGenerator = new MediaStreamTrackGenerator({
      kind: 'video',
    })
    const writable = videoTrackGenerator.writable.getWriter()
    mediaStream.addTrack(videoTrackGenerator)

    // Initialize the MediaRecorder with the custom MediaStream
    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/mp4; codecs="avc1.424028"',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

    // Process frames in a loop
    isCapturing = true
    const processFrame = async () => {
      const { value: videoFrame, done } = await reader.read()
      if (done || !videoFrame) return

      canvasElement.width = videoFrame.displayWidth
      canvasElement.height = videoFrame.displayHeight
      canvasCtx.drawImage(videoFrame, 0, 0)

      // Only update rotation delta when a new frame is processed
      if (
        currentOrientation &&
        previousOrientation &&
        previousSensorTimestamp !== currentSensorTimestamp
      ) {
        const rotationDeltaQuaternion = localRotationDelta(currentOrientation, previousOrientation)
        rotationDelta = quaternionToEuler(rotationDeltaQuaternion)
        previousOrientation = { ...currentOrientation }
        previousSensorTimestamp = currentSensorTimestamp
      } else {
        previousOrientation = { ...currentOrientation }
        if (isCapturing) requestAnimationFrame(processFrame)
        return
      }

      const delta = drawOrientationDifference()

      const roundedYaw = delta?.yaw.toFixed(3)
      const roundedPitch = delta?.pitch.toFixed(3)
      const roundedRoll = delta?.roll.toFixed(3)

      if (isRecording) {
        csvContent += `${frameCount},${roundedYaw},${roundedPitch},${roundedRoll}\n`
        frameCount++

        await writable.write(videoFrame)
      }

      videoFrame.close()

      if (isCapturing) requestAnimationFrame(processFrame)
    }

    processFrame()
  }

  function drawOrientationDifference() {
    if (!canvasCtx || rotationDelta == undefined) return

    const centerX = canvasElement.width / 2
    const centerY = canvasElement.height / 2

    // Scale factor to show the movement trail
    const scale = 10

    // Calculate end point of the line (relative to local rotation)
    const endX = centerX - rotationDelta.yaw * scale
    const endY = centerY + rotationDelta.pitch * scale

    // Draw the line
    canvasCtx.beginPath()
    canvasCtx.moveTo(centerX, centerY)
    canvasCtx.lineTo(endX, endY)
    canvasCtx.strokeStyle = 'red'
    canvasCtx.lineWidth = 3
    canvasCtx.stroke()

    // Draw a dot at the end of the line
    canvasCtx.beginPath()
    canvasCtx.arc(endX, endY, 5, 0, 2 * Math.PI)
    canvasCtx.fillStyle = 'red'
    canvasCtx.fill()

    return rotationDelta
  }

  function setupOrientationSensor() {
    if ('RelativeOrientationSensor' in window) {
      orientationSensor = new RelativeOrientationSensor({
        frequency: 60,
        referenceFrame: 'screen',
      })
      orientationSensor.addEventListener('reading', handleOrientation)
      orientationSensor.start()
    } else {
      console.error('RelativeOrientationSensor is not supported in this browser.')
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }

    isRecording = !isRecording
  }

  function generateTimestamp(): string {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0') // Months are 0-based in JS
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}_${hours}${minutes}${seconds}`
  }

  function startRecording() {
    csvContent = 'frame,timestamp,yaw,pitch,roll\n'
    frameCount = 0
    recordedChunks = []
    mediaRecorder?.start()
  }

  function stopRecording() {
    mediaRecorder?.stop()

    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        const timestamp = generateTimestamp()
        const webmBlob = new Blob(recordedChunks, { type: 'video/webm' })
        const zip = new JSZip()

        zip.file(`${timestamp}.mp4`, webmBlob)
        zip.file(`${timestamp}.csv`, csvContent)

        zip.generateAsync({ type: 'blob' }).then((blob) => {
          saveAs(blob, `ai_${timestamp}.zip`)
        })
      }
    }
  }

  function stopVideoFeed() {
    isCapturing = false

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }
    if (orientationSensor) {
      orientationSensor.stop()
    }
  }

  onMount(() => {
    if (typeof window === 'undefined') return

    if (!canvasElement) return

    canvasCtx = canvasElement.getContext('2d') as CanvasRenderingContext2D
    if (!canvasCtx) {
      console.error('Failed to get canvas context.')
      return
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        cameraStream = mediaStream
        setupOrientationSensor()
        startVideoFeed() // Always start video feed immediately
      })
      .catch((error) => {
        console.error('Error accessing the camera:', error)
      })
  })

  onDestroy(() => {
    if (typeof window === 'undefined') return

    stopVideoFeed() // Stop capturing when the component is unmounted
  })
</script>

<div class="flex h-full w-full items-center justify-center bg-black">
  <canvas
    bind:this={canvasElement}
    class="max-h-full max-w-full portrait:w-full landscape:h-full"
  />

  <button
    on:click={toggleRecording}
    class="fixed bottom-4 h-16 w-16 rounded-full border bg-white portrait:bottom-4 landscape:bottom-auto landscape:right-4"
    aria-label="Capture"
    class:recording={isRecording}
  >
  </button>
</div>

<style lang="postcss">
  .recording {
    @apply bg-red-500;
  }
</style>
