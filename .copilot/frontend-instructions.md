# Frontend (SvelteKit) – paleidimas ir darbas

Šis aplankas turi SvelteKit frontendą, kuris vartoja Django Ninja JSON API.

## Reikalavimai

- Node.js (rekomenduojama LTS)
- pnpm (rekomenduojama)

## 1) Pradinis paruošimas

```bash
cd frontend
pnpm install
```

## 2) Konfigūracija per `.env`

Frontend naudoja tik **viešus** kintamuosius (SvelteKit `PUBLIC_*`). Žr. [frontend/.env.example](.env.example).

Dažniausiai užtenka:

```dotenv
PUBLIC_API_BASE_URL=http://localhost:8000/api
PUBLIC_MEDIA_BASE_URL=http://localhost:8000/media
```

Pastabos:

- `PUBLIC_API_BASE_URL` turi rodyti į Ninja bazinį kelią (`/api` pagal `NINJA_BASE_PATH`).
- `PUBLIC_MEDIA_BASE_URL` turi rodyti į backend’o `MEDIA_URL` bazę.

## 3) Lokalūs paleidimo scenarijai

### Dev serveris

```bash
pnpm run dev
```

Jei reikia atidaryti naršyklę automatiškai:

```bash
pnpm run dev -- --open
```

### Build + preview

```bash
pnpm run build
pnpm run preview
```

## 4) Testai ir kokybė

- Tipų patikra:
  ```bash
  pnpm run check
  ```
- Lint + format patikra:
  ```bash
  pnpm run lint
  ```
- Unit testai:
  ```bash
  pnpm run test:unit
  ```
- E2E (Playwright):
  ```bash
  pnpm run test:e2e
  ```

## 5) API autentifikacija (sesijos + CSRF)

Backend’as naudoja Django sesijas ir CSRF. Kai frontend’e darysite state-changing requestus (login, logout, bookmarks, comments, rating ir pan.), reikės:

- siųsti `credentials: 'include'`
- pridėti `X-CSRFToken` headerį (reikšmė iš `csrftoken` slapuko)

Daugiau detalių apie API ir CSRF srautą: [backend.md](backend.md).
