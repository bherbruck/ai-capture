<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte'
  import type { Quaternion } from '$lib/types'

  let sensor: RelativeOrientationSensor

  let previousTimestamp: number | undefined

  const dispatch = createEventDispatcher<{ quaternion: Quaternion }>()

  onMount(() => {
    if ('RelativeOrientationSensor' in window) {
      sensor = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: 'screen' })
      sensor.addEventListener('reading', () => {
        if (!sensor.quaternion || !sensor.timestamp) return
        if (previousTimestamp && sensor.timestamp <= previousTimestamp) return
        const timestamp = sensor.timestamp
        const [x, y, z, w] = sensor.quaternion
        dispatch('quaternion', { x, y, z, w })
        previousTimestamp = timestamp
      })
      sensor.start()
    } else {
      alert('RelativeOrientationSensor is not supported in this browser.')
    }
  })

  onDestroy(() => {
    sensor?.stop()
  })
</script>
