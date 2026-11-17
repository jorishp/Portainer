# evoWeb — schema-editor voor Evohome

Deze map bevat een zelfstandig bouwbare versie van [smar000/evohome-Scheduler-GUI](https://github.com/smar000/evohome-Scheduler-GUI), gebaseerd op bronrevisie `05f2f7280f3b0be30e2a768771b2aee7bc74261c` (0.9.4), met bijgewerkte npm-afhankelijkheden.

De deployment start standaard met **demogegevens**. Voor livegebruik kunnen de Honeywell-gegevens in Portainer worden ingevuld. Livegebruik vereist een apart wachtwoord voor de webeditor. Gebruik de HTTP-pagina alleen op je vertrouwde lokale netwerk; voor toegang via internet is HTTPS met een goed ingestelde proxy nodig.

## Bouw en publicatie

Workflow: [evoWeb image](https://github.com/jorishp/Portainer/actions/workflows/evoweb.yml).

Bij wijzigingen aan `evoweb/source`, de proefscripts, `evoweb/VERSION` of de workflow:

1. GitHub bouwt de frontend en backend met de vastgelegde lockfiles en een actuele Node 22-basisimage.
2. Alle npm-afhankelijkheden worden op bekende kwetsbaarheden gecontroleerd; een gevonden kwetsbaarheid blokkeert de bouw.
3. Een tijdelijke democontainer test de webinterface en het lezen, opslaan en teruglezen van een volledig weekschema.
   Een tweede tijdelijke container test de webaanmelding, bescherming tegen opdrachten vanaf andere websites, de logprivacy en de sessieopslag. Deze controles gebruiken uitsluitend testgegevens en maken geen Honeywell-verbinding.
4. Na een geslaagde bouw op `main` verschijnt de image in `ghcr.io/jorishp/evoweb`, met zowel de releaseversie uit `VERSION` als `sha-<Git-commit>` als tag. Pull requests bouwen en testen zonder publicatie.

De workflow gebruikt het tijdelijke `GITHUB_TOKEN`. Er zijn geen persoonlijke tokens of Portainer-/Honeywell-wachtwoorden nodig in de repository. Het GHCR-package moet na de eerste publicatie openbaar zijn voor anoniem ophalen door Portainer.

Honeywell-gebruikersnaam en wachtwoord horen in Portainer-stackvariabelen. Ze mogen niet in deze repository of image worden ingevuld. Docker/Portainer-beheerders kunnen container-omgevingsvariabelen inzien. Honeywell-sessietokens worden via `/app/.session.json` opgeslagen in het gegevensvolume met bestandsrechten 0600. Bij een ander account worden bestaande tokens niet hergebruikt.

## Je eigen account toevoegen

Open in Portainer **Stacks → evoweb-git → Edit stack settings → Environment variables**. Vul zelf de volgende waarden in:

| Variabele | Waarde |
| --- | --- |
| `HEATING_PROVIDER` | `honeywell` voor je eigen installatie; `mock` voor de proef |
| `HONEYWELL_USERNAME` | Je Honeywell/Evohome-gebruikersnaam |
| `HONEYWELL_PASSWORD` | Je bestaande Honeywell/Evohome-wachtwoord |
| `EVOWEB_WEB_USERNAME` | Gebruikersnaam voor de editor, standaard `evohome` |
| `EVOWEB_WEB_PASSWORD` | Een apart wachtwoord van minstens 16 tekens; gebruik hier niet het Honeywell-wachtwoord |

In Portainer worden dollartekens door Docker Compose verwerkt. Schrijf in de stackvariabelen ieder letterlijk `$` als `$$`; de container ontvangt dan één `$`. Dit geldt ook voor wachtwoorden. Bij aanmelden in de browser gebruik je het oorspronkelijke wachtwoord met één `$`. Controleer bij een melding over een te kort webwachtwoord dus ook de Compose-notatie. Zie [Docker Compose: interpolation](https://docs.docker.com/reference/compose-file/interpolation/).

Kies **Save settings** met **Redeploy** aangevinkt. Open daarna de editor eerst in een apart browservenster en meld je aan met `EVOWEB_WEB_USERNAME` en `EVOWEB_WEB_PASSWORD`. Dit aanmeldvenster vraagt niet om je Honeywell-wachtwoord. De indicator toont **LIVE · Honeywell** bij de echte provider en **DEMO** bij voorbeeldgegevens. Opslaan in live-modus wijzigt het echte schema.

Je kunt gegevens alvast invullen terwijl `HEATING_PROVIDER=mock` blijft staan, mits ook het aparte webwachtwoord is ingesteld. Mock-modus maakt geen cloudverbinding. Zonder de vereiste velden start live-modus niet; bij een mislukte Honeywell-aanmelding wordt de fout gemeld zonder wachtwoorden/tokens in de logs en verschijnt er geen misleidend demoschema als vervanging.

Een browser kan een aanmeldvenster in het HA-iframe blokkeren. Gebruik dan de link om de editor apart te openen. Voor HTTPS achter een proxy kan `EVOWEB_PUBLIC_ORIGIN` worden ingesteld op de externe oorsprong, bijvoorbeeld `https://evohome.example.nl` (zonder pad). Het aanmeldwachtwoord wordt met HTTP Basic Authentication verzonden; HTTPS is nodig op een niet-vertrouwd netwerk. Er is tijdens ontwikkeling geen echte Honeywell-aanmelding getest.

## Portainer

Bij een mislukte Honeywell-aanmelding blijft de app beschikbaar om de fout te melden en krijgt de container de status unhealthy. Er volgt geen automatische reeks nieuwe aanmeldpogingen. Corrigeer de gegevens en kies bewust opnieuw **Redeploy**. De controles gebruiken hiervoor een lokale testserver en benaderen nooit Honeywell met testgegevens.

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

Op 17 november 2026 zijn onder andere axios, body-parser, form-data, follow-redirects, ip-address, proxy-addr en qs bijgewerkt. Een gerichte override verhelpt daarnaast de minimatch-melding bij nodemon. De daaropvolgende live-configuratie voegt de webaanmelding en privacycontroles toe; bron- en lockfilehistorie zijn zichtbaar in Git.

Een npm-controle dekt bekende npm-kwetsbaarheden, niet alle Linux-pakketten of onbekende fouten. De image moet regelmatig opnieuw worden gebouwd met actuele afhankelijkheden.

Licentie van het upstream-project: ISC, zoals vermeld in het oorspronkelijke package.json. Oorspronkelijke auteur: SMAR. Zie ook `source/UPSTREAM.md`.
