<template>
  <div class="container py-4">
    <h1 class="text-white text-center mb-4">Cinémas</h1>
    <div class="row g-3">
      <div class="col-md-6" v-for="cinema in cinemas" :key="cinema._id">
        <div class="card bg-dark border-secondary text-white h-100">
          <div class="card-body">
            <h5 class="card-title">🏢 {{ cinema.name }}</h5>
            <p class="card-text text-secondary mb-1">📍 {{ cinema.address }}</p>
            <p class="card-text text-secondary">🏙️ {{ cinema.city }}</p>
            <div class="d-flex gap-2 mt-3">
              <a
                v-if="cinema.website"
                :href="cinema.website"
                target="_blank"
                class="btn btn-outline-light btn-sm"
              >
                Site web
              </a>
              <span v-if="cinema.phone" class="btn btn-outline-secondary btn-sm">
                📞 {{ cinema.phone }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getCinemas } from '@/services/api'
import { ref, onMounted } from 'vue'

const cinemas = ref([])

onMounted(async () => {
  cinemas.value = await getCinemas()
})
</script>
