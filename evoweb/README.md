# evoWeb — schema-editor voor Evohome (DEMO)

Deze map bevat een zelfstandig bouwbare versie van [smar000/evohome-Scheduler-GUI](https://github.com/smar000/evohome-Scheduler-GUI), gebaseerd op bronrevisie `05f2f7280f3b0be30e2a768771b2aee7bc74261c` (0.9.4), met bijgewerkte npm-afhankelijkheden.

De deployment gebruikt **uitsluitend demogegevens**. Honeywell-inlogvelden zijn leeg. De webapp heeft geen eigen toegangsbeveiliging voor echte verwarmingsgegevens; de proef is bedoeld voor het lokale netwerk.

## Bouw en publicatie

Workflow: [evoWeb image](https://github.com/jorishp/Portainer/actions/workflows/evoweb.yml).

Bij wijzigingen aan `evoweb/source`, `evoweb/smoke-test.cjs`, `evoweb/VERSION` of de workflow:

1. GitHub bouwt de frontend en backend met de vastgelegde lockfiles en een actuele Node 22-basisimage.
2. Alle npm-afhankelijkheden worden op bekende kwetsbaarheden gecontroleerd; een gevonden kwetsbaarheid blokkeert de bouw.
3. Een tijdelijke democontainer test de webinterface en het lezen, opslaan en teruglezen van een volledig weekschema.
4. Na een geslaagde bouw op `main` verschijnt de image in `ghcr.io/jorishp/evoweb`, met zowel de releaseversie uit `VERSION` als `sha-<Git-commit>` als tag. Pull requests bouwen en testen zonder publicatie.

De workflow gebruikt het tijdelijke `GITHUB_TOKEN`. Er zijn geen persoonlijke tokens of Portainer-/Honeywell-wachtwoorden nodig in de repository. Het GHCR-package moet na de eerste publicatie openbaar zijn voor anoniem ophalen door Portainer.

Bij later livegebruik horen de Honeywell-gebruikersnaam en het wachtwoord in Portainer-stackvariabelen, na een afzonderlijke aanpassing voor de liveprovider. Ze mogen niet in deze repository of image worden ingevuld. Docker/Portainer-beheerders kunnen container-omgevingsvariabelen inzien. Honeywell-sessietokens worden via `/app/.session.json` opgeslagen in het gegevensvolume. De huidige Compose-file houdt de inlogvelden expliciet leeg en de provider op mock.

## Portainer

- Stack: `evoweb-git`.
- Repository: `https://github.com/jorishp/Portainer`.
- Referentie: `refs/heads/main`.
- Compose-pad: `evoweb/docker-compose.yml`.
- Container: `evoweb-git`.
- Standaard webadres: `http://192.168.0.94:3330/`.
- HA-iframe: `http://192.168.0.94:3330/?embed=true`.

`EVOWEB_BIND_IP` en `EVOWEB_PORT` kunnen als Portainer-omgevingsvariabelen worden aangepast. Er is geen lokale image-build op de Docker-host nodig.

De Compose-file hergebruikt de bestaande externe volumes `evoweb_evoweb_data` en `evoweb_evoweb_logs`. Bij een installatie op een nieuwe Docker-host moeten deze eerst worden aangemaakt of uit back-up worden hersteld. Via `EVOWEB_DATA_VOLUME` en `EVOWEB_LOGS_VOLUME` kunnen andere bestaande volumenamen worden gekozen.

De oorspronkelijke lokale stack `evoweb` kan tijdens de migratie gestopt worden bewaard als terugval. Start nooit beide stacks tegelijk op dezelfde poort of met dezelfde gegevensvolumes. Een mock-schema staat alleen in procesgeheugen en begint na een herstart opnieuw met de ingebouwde voorbeelden.

## Volgende release

1. Werk bron/pakketlijsten bij en geef `VERSION` een nieuwe, unieke tag.
2. Laat de workflow op `main` volledig slagen.
3. Pas daarna de image-tag in `docker-compose.yml` aan naar die gebouwde versie.
4. Kies in Portainer **Pull and redeploy**. Bij GitOps-polling kan Portainer de nieuwe Compose-commit ophalen. Er wordt bewust geen algemeen automatisch image-updateproces voor deze stack gebruikt.

De Dockerfile bevat een HTTP-healthcheck; de container hoort na starten **healthy** te worden. De Watchtower-label staat voor deze stack op `false`, ook als andere containers door Watchtower worden bijgewerkt.

## Beveiligingscorrecties

Op 17 november 2026 zijn onder andere axios, body-parser, form-data, follow-redirects, ip-address, proxy-addr en qs bijgewerkt. Een gerichte override verhelpt daarnaast de minimatch-melding bij nodemon. De applicatiebron zelf is overgenomen van de genoemde upstream-revisie; bron- en lockfilehistorie zijn zichtbaar in Git.

Een npm-controle dekt bekende npm-kwetsbaarheden, niet alle Linux-pakketten of onbekende fouten. De image moet regelmatig opnieuw worden gebouwd met actuele afhankelijkheden.

Licentie van het upstream-project: ISC, zoals vermeld in het oorspronkelijke package.json. Oorspronkelijke auteur: SMAR. Zie ook `source/UPSTREAM.md`.
