<template>
  <div class="input-group mb-4" style="max-width: 500px; margin: 0 auto 2rem auto">
    <span class="input-group-text bg-dark border-secondary text-white">🔍</span>
    <input
      type="text"
      class="form-control bg-dark text-white border-secondary"
      placeholder="Rechercher un film..."
      @input="onInput"
      v-model="entree"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
const entree = ref('')

const emit = defineEmits(['search'])

const onInput = () => {
  emit('search', entree.value)
}
</script>
