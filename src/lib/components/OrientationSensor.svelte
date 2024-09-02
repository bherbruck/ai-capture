<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { OrientationData } from '$lib/types'

  export let orientationData: OrientationData | null = null

  let sensor: RelativeOrientationSensor

  let previousOrientation: [number, number, number, number] | undefined

  onMount(() => {
    if ('RelativeOrientationSensor' in window) {
      sensor = new AbsoluteOrientationSensor({ frequency: 60, referenceFrame: 'screen' })
      sensor.addEventListener('reading', () => {
        if (!sensor.quaternion || !sensor.timestamp) return
        orientationData = {
          quaternion: {
            x: sensor.quaternion[0],
            y: sensor.quaternion[1],
            z: sensor.quaternion[2],
            w: sensor.quaternion[3],
          },
          timestamp: sensor.timestamp,
        }
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
