<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">
      <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <g class="holes">
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="5.5" r="2.6" />
          <circle cx="18.2" cy="10" r="2.6" />
          <circle cx="15.8" cy="17.3" r="2.6" />
          <circle cx="8.2" cy="17.3" r="2.6" />
          <circle cx="5.8" cy="10" r="2.6" />
        </g>
      </svg>
      Bobine
    </RouterLink>
    <nav aria-label="Navigation principale">
      <RouterLink to="/">Films</RouterLink>
      <RouterLink to="/ce-soir">Ce soir</RouterLink>
      <RouterLink to="/cinemas">Cinémas</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 56px;
  /* same left edge as the page column (max 1200, 24px padding) */
  padding: 0 max(24px, calc((100% - 1152px) / 2));
  background: var(--ground);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-size: var(--fs-section);
  font-weight: 600;
  text-decoration: none;
}

.mark {
  width: 22px;
  height: 22px;
  color: var(--accent);
}

.holes {
  fill: var(--ground);
}

nav {
  display: flex;
  gap: 24px;
}

nav a {
  color: var(--idle);
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}

nav a:hover,
nav a.router-link-exact-active {
  color: var(--text);
}

a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 4px;
  border-radius: 4px;
}
</style>
