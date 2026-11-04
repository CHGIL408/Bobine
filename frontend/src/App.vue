<script setup>
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';

</script>

<template>
  <Navbar />
  <div class="content">
    <RouterView />
  </div>
  <Footer />
</template>

<style scoped>
/* pousse le pied de page en bas de l'écran quand la page est courte */
.content {
  flex: 1;
}
</style>
