<script setup>
import Navbar from './components/Navbar.vue';
import SiteFooter from './components/SiteFooter.vue';

</script>

<template>
  <Navbar />
  <div class="content">
    <!-- l'accueil reste en mémoire : filtres, genre et recherche sont gardés au retour d'une fiche -->
    <RouterView v-slot="{ Component }">
      <KeepAlive include="HomeView">
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
  <SiteFooter />
</template>

<style scoped>
/* pousse le pied de page en bas de l'écran quand la page est courte */
.content {
  flex: 1;
}
</style>
