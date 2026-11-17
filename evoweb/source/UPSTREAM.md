# Upstream en lokale wijzigingen

- Project: https://github.com/smar000/evohome-Scheduler-GUI
- Vastgelegde bron: 05f2f7280f3b0be30e2a768771b2aee7bc74261c
- Oorspronkelijke pakketversie: 0.9.4
- Oorspronkelijke auteur: SMAR
- Oorspronkelijke package.json-licentie: ISC

Overgenomen: applicatiebron, frontend, configuratie voor compilatie en npm-pakketbestanden.

Gewijzigd op 17 november 2026: npm-lockfiles voor server en frontend, minimumversie van axios, een gerichte nodemon/minimatch-override en de Dockerfile (audit-controles, releasegegevens, HTTP-healthcheck).

Deployment en GitHub Actions worden beheerd in de bovenliggende map/repository. Bewaar deze vermelding bij verdere verspreiding.

De live-configuratie voegt configureerbare Portainer-variabelen, aparte webaanmelding, bescherming tegen opdrachten vanaf andere websites en een zichtbare DEMO/LIVE-indicator toe. HTTP-fouten worden zonder gevoelige requestgegevens gelogd. Sessiebestanden zijn alleen voor de eigenaar leesbaar en worden aan het account gekoppeld. Mock-modus meldt niet op de cloud aan; een mislukte live-aanmelding valt niet ongemerkt terug op demo. Sessievernieuwing gebruikt nu POST in plaats van GET.
