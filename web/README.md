# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## API: sutikimų atnaujinimas

Profilio puslapyje sutikimai atnaujinami per SvelteKit proxy endpointą:

- `POST /api/auth/consents` → persiunčia į backend `POST /api/auth/consents` (Django sesija + CSRF).
- Payload (galima siųsti dalinai):
  - `newsletter_consent: boolean`
  - `privacy_policy_consent: boolean`
  - `terms_of_service_consent: boolean`

Pastaba: state-changing requestams būtini slapukai (sesija) ir CSRF, todėl frontas naudoja serverinį route (proxy), o ne tiesioginį kvietimą į backend.

## UI: maistinė vertė (nutrition)

Recepto detalėje, jei backendas grąžina `nutrition` ir `nutrition_updated_at`, po ingredientų sąrašu rodoma maistinė vertė (per porciją), mikroelementai, alergenai ir pastabos.

## Contributing / Workflow

Susitarimas šiame projekte:

- Kai daromi pakeitimai, visada papildomai atnaujink README (jei pakeitimas keičia integraciją, API, paleidimą ar naudojimą).
- Po pakeitimų visada atlik `git commit` ir `git push`.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
