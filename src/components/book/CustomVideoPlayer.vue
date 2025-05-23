<template>
    <div ref="videoContainer" class="video-container">
      <video
        ref="videoElement"
        class="video-js vjs-big-play-centered" style="width: 100%;"
        :controls="controls"
        :crossorigin="crossorigin"
        :playsinline="playsinline"
        :width="width"
        :height="height"
        :muted="muted"
      >
        <source v-if="src" :src="src" :type="sourceType">
        <slot></slot>
      </video>
    </div>
</template>
  
<script setup>
  import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
  import videojs from 'video.js';
  import 'video.js/dist/video-js.css';
  
  const props = defineProps({
    src: {
      type: String,
      default: ''
    },
    sourceType: {
      type: String,
      default: 'video/mp4'
    },
    poster: {
      type: String,
      default: ''
    },
    crossorigin: {
      type: String,
      default: 'anonymous'
    },
    playsinline: {
      type: Boolean,
      default: true
    },
    controls: {
      type: Boolean,
      default: true
    },
    muted: {
      type: Boolean,
      default: false
    },
    volume: {
      type: Number,
      default: 0.6
    },
    width: {
      type: [Number, String],
      default: '100%'
    },
    height: {
      type: [Number, String],
      default: 320
    },
    playbackRates: {
      type: Array,
      default: () => [0.7, 1.0, 1.5, 2.0]
    }
  });
  
  const emit = defineEmits([
    'mounted',
    'ready',
    'play',
    'pause',
    'ended',
    'loadeddata',
    'waiting',
    'playing',
    'canplay',
    'canplaythrough',
    'timeupdate'
  ]);
  
  const videoContainer = ref(null);
  const videoElement = ref(null);
  let player = null;
  
  const initializePlayer = () => {
    if (!videoElement.value) return;
    
    // Destroy existing player if any
    if (player) {
      player.dispose();
    }
  
    // Initialize Video.js player
    player = videojs(videoElement.value, {
      autoplay: false,
      controls: props.controls,
      poster: props.poster,
      fluid: false,
      playbackRates: props.playbackRates
    });
  
    // Set initial volume
    player.volume(props.volume);
  
    // Register event listeners
    player.on('ready', () => emit('ready', player));
    player.on('play', () => emit('play', player));
    player.on('pause', () => emit('pause', player));
    player.on('ended', () => emit('ended', player));
    player.on('loadeddata', () => emit('loadeddata', player));
    player.on('waiting', () => emit('waiting', player));
    player.on('playing', () => emit('playing', player));
    player.on('canplay', () => emit('canplay', player));
    player.on('canplaythrough', () => emit('canplaythrough', player));
    player.on('timeupdate', () => emit('timeupdate', player.currentTime()));
  
    // Emit the mounted event with the player instance
    emit('mounted', { player });
  };
  
  // Watch for source changes to reinitialize the player
  watch(() => props.src, () => {
    if (player) {
      // If the player exists, update the source
      player.src({ src: props.src, type: props.sourceType });
      player.load();
    } else {
      // If no player exists yet, initialize one
      initializePlayer();
    }
  });
  
  onMounted(() => {
    initializePlayer();
  });
  
  onBeforeUnmount(() => {
    if (player) {
      player.dispose();
      player = null;
    }
  });
  
  // Expose the player instance to the parent component
  defineExpose({
    getPlayer: () => player
  });
</script>
  
<style scoped>
.video-container {
width: 100%;
}
</style>