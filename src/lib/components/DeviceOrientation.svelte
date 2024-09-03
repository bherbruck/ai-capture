<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import { eulerToQuaternion } from '$lib/utils/angles'
  import type { Quaternion } from '$lib/types'

  const dispatch = createEventDispatcher<{ quaternion: Quaternion }>()

  function handleDeviceOrientation(event: DeviceOrientationEvent) {
    const { alpha, beta, gamma } = event
    if (alpha === null || beta === null || gamma === null) return
    const quaternion = eulerToQuaternion({ yaw: gamma, pitch: beta, roll: alpha })
    dispatch('quaternion', quaternion)
  }

  onMount(() => {
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation)
    } else {
      alert('DeviceOrientationEvent is not supported in this browser.')
    }
  })

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
    }
  })
</script>
