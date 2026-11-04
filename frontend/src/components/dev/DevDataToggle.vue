<!-- Outil de développement seulement : bascule entre les vraies données et les données extrêmes -->
<template>
  <nav class="dev-toggle" aria-label="Données de test (développement)">
    <a
      v-for="o in OPTIONS"
      :key="o.value"
      :href="`?data=${o.value}`"
      :aria-current="o.value === current ? 'true' : undefined"
      @click.prevent="go(o.value)"
    >
      {{ o.label }}
    </a>
  </nav>
</template>

<script setup>
import { devData } from '@/services/api'

const OPTIONS = [
  { value: '', label: 'Demo' },
  { value: 'worst', label: 'Worst case' },
  { value: 'empty', label: 'Empty' },
  { value: 'one', label: 'One' },
  { value: 'huge', label: '300 rows' },
]
// les données réellement servies : l'API lit ?data= une seule fois, au démarrage
const current = devData ?? ''

// rechargement complet de la page où l'on est maintenant (pas celle du premier chargement)
const go = (value) => {
  const url = new URL(location.href)
  if (value) url.searchParams.set('data', value)
  else url.searchParams.delete('data')
  location.assign(url.pathname + url.search)
}
</script>

<style scoped>
.dev-toggle {
  position: fixed;
  bottom: 16px;
  left: 50%;
  z-index: 1000;
  display: flex;
  gap: 2px;
  padding: 3px;
  transform: translateX(-50%);
  background: #d4d4d4;
  border-radius: 999px;
  font: 12px/1 system-ui, sans-serif;
}

.dev-toggle a {
  padding: 6px 10px;
  border-radius: 999px;
  color: #333;
  text-decoration: none;
  white-space: nowrap;
}

.dev-toggle a[aria-current] {
  background: #fff;
  color: #000;
}
</style>
