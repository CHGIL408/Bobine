<script setup>
import Navbar from './components/Navbar.vue';
import SiteFooter from './components/SiteFooter.vue';

</script>

<template>
  <Navbar />
  <div class="content">
    <RouterView />
  </div>
  <SiteFooter />
</template>

<style scoped>
/* pousse le pied de page en bas de l'écran quand la page est courte */
.content {
  flex: 1;
}
</style>
