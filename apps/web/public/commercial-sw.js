// Service worker de l'espace des conseillers (F-196, ADR 0396) : affiche les notifications reçues
// sur le téléphone (web push) et ouvre la bonne page au toucher. Aucun cache, aucune donnée gardée.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MENAO", body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "MENAO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: typeof data.link === "string" ? data.link : "/commercial/journee" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/commercial/journee";
  const target = new URL(link, self.location.origin);
  // Lien vers un autre site : ignoré, on ouvre l'espace des conseillers.
  const url = target.origin === self.location.origin ? target.href : "/commercial/journee";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
