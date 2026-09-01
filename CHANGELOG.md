# Changelog

## [2.6.0] - 2026-09-01
- Tracés **réels** : la CCC vient du GPX officiel UTMB World Series (108 km, 6200 m D+), avec ses 12 points de contrôle affichés sur la carte (point cliquable → nom + kilomètre).
- MCC **dérivée** du tronçon final de la CCC (point de contrôle « Martigny » → Chamonix, ~38 km) : le tracé est réel mais la distance reste approximative (affichée avec un « ~ ») tant qu'on n'a pas le GPX MCC.
- Badge carte : distance et D+ officiels quand ils le sont, simple nom quand le tracé est provisoire.
- Horaire de départ CCC (vendredi 09h00) confirmé par la métadonnée du GPX 2026.
- Zoom fractionnaire (`zoomSnap: 0.25`) et marge basse au cadrage : le tracé remplit le cadre sans couper les étiquettes.
- `scripts/gpx-to-route.py` lit désormais la distance, le D+ et les points de contrôle du GPX, et sait couper un tracé à un point de contrôle (`--from`).

## [2.5.0] - 2026-09-01
- Carte du countdown refaite en **Leaflet** (CDN cdnjs, SRI) : la carte redevient interactive (zoom, déplacement) et les marqueurs sont ancrés à leurs vraies coordonnées — c'était le fond du bug du pin décalé au zoom.
- Tracé complet de la course affiché, avec marqueur de **départ** (orange pulsant) et d'**arrivée** (or), cadrage automatique sur le tracé.
- Fond de carte : tuiles OpenStreetMap assombries en CSS (`.leaflet-tile-pane`) — les fonds sombres CARTO / Stadia demandent désormais une clé API.
- Molette désactivée (elle scrolle la page) ; sur mobile, le déplacement de la carte ne s'active qu'après un tap explicite, pour ne pas piéger le scroll.
- Tracés dans `assets/routes/{ccc,mcc}.json` + convertisseur `scripts/gpx-to-route.py` pour les régénérer depuis un GPX officiel.
- ⚠️ Tracés actuellement **provisoires** (points de passage reliés) — la distance est masquée tant qu'ils le sont.

## [2.4.0] - 2026-09-01
- Countdown bascule de l'ETC 2026 (couru le 25 août ✅) vers la course 2027 du parcours : CCC pour 0 to 100, MCC pour 0 to 40.
- Date de départ calculée depuis la semaine UTMB choisie à l'onboarding : MCC = lundi 10h00, CCC = vendredi 09h00 (horaires provisoires, à confirmer avec le programme officiel 2027).
- Carte du départ dynamique : Courmayeur (CCC) / Martigny-Combe (MCC), titre et lien "Agrandir" suivent le parcours.
- Fix carte : l'iframe OSM n'est plus interactive (`pointer-events: none`) — le pin overlay est centré, un zoom/pan le désynchronisait du lieu réel. L'exploration passe par le lien "Agrandir".
- Compteur "dodos" recalé sur le jour de course au lieu de la fin de la semaine UTMB (plus de contradiction avec le countdown).
- Suppression du bloc stat "dodos jusqu'à l'ETC 2026", devenu mort après la course.

## [2.3.0] - 2026-07-13
- Countdown live vers l'ETC UTMB 2026 : départ Courmayeur le 25 août à 14h00 (heure locale, UTC+2), compte à rebours jours / heures / minutes / secondes qui tourne en temps réel.
- Carte du point de départ (OpenStreetMap embarquée, filtre dark mode) avec pin orange pulsant "Courmayeur".
- Affiché uniquement pour le parcours 0 to 100 ; bascule automatique en état "C'EST PARTI" une fois l'heure de départ passée.

## [2.2.0] - 2026-06-09
- Double compteur dodos : "jusqu'à l'ETC 2026" (0to100 uniquement, masqué après la course) + "jusqu'à la CCC/MCC 2027".
- Label dynamique selon le parcours (CCC ou MCC).
- CSS compact automatique quand les 3 blocs sont affichés.

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
