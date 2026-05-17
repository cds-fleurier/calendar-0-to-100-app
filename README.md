# calendar-0-to-100 - Web App

Application web statique (HTML/CSS/JS vanilla), mobile-first, deployee sur GitHub Pages.

## Stack
- HTML5
- CSS3
- JavaScript vanilla

## Fonctionnalites V1.1.0
- Onboarding premiere visite: prenom + parcours (`0 to 100` ou `0 to 40`) + scenario UTMB.
- Stockage local du profil via cookie.
- Compteur de dodos restants jusqu'a la course.
- Calendrier journalier avec case a cocher "entrainement du jour fait".
- Persistance des cases cochees via `localStorage`.

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
