# ¿Dónde Estoy?

Juego de adivinar lugares con panoramas de Street View, con Latinoamérica como foco: elegís el
recorte (tu provincia, tu país, el Cono Sur, Latinoamérica, el mundo) y la dificultad se va
apretando sola a medida que la racha crece.

```
hornear (offline, una vez)            jugar (en el navegador, sin servidor)
──────────────────────────            ────────────────────────────────────
fuentes libres                        regions.json ──┐
  Natural Earth, GeoNames                            ├─→ escalera ─→ restricciones
  OSM Overpass                        pool/*.json ───┘       │
      │                                                      ↓
      ├─→ candidatos sobre calles                      motor de rondas (puro)
      ├─→ validación contra metadata                         │
      │     (gratis, sin cuota)                     ┌────────┴────────┐
      ├─→ país + provincia + dificultad             ↓                 ↓
      └─→ shards columnares  ────────────→   panorama (Google)   mapa (Leaflet)
```

## Funcionalidades

- **Seis modos** — Clásica (5 rondas), Escalera (la racha ensancha el mundo y acorta la correa),
  Racha (solo el país o la provincia, un error y chau), Contrarreloj (5 minutos), Muerte Súbita
  (el margen se encoge cada ronda) y Desafío Diario (los mismos cinco lugares para todos, con
  grilla compartible).
- **Recortes componibles** — ciudad, provincia, país, bloque, continente, mundo. Cada región
  conoce a su padre, y la escalera camina esa cadena.
- **Escalera de dificultad** — una sola tabla define tiempo, girar, zoom, moverse, brújula,
  ventana de dificultad y cuánto se ensancha la región por escalón. Cortar la racha baja dos
  escalones, no hasta el fondo.
- **Puntaje normalizado** — `5000 · e^(-10·d/diagonal)` sobre la región en juego, así errar 40 km
  en CABA pesa lo mismo que errar 4.000 km en el mundo.
- **Dificultad horneada** — distancia a ciudades, tipo y estado de la calle, densidad vial, edad
  de la imagen y ambigüedad del país, guardada además como percentil dentro de cada región.
- **Pool verificado offline** — nada de muestreo en vivo: el baker consulta la metadata de Street
  View (gratis y sin cuota) y se queda solo con cobertura oficial de Google.
- **Estadísticas locales** — récords por modo, historial del diario, export/import en JSON.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev) (runes), build estático
- [Tailwind v4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) + OpenStreetMap para el mapa de respuesta (sin clave, sin cuota)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) para el panorama
- [Vitest](https://vitest.dev) para la capa pura
- [tsx](https://tsx.is) para los scripts de horneado

## Requisitos

- Node 24 (`nvm use 24`) y pnpm — Vercel ya no soporta Node 20
- `unzip` en el PATH (lo usa el baker para GeoNames)
- Una clave de Google Maps Platform con **Maps JavaScript API** y **Street View Static API**
  habilitadas

## Setup

```bash
nvm use 24
pnpm install
cp .env.example .env     # poné tu VITE_MAPS_KEY
pnpm tsx scripts/seed-regions.ts
pnpm tsx scripts/seed-pool.ts
```

El pool semilla trae 68 ubicaciones argentinas escritas a mano para poder jugar enseguida. Para
el pool de verdad hace falta la clave del baker:

```bash
pnpm bake --region ar --target 800
pnpm bake --region ar --limit 50 --dry-run    # ver la tasa de acierto sin tocar Google
pnpm bake:revalidate --region ar              # podar los panoramas que Google retiró
```

### Las dos claves

| Variable | Dónde vive | Restricción |
|---|---|---|
| `VITE_MAPS_KEY` | en el navegador, es pública por naturaleza | por referrer, solo Maps JavaScript API |
| `GOOGLE_MAPS_BAKE_KEY` | solo en `.env`, nunca se commitea | solo Street View Static API |

Dynamic Street View es un SKU **Pro**: 5.000 cargas de panorama gratis por mes (unas 1.000
partidas de cinco rondas). Pasado eso son USD 14 por cada 1.000. Poné un **tope diario de cuota**
de ~150 en Cloud console (150 × 30 = 4.500, debajo del límite gratis) y no hay forma de que te
facturen: Google rechaza las que sobran en vez de cobrarlas. Las consultas de metadata del baker
son gratis y no consumen cuota.

Si preferís cero riesgo de facturación, `VITE_PANO_DRIVER=embed` usa el Embed API, que es gratis e
ilimitado — pero es un iframe: no se puede fijar ni bloquear la cámara, así que los escalones que
prohíben girar o moverse dejan de poder hacerse cumplir.

## Desarrollo

```bash
pnpm dev      # http://localhost:5174
pnpm test     # capa pura: puntaje, escalera, dificultad, motor, pool
pnpm check    # svelte-check
```

Atajos en partida: `Enter` adivina o pasa a la ronda siguiente, `m` agranda el mapa.

## Build

```bash
pnpm build    # estático en build/
pnpm preview
```

## Datos y licencias

Los panoramas se muestran siempre a través de las APIs de Google, con su marca visible. El pool
guarda coordenadas propias y metadata (panoId, fecha), **nunca imágenes**. Límites de cobertura
conocidos: Venezuela, Nicaragua y Haití no tienen cobertura oficial, y Cuba es territorio prohibido
para Google Maps Platform, así que el baker ni la consulta.

Fuentes: [Natural Earth](https://www.naturalearthdata.com) (dominio público),
[GeoNames](https://www.geonames.org) (CC-BY 4.0), [OpenStreetMap](https://www.openstreetmap.org)
(ODbL).
