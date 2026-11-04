<script setup>
import SiteHeader from './components/SiteHeader.vue';
import SiteFooter from './components/SiteFooter.vue';
import { defineAsyncComponent } from 'vue';

// sélecteur de données de test, seulement avec `npm run dev`
const DevDataToggle = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./components/dev/DevDataToggle.vue'))
  : null;

</script>

<template>
  <SiteHeader />
  <div class="content">
    <!-- l'accueil reste en mémoire : filtres, genre et recherche sont gardés au retour d'une fiche -->
    <RouterView v-slot="{ Component }">
      <KeepAlive include="HomeView">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
  <SiteFooter />
  <DevDataToggle v-if="DevDataToggle" />
</template>

<style scoped>
/* pousse le pied de page en bas de l'écran quand la page est courte */
.content {
  flex: 1;
}
</style>
