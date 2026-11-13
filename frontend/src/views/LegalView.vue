<template>
  <main class="page">
    <h1>Conditions et confidentialité</h1>
    <p class="updated">Dernière mise à jour : 12 novembre 2026</p>

    <section id="conditions" aria-labelledby="conditions-title">
      <h2 id="conditions-title">Conditions d'utilisation</h2>
      <p>
        Bobine est un service gratuit et informatif, sans compte, qui rassemble les films à
        l'affiche et les séances des cinémas de Québec.
      </p>
      <ul>
        <li>
          Les horaires viennent de Google, via SerpApi, et sont mis à jour une fois par jour. Ils
          peuvent changer : vérifiez la séance sur le site du cinéma avant de vous déplacer.
        </li>
        <li>
          La réservation et l'achat de billets se font sur le site du cinéma. Bobine n'est pas
          affilié aux cinémas présentés, ni à Cineplex.
        </li>
        <li>
          Les fiches, affiches et images viennent de TMDB. Les titres, affiches et marques
          appartiennent à leurs détenteurs. Les bandes-annonces sont lues sur YouTube et soumises à
          ses conditions.
        </li>
        <li>
          Le service est fourni tel quel, sans garantie d'exactitude ni de disponibilité. Bobine ne
          peut être tenu responsable d'une séance modifiée, annulée ou mal indiquée.
        </li>
        <li>Ces conditions peuvent changer ; la date en haut de la page l'indique.</li>
      </ul>
    </section>

    <section id="confidentialite" aria-labelledby="confidentialite-title">
      <h2 id="confidentialite-title">Politique de confidentialité</h2>
      <p>
        Bobine ne demande aucun compte et ne collecte aucun renseignement personnel. Pas de
        cookies, pas de publicité, pas de mesure d'audience.
      </p>
      <ul>
        <li>
          <strong>Favoris</strong> : gardés seulement dans votre navigateur (stockage local), jamais
          envoyés. Effacer les données du site dans le navigateur les supprime.
        </li>
        <li>
          <strong>Position</strong> : demandée seulement quand vous triez les cinémas par distance.
          Le calcul se fait dans le navigateur ; la position n'est jamais envoyée ni conservée.
        </li>
        <li>
          <strong>Services tiers</strong> : en affichant les pages, votre navigateur contacte Google
          Fonts (polices), TMDB (images), Vercel (site) et Render (API), qui reçoivent votre
          adresse IP dans leurs journaux techniques. YouTube n'est contacté que si vous lancez une
          bande-annonce, par sa version sans cookie de suivi (youtube-nocookie.com).
        </li>
      </ul>
      <p>
        Une question ?
        <a href="https://github.com/CHGIL408/Bobine/issues" target="_blank" rel="noopener"
          >Écrivez-nous sur GitHub</a
        >.
      </p>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 24px 64px;
  line-height: 1.6;
}

h1 {
  margin: 0;
  font-size: var(--fs-title);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.updated {
  margin-top: 4px;
  color: var(--muted);
}

section {
  margin-top: 40px;
  scroll-margin-top: 24px;
}

h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

p,
li {
  color: var(--muted);
}

ul {
  margin: 12px 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

strong {
  color: var(--text);
  font-weight: 500;
}

a {
  color: var(--text);
}

@media (max-width: 640px) {
  .page {
    padding: 20px 16px 48px;
  }

  h1 {
    font-size: 22px;
  }
}
</style>
