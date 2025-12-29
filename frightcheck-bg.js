(() => {
  const apply = d => {
    if (d?.dataset?.ggaBg) return;
    if (!d.querySelector(".gga-app.fright-check")) return;
    d.style.backgroundImage = 'url("../ui/parchment.jpg")';
    d.style.backgroundRepeat = "repeat";
    d.style.backgroundPosition = "top left";
    d.dataset.ggaBg = 1;
  };

  const scan = () =>
    document
      .querySelectorAll('dialog.application.dialog[open]')
      .forEach(apply);

  if (!window.__ggaBgObs__) {
    window.__ggaBgObs__ = new MutationObserver(ms =>
      ms.forEach(m => {
        m.addedNodes?.forEach(n => {
          if (n.matches?.('dialog.application.dialog[open]')) apply(n);
          n.querySelectorAll?.('dialog.application.dialog[open]').forEach(apply);
        });
        if (m.type === "attributes" &&
            m.target.matches?.('dialog.application.dialog[open]'))
          apply(m.target);
      })
    );
    window.__ggaBgObs__.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"]
    });
  }

  scan();
})();