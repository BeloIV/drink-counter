# Drink Counter 🍺☕

Web app for tracking beverage consumption and debts in a shared household. A tablet
on the LAN acts as a kiosk; the same app is reachable on a public domain behind
Google sign-in. Django REST Framework backend, React frontend, PostgreSQL, all in
Docker Compose.

## ✨ Features

- 📊 **Consumption tracking** – beer, coffee, cold brew; per-item, per-gram or per-ml pricing
- 👥 **Home members and guests** – with avatars, lifetime beer/coffee counters
- 🔄 **Multi-person mode** – one order for several people, coffee grams split evenly
- ↩️ **Undo and editing** – undo the last order, edit or delete transactions in the history
- 💰 **Debts** – settling a debt records a `Payment`; transactions stay in the history
- 🧾 **Pay by Square** – QR code for paying a debt by bank transfer
- 🧊 **Cold brew batches** – mix a batch from coffee stock, cold brew stock is priced from it
- ⚖️ **Stock tracking** – every 3rd brew the kiosk asks to weigh the coffee; weighings are logged
- 📈 **Statistics** – consumption overview on its own page
- 🔐 **Access** – admin PIN on the kiosk, Google allowlist on the public domain
- 📱 **PWA** – installable, light and dark theme

## 🚀 Technologies

| Part | Stack |
|------|-------|
| Backend | Python 3.12, Django 5.1, Django REST Framework, drf-spectacular, gunicorn, whitenoise, google-auth |
| Frontend | React 19, Vite 7, React Router 7, Bootstrap 5, React Icons |
| Database | PostgreSQL 16 |
| Serving | nginx (static build + `/api` proxy), multi-stage frontend image |

## 📦 Installation & Setup

Prerequisites: Docker with Compose v2 (`docker compose`, not `docker-compose`).

1. **Clone the repository**
   ```bash
   git clone https://github.com/BeloIV/drink-counter.git
   cd drink-counter
   ```

2. **Create the env files** – Compose requires both
   ```bash
   cp .env.example .env                  # database password
   cp backend/.env.example backend/.env
   ```
   Fill in `POSTGRES_PASSWORD` and at least `SECRET_KEY` and `ADMIN_PIN` (see [Configuration](#-configuration)).

3. **Start the application**
   ```bash
   # production: nginx + gunicorn
   docker compose up --build -d

   # development: Vite HMR + Django runserver, DEBUG on
   docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build
   ```

4. **Open it**

   | What | Production | Development |
   |------|-----------|-------------|
   | App | http://localhost:5173 | http://localhost:5173 |
   | API | http://localhost:5173/api/ | http://localhost:8001/api/ |
   | Django admin | http://localhost:5173/django-admin/ | http://localhost:8001/django-admin/ |
   | Swagger docs | – | http://localhost:8001/api/docs/ |

   In production the backend is not published on the host; nginx proxies `/api/`,
   `/media/` and `/django-admin/` to it. PostgreSQL is not published on the host either.

5. **Create a superuser** (only needed for Django admin)
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

## 📁 Project Structure

```
drink-counter/
├── backend/
│   ├── backend/            # Django settings, root URLs (api/, django-admin/, media/)
│   ├── core/               # Main app
│   │   ├── models.py       # Data model
│   │   ├── services.py     # Business rules: pricing, stock, debts, brewing
│   │   ├── views.py        # API views (validate + respond)
│   │   ├── serializers.py
│   │   ├── permissions.py  # Admin PIN / Google admin checks
│   │   ├── middleware.py   # Google sign-in gate for PUBLIC_HOST
│   │   ├── google_auth.py  # Google ID token verification
│   │   ├── payments.py     # Pay by Square QR
│   │   ├── avatars.py      # Avatar thumbnails
│   │   └── tests.py, test_*.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          # order (kiosk home), brew, admin, transactions, users, access, stats
│   │   ├── components/     # Modal, dialogs, page header, nav drawer, PIN login, Google gate
│   │   ├── hooks/          # Theme, flash messages, admin auth, Google button
│   │   ├── lib/            # Pure helpers: units, pricing, debts, colours, contexts
│   │   ├── styles/         # Design tokens
│   │   ├── main.jsx        # Router and providers
│   │   └── api.js          # API client
│   ├── public/             # Fonts, manifest, service worker
│   ├── nginx.conf          # Production server config
│   ├── Dockerfile          # Multi-stage: Vite build → nginx
│   └── Dockerfile.dev      # Vite dev server
├── docker-compose.yaml     # Production
└── docker-compose.dev.yaml # Development override
```

## 🎯 Usage

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Kiosk: pick person → category → item → quantity/grams |
| `/brew` | Mix a cold brew batch from coffee stock |
| `/transactions` | Calendar history, edit and delete transactions |
| `/admin` | Items, stock, debts, coffee filters, brew batches, stock checks (PIN) |
| `/users` | Manage home members and guests (PIN) |
| `/access` | Google sign-in allowlist (**Prístupy**) |
| `/stats` | Statistics |

### Ordering
1. Pick a person (or switch on multi-person mode and pick several)
2. Choose a category and an item – the category step is skipped if there is only one
3. For per-item drinks set the count (auto-submits after 5 s); for coffee enter grams
4. The debt is added; the last order can be undone

### Debts
"Vynulovať dlh" in the admin panel creates a `Payment` and links it to the person's
unpaid transactions. The debt is the sum of unpaid transactions; statistics count all
of them. Persons, items and categories that have transactions cannot be deleted
(the API returns `409 Conflict`) – deactivate them instead.

## 🛠️ Development

### Backend
```bash
docker compose exec backend bash
python manage.py makemigrations   # migrations are not committed (gitignored)
python manage.py migrate
python manage.py test core
```

### Frontend
Dependencies are installed only inside the image (`npm ci`). To add a package, run
`npm install <package>` in the dev container and rebuild the image.
```bash
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml exec frontend sh
npm run lint
npm run build
```

In development Vite proxies `/api` and `/media` to `http://backend:8001`
(see `vite.config.js`); in production nginx does the same.

## 📝 API Endpoints

All under `/api/`. Paths have no trailing slash except router resources.

| Area | Endpoints |
|------|-----------|
| Resources (CRUD) | `persons/`, `categories/`, `items/`, `coffee-presets/` (alias `coffee-filters/`), `allowed-emails/` |
| Orders | `POST transactions`, `GET transactions/list`, `PATCH/DELETE transactions/<id>`, `POST transactions/undo` |
| Session | `GET session/active` (active session with summary), `POST session/reset` |
| Debts | `POST persons/<id>/reset-debt`, `GET pay/<signed token>/` (link in the person's `pay_by_square_url`) |
| Stock | `POST items/<id>/set-stock`, `POST items/<id>/settle`, `brew-batches`, `stock-checks` |
| Stats | `GET stats` |
| Auth | `auth/csrf`, `auth/admin-login`, `auth/admin-logout`, `auth/admin-check`, `auth/me`, `auth/google`, `auth/google-logout` |
| Health | `GET health` |

Full schema: `/api/docs/` (only with `DEBUG=true`).

## 🔧 Configuration

### `backend/.env`
```env
SECRET_KEY=                 # Django secret key – set it in production
DEBUG=false
HTTPS=false                 # true behind HTTPS → secure cookies
ADMIN_PIN=                  # PIN for the admin pages on the kiosk (default 1234)
PAYMENT_IBAN=               # IBAN used in Pay by Square QR codes
LAN_HOST=                   # LAN address the kiosk uses, e.g. 192.168.1.250
PUBLIC_HOST=                # public domain behind Google sign-in, e.g. drinks.example.com
GOOGLE_CLIENT_ID=
BOOTSTRAP_ADMIN_EMAILS=
```
The database password comes from `POSTGRES_PASSWORD` in the root `.env`; the other
database settings (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PORT`)
are set in `docker-compose.yaml`.

Every write request needs the CSRF token from `GET /api/auth/csrf`, sent back in the
`X-CSRFToken` header; the frontend fetches it by itself.

### Google sign-in (public domain)
On `PUBLIC_HOST` only Google accounts from the allowlist get in; the kiosk on the LAN
address needs no login and uses the admin PIN. Admins manage the allowlist on the
**Prístupy** page.
```env
PUBLIC_HOST=drinks.example.com
GOOGLE_CLIENT_ID=<OAuth client ID from Google Cloud Console>
BOOTSTRAP_ADMIN_EMAILS=admin@example.com   # comma-separated, always admins
```
In Google Cloud Console, add `https://<PUBLIC_HOST>` as an authorized JavaScript origin
of the OAuth client. Without `GOOGLE_CLIENT_ID` nobody can sign in on the public domain.

## 📊 Database Models

| Model | Purpose |
|-------|---------|
| `Person` | Home member or guest; avatar, active flag, lifetime beer/coffee counters |
| `Category` | Beverage category (beer, coffee, cold brew) |
| `Item` | Beverage: price, pricing mode (`per_item` / `per_gram` / `per_ml`), colour, stock, brew and restock counts |
| `Session` | Tracking period |
| `Transaction` | One consumption record: quantity, price at the time, optional `Payment` |
| `Payment` | A settled debt; the transactions it paid point to it |
| `BrewBatch`, `BrewBatchIngredient` | A cold brew run and the coffees that went in |
| `StockCheck` | A coffee weighing: measured grams, tare, expected stock |
| `CoffeePreset` | Extra price by gram amount ("coffee filter") |
| `AllowedEmail` | Google allowlist entry, optionally admin |

Transaction foreign keys use `PROTECT`, so history can never be deleted by cascade.

## 🐛 Troubleshooting

**Port already in use** – change the host side in `docker-compose.yaml`:
```yaml
ports:
  - "5174:80"   # frontend (production)
```

**Container fails with `KeyError: ContainerConfig`** – you are using Compose v1;
use `docker compose` instead of `docker-compose`.

**Changes not reflected in production** – the frontend is a static build, rebuild it:
```bash
docker compose up --build -d frontend
```

**Database won't start** – ⚠️ this deletes all data:
```bash
docker compose down -v
docker compose up --build -d
```

## 📄 License

MIT

## 👨‍💻 Author

Created by BeloIV
