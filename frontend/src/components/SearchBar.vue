<template>
  <div class="search">
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <input
      v-model="entree"
      type="search"
      aria-label="Rechercher un film"
      placeholder="Rechercher un film"
      @input="emit('search', entree)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const entree = ref('')
const emit = defineEmits(['search'])
</script>

<style scoped>
.search {
  position: relative;
  width: 300px;
  max-width: 100%;
}

svg {
  position: absolute;
  left: 14px;
  top: 50%;
  width: 14px;
  height: 14px;
  transform: translateY(-50%);
  color: var(--faint);
}

input {
  width: 100%;
  height: var(--control-height);
  padding: 0 14px 0 38px;
  background: var(--surface);
  border: 1px solid var(--control);
  border-radius: 999px;
  color: var(--text);
  font: inherit;
}

input::placeholder {
  color: var(--faint);
}

input:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
</style>
