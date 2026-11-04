<template>
  <footer class="footer">
    <div class="row">
      <p class="brand">Bobine <span class="muted">· Films et séances à Québec</span></p>
      <nav aria-label="Navigation du pied de page">
        <RouterLink to="/">Films</RouterLink>
        <RouterLink to="/ce-soir">Ce soir</RouterLink>
        <RouterLink to="/cinemas">Cinémas</RouterLink>
      </nav>
    </div>
    <p class="credits">
      Fiches des films :
      <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>.
      Ce produit utilise l'API TMDB, sans être approuvé ni certifié par TMDB.
      Horaires : Google, via SerpApi.
    </p>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: 64px;
  /* same left edge as the page column (max 1200, 24px padding) */
  padding: 24px max(24px, calc((100% - 1152px) / 2)) 32px;
  border-top: 1px solid var(--border);
  color: var(--faint);
  font-size: var(--fs-small);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 32px;
}

.brand {
  margin: 0;
  color: var(--text);
  font-size: var(--fs-body);
  font-weight: 600;
}

.muted {
  color: var(--faint);
  font-weight: 400;
}

nav {
  display: flex;
  gap: 24px;
}

a {
  color: var(--muted);
  text-decoration: none;
  transition: color 0.15s;
}

a:hover {
  color: var(--text);
}

a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 4px;
  border-radius: 4px;
}

.credits {
  max-width: 640px;
  margin: 16px 0 0;
  line-height: 1.5;
}
</style>
