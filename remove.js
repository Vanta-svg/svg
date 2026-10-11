(() => {
  const removeNetlifyHUD = () => {
    document.querySelectorAll('script').forEach(script => {
      const src = script.getAttribute('src') || '';

      if (
        src.includes('/.netlify/scripts/hud') ||
        src.includes('netlify.com') && src.includes('hud')
      ) {
        script.remove();
      }
    });
  };

  removeNetlifyHUD();

  new MutationObserver(removeNetlifyHUD).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();