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
- **Kameti settlement:** The **group treat** only — **total bill paid minus all parcel amounts**, split equally among members with **Pays share of bill** checked on the Kameti outing form. Attendance (present/absent) is for records; **Pays share** (default on) controls who is in that split (absent members can still pay if left checked).
- **American settlement:** American outings **plus** personal **parcels on Kameti nights** (who ordered owes who paid). Kameti shared treat is **not** duplicated here.
- **Overall settlement:** Both scopes plus recorded member transfers (Settlements page — Overall table is read-only).
- **Settled (Kameti & American only):** Checkbox + confirmation records the payment as a member transfer and removes that row from the scope table.
- **Transfers:** Member-to-member payments on **Transactions** reduce overall balances; they are not restaurant expenses.
- **Recommendations:** Greedy minimum transfers (e.g. Ahmed pays Ali Rs 2,000; Bilal pays Ali Rs 1,000) from current net balances. Rows are **netting** across **all** completed Kameti bills in the rotation, not one row per night per person.
- **“Total” on the Kameti table:** The sum of all **transfer line amounts** is **not** total restaurant spend or total Kameti split. It is only how much cash the matcher routes through listed payers. That sum **can go up or down** when you change **Pays share** on one bill (see below) even though treat totals in the ledger do not.
- **During Kameti:** You do not need to wait for the rotation to finish. **Settlements** and the Kameti pages show live balances from American outings, parcels, and transfers while turns are still in progress. Opening **Settlements** rebuilds the ledger from saved completed outings (no separate admin sync step).
- **Whole Kameti settled:** On a rotation page, **Mark Kameti settled** sets `settlementsIncluded` to false for that rotation. All bills linked to its turns drop out of **Kameti**, **American**, and **Overall** settlement math; synced ledger rows for those bills are cleared. Use **Include in settlements again** to reopen. Single outings can still be excluded via the outing form checkbox.

## Accounting rules (default)

- **Expense-based mode (default):** Only American outings, parcels, manual transfers, and adjustments affect settlement balances. Kameti shared bills are recorded for history but do **not** create group liabilities.
- **Combined mode:** Kameti host shared bills also allocate to the host for settlement (enable in Settings, then re-save completed Kameti outings if needed).
- **Parcels:** Always personal to the person who ordered. On **American** outings, the shared bill field is **only** the shared portion; parcels are **added** on top for what was spent. On **Kameti** outings, the bill field is the **full amount the host paid**, which **already includes** parcel amounts — parcels are listed separately for settlement only.
- **Kameti turns:** Marked complete only via the Kameti page — not when an outing is completed. Turn stats store **total bill paid** and **Kameti split** (total − parcels).
- **Self-paid parcel:** If **Ordered by** and **Paid by** are the same person, no parcel allocation or parcel payment is written (no paying yourself back).
- **Kameti host + parcels:** The host is credited once for the **full total bill**. Extra parcel payment lines are **not** created when **Paid by** is the host (already inside the total).
- **Amounts:** Stored as integer paisa (1 PKR = 100 paisa).

## Kameti treat bill (how amounts work)

| Field / UI | Meaning |
|------------|---------|
| **Total bill paid** (Kameti form) | Everything the host paid at the restaurant **including** all parcels |
| **Parcel lines** | Personal orders; amounts are **part of** the total, not extra on top |
| **Kameti split** | `total bill paid − sum(parcel amounts)` — split among members with **Pays share** checked |
| **Outings list — Bill** | Kameti: total paid; American: shared + parcels |
| **Outings list — Kameti split** | Kameti only: total − parcels; American outings show — |
| **Paid by (settlement)** on parcels | Who advanced cash for that parcel; defaults to the **turn host** on new parcel rows |

Ledger sync: `buildKametiAllocations` splits **Kameti split** only; parcel rows use American-style personal allocations. Parcel settlement scope is **American** (and **Overall**), not the Kameti treat table.

### Worked example (8 members)

**Setup:** Jamshed’s turn. He paid the full check. **8** people in Kameti; everyone has **Pays share** checked.

| Input | Value |
|-------|-------|
| Total bill paid | Rs 18,500 |
| Parcels (within that total) | Hafeez 820, Hammad 950, Jamshed 950, Saqib 950 |
| Parcel sum | Rs 3,670 |
| **Kameti split** | 18,500 − 3,670 = **Rs 14,830** |
| **Per-person treat share** (8 people) | 14,830 ÷ 8 = **Rs 1,853.75** each |

**Kameti settlement (the Rs 14,830):** Each of the 8 members is allocated **Rs 1,853.75** of treat share. Jamshed is credited **Rs 18,500** as the payer (one host payment).

**Parcel settlement (personal, American scope):**

| Ordered by | Parcel | Paid by | Effect |
|------------|--------|---------|--------|
| Hafeez | 820 | Jamshed | Hafeez owes **820** to Jamshed |
| Hammad | 950 | Jamshed | Hammad owes **950** to Jamshed |
| Saqib | 950 | Jamshed | Saqib owes **950** to Jamshed |
| Jamshed | 950 | Jamshed | **Skipped** (same person ordered and paid) |

No extra Rs 950 payment line for Jamshed’s own parcel — it is already inside the Rs 18,500.

**Rough “owes Jamshed” picture** (before netting transfers in the UI):

| Person | Treat share | + Parcel to Jamshed | ≈ Total |
|--------|-------------|---------------------|---------|
| Hafeez | 1,853.75 | 820 | 2,673.75 |
| Hammad | 1,853.75 | 950 | 2,803.75 |
| Saqib | 1,853.75 | 950 | 2,803.75 |
| Each other member (×4) | 1,853.75 | — | 1,853.75 |
| Jamshed | 1,853.75 (own share) | — | Host; paid 18,500 |

The **Settlements** page consolidates these into recommended member-to-member transfers.

### Pays share on vs off (one bill)

**Pays share** applies **per Kameti outing** (per turn’s saved bill), not to the whole rotation at once. **Present/absent** is informational; only **Pays share** decides who gets a **treat** slice on that night.

Example: Jamshed’s bill above (**Kameti split Rs 14,830**).

| Umar — Pays share on Jamshed night | Umar — Pays share **off** on Jamshed night only |
|-----------------------------------|--------------------------------------------------|
| 8 people in split → **Rs 1,853.75** each | 7 people in split → **~Rs 2,118.57** each (14,830 ÷ 7) |
| Umar owes **Rs 1,853.75** treat on that night | Umar owes **Rs 0** treat on that night |

Weeks 1 and 2 are unchanged. Each remaining payer’s **total treat debt** goes up by about **Rs 265** on that scenario (Umar’s **Rs 1,853.75** redistributed across the other seven).

**Why two settlement tables can show different line totals** (e.g. **Rs 38,331** vs **Rs 39,655**):

- Underlying **treat math** for the group is the same; **host credits** (full bills paid) are unchanged.
- Unchecking one person’s **Pays share** removes their treat slice on **that** bill and spreads it over everyone still checked.
- Only members who are **net debtors** after host credits appear as **payers** in the table (often five people in an 8-person rotation). Each of those payers may owe **~Rs 265 more** per line → sum of lines rises by roughly **5 × 265 ≈ Rs 1,324** in a typical case.
- **Payees change** too (greedy matcher): e.g. Mustafa might pay Hammad **and** Umar instead of a single line to Hammad, because **Umar is still a creditor** for **his own host week** — turning off Pays share on Jamshed’s bill does **not** remove Umar as host.

**Kameti rotation page:** For each saved bill, **What each person pays** shows treat share, personal parcel (if any), and total for that night using the same rules as the ledger.

After editing a bill, **Save bill**; then open **Settlements** or **Kameti** again (client cache is invalidated on save). To verify ledger math against MongoDB: `npm test -- src/lib/accounting/verify-db-ledger.test.js` (requires `MONGODB_URI`).

## API & backend security

- **Rate limits** (middleware): stricter on `/api/auth/*`, general cap on other `/api/*` per IP.
- **JSON bodies:** size limit, object-only JSON, rejection of `$` operator keys in bodies.
- **Query/route params:** ObjectIds and enums validated on list filters and `[id]` routes.
- **CSV export:** `/api/reports/export` is **admin-only**; export `type` is enum-validated.
- **Response headers:** security headers on JSON and CSV responses.
- **MongoDB:** user-facing filters are validated in API routes; global `sanitizeFilter` is off so legitimate `$in` / `$ne` queries in app code are not broken.

## Kameti bill form UX (recent behaviour)

- Opening **Bill** from a turn passes `hostMemberName` (and turn fields) in the URL; **Total bill paid** prefills from the turn when set.
- **Pays share of bill** checkbox per member (Kameti only), default **on**; unchecked excludes that member from the treat split.
- **Add parcel** defaults **Paid by (settlement)** to the **turn host**.
- Member attendance grid waits until client mount to avoid hydration mismatch when member lists load from cache.

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
   - Payment system is locked to **Kameti**; user enters venue, date, **total bill paid**, attendance (**Pays share** per member), parcels, then **Save bill**.
4. **Mark turn done** on the Kameti rotation page when the group confirms the treat (separate from saving the bill outing).
5. **American outings** (separate from Kameti): Outings → **Add outing** → type **Outing (American split)**. Chargeable members, payer, and guest “Pays share” live only in `american-outing-fields.jsx`. Status **Completed** when recording history. Parcels stay personal; shared bill uses chargeable members.
6. **Do not** mix American split UI into Kameti treat bills; Kameti uses **total bill paid** (host) plus optional parcel lines (from the rotation **Bill** link).

## Quality checks

```bash
npm run check   # lint + test + build
```

## UX map (pages)

| Goal | Where |
|------|--------|
| List / open rotations | `/kameti` |
| One rotation (order, turns, per-person pay, Bill, Done) | `/kameti/[id]` |
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
