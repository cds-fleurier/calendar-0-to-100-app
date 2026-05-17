# Changelog

## [1.2.2] - 2026-05-17
- Correction bug JS bloquant (double declaration `now`) qui empechait le submit et l'affichage de version.
- Reduction de la taille du logo dans le hero.

## [1.2.1] - 2026-05-17
- Refonte UI inspiree du `0to100-session-player-app` (fond sombre texture, cartes creme, accent orange).
- Hero avec logo officiel 0 to 100.
- Harmonisation visuelle des boutons, accordions mensuels et pied de page.

## [1.2.0] - 2026-05-17
- Ajout barre de progression des entrainements coches.
- Calendrier regroupe par mois avec accordions (mois courant ouvert par defaut).
- Affichage en grille 7 jours par ligne et legende "Entrainement fait".

## [1.1.1] - 2026-05-17
- Correction compatibilite cache: fallback si anciennes constantes JS chargees.
- Evite le plantage au submit onboarding quand un ancien `config.js` est conserve en cache.

## [1.1.0] - 2026-05-17
- Ajout onboarding premiere visite (prenom, parcours, scenario UTMB 2027).
- Stockage du profil en cookie local.
- Ajout compteur de dodos restants jusqu'a la course.
- Ajout calendrier complet avec case "entrainement du jour fait" pour chaque date.
- Stockage persistant de l'etat des cases via `localStorage`.

## [1.0.0] - 2026-05-17
- Initialisation du projet web 0 to 100.
- Mise en place structure minimale HTML/CSS/JS sans build.
- UI mobile-first avec version SemVer visible.
- Documentation initiale (`README.md`, `CHANGELOG.md`).
