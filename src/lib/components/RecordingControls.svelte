<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let isLoading: boolean
  export let isRecording: boolean

  const dispatch = createEventDispatcher()

  function toggleRecording() {
    dispatch('toggleRecording')
  }
</script>

<button
  on:click={toggleRecording}
  class="fixed bottom-4 h-16 w-16 rounded-full border bg-white portrait:bottom-4 landscape:bottom-auto landscape:right-4"
  aria-label="Capture"
  class:disabled={isLoading}
  class:recording={isRecording}
  disabled={isLoading}
>
</button>

<style lang="postcss">
  .recording {
    @apply bg-red-500;
  }

  .disabled {
    @apply bg-gray-500 opacity-25;
  }
</style>
