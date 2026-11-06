// Petites aides partagées par les vues qui affichent séances et cinémas

// Référence Mongoose : id seul, ou objet peuplé -> id
export const idOf = (ref) => ref?._id ?? ref

// "Cinéma Cineplex Odeon Ste-Foy" -> "Odeon Ste-Foy" (les autres noms restent entiers)
export const shortCinemaName = (name = '') => name.replace(/^Cinéma Cineplex /, '')

// Site web du cinéma, seulement en http(s) : un lien javascript: déjà en base s'exécuterait au clic
export const websiteOf = (cinema) => (/^https?:\/\//i.test(cinema?.website ?? '') ? cinema.website : null)
