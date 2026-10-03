// Keep executable code in a local script to satisfy the extension's MV3 CSP.
document.addEventListener('DOMContentLoaded', async () => {
  const panel = new POSSettingsPanel();
  const root = document.getElementById('posSettingsRoot');
  const panelElement = panel.createPanel();
  panelElement.style.position = 'relative';
  root.appendChild(panelElement);

  await panel.loadConfig();
  await panel.loadStats();
  await panel.refreshServices();
});
