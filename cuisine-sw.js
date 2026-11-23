/* Service worker de l'espace cuisine : sert uniquement à afficher les notifications de nouvelles commandes
   (Android n'autorise pas les notifications sans service worker). Il n'intercepte aucune page. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const w = list.find((c) => new URL(c.url).pathname.startsWith("/cuisine"));
      return w ? w.focus() : self.clients.openWindow("/cuisine");
    })
  );
});
