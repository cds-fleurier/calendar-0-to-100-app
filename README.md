# calendar-0-to-100-app - Web App

Application web statique (HTML/CSS/JS vanilla), mobile-first, deployee sur GitHub Pages.

## Stack
- HTML5
- CSS3
- JavaScript vanilla

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
Repo public de deploiement GitHub Pages pour la team 0 to 100.
