# Smash Kameti Tracker

Local web app for a friend group to track Kameti treat turns, American-style bill splits, parcel orders, attendance, and member-to-member settlements.

## Prerequisites

- Node.js 20+
- Local MongoDB (`mongod` running on `127.0.0.1:27017`)

## Setup

```bash
cp .env.local.example .env.local
npm install
```

Copy env vars from `.env.local.example` (or use the repo `.env` as a template):

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `AUTH_SECRET` | Long random string used to sign session cookies (the “hash string” for auth) |
| `ADMIN_EMAIL` | Email for the **first** admin user (seeded once if no admin exists in DB) |
| `ADMIN_PASSWORD` | Plain password used only at seed time; stored in MongoDB as a **scrypt hash** (`AdminUser.passwordHash`), not as plain text |

On first admin login (or first API call that runs `ensureDefaultAdmin`), if the `adminusers` collection is empty, the app creates one document from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Example defaults in `.env`:

- Email: `admin@ethizo.com`
- Password: `Ethizo@Admin2026` (change in production)

**Auth behaviour:** The app opens as **guest** (view only). Use **Admin login** in the sidebar with the email/password above. Guests cannot POST/PATCH/DELETE via the API. Sign out returns to guest mode.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test
```

Financial logic tests live in `src/lib/accounting/accounting.test.js`.

## Production build

```bash
npm run build
npm start
```

## MongoDB transactions

Multi-document sync (outing financial rebuild) supports MongoDB replica sets. On a **standalone** local MongoDB instance, the app falls back to non-transactional writes (`runWithOptionalTransaction` in `src/lib/accounting/outing-ledger.js`).

## Project structure

- `src/models/` — Mongoose schemas
- `src/lib/accounting/` — splits, balances, settlement recommendations, outing ledger sync
- `src/app/api/` — REST route handlers
- `src/app/(main)/` — UI pages
- `src/components/` — shared UI (shadcn/ui)

## Settlements (Splitwise-style)

- **Net balance (paisa):** `paid for group − your share + transfers in − transfers out`. Positive = should receive; negative = owes; zero = settled.
- **American outings:** Shared bill split **equally** among **chargeable** members only (attendance alone does not create debt). Who paid the shared bill is tracked separately. Parcels are always the orderer’s personal share, never in the shared split.
- **Kameti settlement:** Parcels and parcel payments on Kameti outings only — not shared treat bills, turns, or attendance.
- **American settlement:** Chargeable shared splits and parcels on American outings.
- **Overall settlement:** Both scopes plus recorded member transfers (Settlements page — Overall table is read-only).
- **Settled (Kameti & American only):** Checkbox + confirmation records the payment as a member transfer and removes that row from the scope table.
- **Transfers:** Member-to-member payments on **Transactions** reduce overall balances; they are not restaurant expenses.
- **Recommendations:** Greedy minimum transfers (e.g. Ahmed pays Ali Rs 2,000; Bilal pays Ali Rs 1,000) from current net balances.
- **During Kameti:** You do not need to wait for the rotation to finish. **Settlements** and the Kameti pages show live balances from American outings, parcels, and transfers while turns are still in progress.
- **Whole Kameti settled:** On a rotation page, **Mark Kameti settled** sets `settlementsIncluded` to false for that rotation. All bills linked to its turns drop out of **Kameti**, **American**, and **Overall** settlement math; synced ledger rows for those bills are cleared. Use **Include in settlements again** to reopen. Single outings can still be excluded via the outing form checkbox.

## Accounting rules (default)

- **Expense-based mode (default):** Only American outings, parcels, manual transfers, and adjustments affect settlement balances. Kameti shared bills are recorded for history but do **not** create group liabilities.
- **Combined mode:** Kameti host shared bills also allocate to the host for settlement (enable in Settings, then re-save completed Kameti outings if needed).
- **Parcels:** Always personal to the person who ordered; never included in the shared bill split.
- **Kameti turns:** Marked complete only via the Kameti page — not when an outing is completed.
- **Amounts:** Stored as integer paisa (1 PKR = 100 paisa).

## Backup & restore

```bash
mongodump --uri="mongodb://127.0.0.1:27017/kameti_tracker" --out=./backup
mongorestore --uri="mongodb://127.0.0.1:27017/kameti_tracker" --drop ./backup/kameti_tracker
```

## Ongoing Kameti & past bills

1. **Kameti → New Kameti** (`/kameti/new`): Select members in treat order, mark who already hosted (optional amount), save rotation.
2. **Kameti → open rotation → Bill / Edit bill** on a turn: Opens the treat bill form with turn, host, and week **already set** from that turn. If that turn already has a saved bill, **Bill** goes to **edit** (`/outings/[id]`) instead of creating a duplicate. The host is always the member whose turn it is — the same person.
3. **Add Kameti bill UI rules** (do not break):
   - Show Kameti name, week, and host in the **banner at the top** only.
   - **Do not** show “Kameti turn” or “Host” dropdowns under **Bill, split & parcels** for this flow.
   - Payment system is locked to **Kameti**; user enters venue, date, shared bill, attendance, parcels, then **Save bill**.
4. **Mark turn done** on the Kameti rotation page when the group confirms the treat (separate from saving the bill outing).
5. **American outings** (separate from Kameti): Outings → **Add outing** → type **Outing (American split)**. Chargeable members, payer, and guest “Pays share” live only in `american-outing-fields.jsx`. Status **Completed** when recording history. Parcels stay personal; shared bill uses chargeable members.
6. **Do not** mix American split UI into Kameti treat bills; Kameti uses host-paid shared bill only (from the rotation **Bill** link).

## UX map (pages)

| Goal | Where |
|------|--------|
| List / open rotations | `/kameti` |
| One rotation (order, turns, Bill, Done) | `/kameti/[id]` |
| New rotation setup | `/kameti/new` |
| List / edit / delete outings | `/outings` — **pencil** = edit, **trash** = delete (confirmation) |
| Kameti treat bill for a turn | Kameti → **Bill** / **Edit bill** (new prefilled form or existing outing) |
| American or generic outing | `/outings/new` |
| Delete outing (edit screen) | `/outings/[id]` — sticky footer **Delete outing** (confirmation) |
| Transaction history & transfers | `/transactions` (sidebar) — **History** tab; delete manual rows with trash icon |
| Settlements (who pays whom) | `/settlements` |

## Limitations

- **Auth:** Admin credentials live in MongoDB (`AdminUser` collection, hashed password). `.env` only seeds the first admin; rotate secrets via `AUTH_SECRET` and by updating the admin document in DB.
- Interactive report filters are basic; use CSV export for full dumps.
- Kameti turn reorder API exists; drag-and-drop UI is minimal (turn numbers editable via API).
- Guest quick-create in UI is via outing form + `/api/guests`.
