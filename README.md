# calendar-0-to-100 - Web App

Application web statique (HTML/CSS/JS vanilla), mobile-first, deployee sur GitHub Pages.

## Stack
- HTML5
- CSS3
- JavaScript vanilla

## Fonctionnalites V2.8.0
- Carte Etapes : countdown live sur l'etape la plus proche (WE Choc, course perso ou course finale) + liste chronologique de toutes les etapes avec J-n.
- Courses de preparation : 4 emplacements definis dans `RACE_SLOTS` (`scripts/config.js`) avec week-ends autorises (`windows`) et distance (`minKm` / `maxKm`). **Depuis la v3, les courses viennent de « Qui court où ? »** (Google Sheet lu via `TEAM_CHOICES_API`, courses autorisees chargees depuis `qui-court-ou-0to100/data/courses.js`) : nom, distance, date, validation staff, et qui d'autre y va. Les boutons Choisir / Modifier renvoient vers Qui court où. La saisie manuelle (dialog + `localStorage`, bouton « saisir ») reste possible pour tout le monde ; le choix Qui court où prend le dessus s'il existe.
- Identite partagee entre les outils de la team : roster charge depuis `carte-participants-0to100/data/participants.js`, id du participant memorise dans le profil (`participantId`) et dans la cle localStorage commune `team_me` (`TEAM_ME_KEY`). Pas dans le trombi → id invite `guest|<100|40>|<Prenom>`, meme convention que Qui court ou.
- Evenements d'equipe dans `EVENTS` (`place` et `optional` facultatifs).

## Fonctionnalites V2.6.1
- Countdown live vers la course 2027 du parcours (CCC Courmayeur / MCC Martigny-Combe).
- Carte Leaflet interactive : trace officiel de la course, marqueurs depart/arrivee et points de controle.
- Date de depart derivee de la semaine UTMB choisie (`raceStart.dayOffset` dans `scripts/config.js`).

## Traces de course
Les traces vivent dans `assets/routes/<slug>.json` et sont referencees par `raceStart.route`.
Pour les regenerer depuis un GPX officiel :

    python3 scripts/gpx-to-route.py ccc ~/Downloads/CCC.gpx
    python3 scripts/gpx-to-route.py mcc ~/Downloads/MCC.gpx

A defaut de GPX dedie, un trace peut etre derive d'un autre (la MCC emprunte le
troncon final de la CCC) :

    python3 scripts/gpx-to-route.py mcc ~/Downloads/CCC.gpx --from "Martigny" --start "Martigny-Combe"

Les GPX sources ne sont pas versionnes (copyright UTMB World Series) : seuls les traces
simplifies le sont. Un fichier marque `"derived"` affiche sa distance avec un `~` ;
un fichier `"provisional": true` n'affiche pas de distance du tout.

## Fonctionnalites V1.2.0
- Onboarding premiere visite: prenom + parcours (`0 to 100` ou `0 to 40`) + scenario UTMB.
- Stockage local du profil via cookie.
- Compteur de dodos restants jusqu'a la course.
- Calendrier journalier avec case a cocher "entrainement du jour fait".
- Persistance des cases cochees via `localStorage`.
- Barre de progression globale des entrainements coches.
- Calendrier mensuel en accordions avec grille de 7 jours et mois courant ouvert par defaut.

## Structure minimale
- `index.html`
- `styles/main.css`
- `scripts/config.js` (source de verite pour `APP_VERSION`)
- `scripts/app.js`
- `CHANGELOG.md`

## Versioning
- SemVer via `APP_VERSION` dans `scripts/config.js`
- Version affichee dans l'UI
- A chaque livraison:
  - bump `APP_VERSION`
  - ajouter une entree dans `CHANGELOG.md`

## Developpement local
Ouvrir `index.html` dans un navigateur ou servir le dossier avec un serveur statique.

## Deploy GitHub Pages
Ce repo est la base principale. Le deploy se fait vers un repo public dedie `*-app` configure pour GitHub Pages.
