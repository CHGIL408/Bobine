const crypto = require('crypto');

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Lecture publique ; toute écriture exige le header x-api-key égal à ADMIN_API_KEY.
// Sans ADMIN_API_KEY configurée, les écritures sont refusées (jamais ouvertes par erreur).
const requireApiKey = (req, res, next) => {
  if (READ_METHODS.has(req.method)) return next();

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'Écriture désactivée : ADMIN_API_KEY non configurée' });
  }

  const given = req.get('x-api-key') ?? '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Clé API manquante ou invalide' });
  }
  next();
};

module.exports = requireApiKey;
