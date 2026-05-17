(function renderVersion() {
  const versionNode = document.getElementById("app-version");
  if (!versionNode) {
    return;
  }

  versionNode.textContent = APP_VERSION;
})();
