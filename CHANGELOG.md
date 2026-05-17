# Changelog

## [2.1.0] - 2026-05-17
- Label "dodos restants" dans le header stats.
- Événements clés dans le calendrier : WE Choc #1 (23-25 mai 2026), ETC UTMB (25 août 2026, 0to100), WE Choc #2 (24-25 oct. 2026), WE Choc #3 (15-17 mai 2027).
- Stripe colorée en haut des cellules événement + tag label.

## [2.0.0] - 2026-05-17
- Refonte UI complète "Dark Altitude" : fond ultra-sombre, glassmorphism, Inter + Barlow Condensed.
- Stats héros : anneau de progression SVG animé, dodos et streak en grands chiffres.
- Streak counter : jours consécutifs cochés calculés en temps réel.
- Cellules calendrier : tap sur toute la cellule, états visuels distincts (done / today / missed / future).
- Entête des jours de la semaine dans chaque grille mensuelle.
- Suppression des éléments UI verbeux (barre linéaire, texte redondant).


## [1.3.1] - 2026-05-17
- Celebration upgrade "all in": multi-bursts, sparks plus nombreux, ondes d'explosion, confettis et message BRAVO renforce.


## [1.3.0] - 2026-05-17
- Ajout animation de celebration a chaque nouveau jour coche manuellement (feu d'artifice + message "Bravo!").
- Aucun declenchement sur les jours precoches par defaut.


## [1.2.4] - 2026-05-17
- Date officielle mise a jour pour `0 to 40`: debut au 1er avril 2026.
- Accordions calendrier corriges: un seul mois ouvert par defaut (mois courant) et conservation du mois ouvert apres coche/decochage.
- Precochage par defaut: mars+avril 2026 pour `0 to 100`, avril 2026 pour `0 to 40`, sans ecraser les choix utilisateur deja enregistres.

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
