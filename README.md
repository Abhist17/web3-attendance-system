# Web3 Attendance System

Classroom attendance that resists proxy check-ins. A lecturer projects a QR code
that rotates every 60 seconds; students scan it, and each verified check-in is
written both to a local database and to Solana as its own account.

Deployed on devnet at
[`6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc`](https://explorer.solana.com/address/6p26MgeSFbR7UFdrsUU62sbNH8Zh1bY59ob8NmfdibBc?cluster=devnet).

## How proxy attendance is blocked

| Layer | What it stops |
| --- | --- |
| HMAC-signed QR payload | Hand-crafted or edited codes |
| 60-second expiry | A screenshot forwarded to an absent friend |
| Per-wallet nonce | Replaying a captured payload |
| Time window | Checking in before or after the lecture |
| Geofence | Marking attendance from outside the room |
| Device binding | A classmate checking you in from their phone |
| `init`-based PDA | Duplicate records — the account already exists |
| Wallet signature | Submitting on someone else's behalf |

The QR nonce is scoped **per wallet**, not globally: the code is broadcast to a
whole room, so a globally single-use nonce would let the first scanner lock
everyone else out. The nonce is also consumed in the same transaction as the
attendance insert, so a failed geofence or device check does not burn the code.

Device fingerprinting is a deterrent, not a security boundary — it is spoofable
by anyone willing to edit their user agent, and is only one of several checks.

## Layout

```
attendance/   Anchor workspace — the Solana program
backend/      Express + SQLite API: QR issuing and verification
frontend/     Next.js app (App Router, Tailwind v4, wallet adapter)
```

## Prerequisites

- Node.js 20+
- A Solana wallet browser extension (Phantom, Solflare, Backpack …) set to **devnet**
- Some devnet SOL in that wallet: `solana airdrop 2 <address> --url devnet`
- Only to rebuild the program: Rust, Solana CLI 2+, Anchor 0.32

## Running it

Both services must be running. Use two terminals.

**Backend**

```bash
cd backend
npm install
cp .env.example .env      # then edit QR_SECRET
npm run dev               # http://localhost:5000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

Check the API is alive with `curl http://localhost:5000/health`.

### Generate a real QR secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Anyone holding `QR_SECRET` can forge attendance codes. The server refuses to
start with `NODE_ENV=production` while it is still the example value.

## Using it

1. **Register** — connect a wallet, enter your student details. This signs one
   transaction creating your on-chain profile and binds the current browser as
   your attendance device.
2. **Professor** — create a lecture (another transaction), optionally capturing
   the classroom coordinates to enable the geofence. Project the QR panel; the
   roster updates live.
3. **Student** — scan the projected code. The app takes your location, signs the
   on-chain record, then asks the backend to verify everything.

Each role needs a small amount of devnet SOL to cover transaction fees. On a
desktop without a camera, the student page has an "Enter code manually" fallback
that accepts the payload from `GET /api/qr/generate?lecture_id=…`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service status and active configuration |
| `POST` | `/api/student/register` | Create a student record |
| `GET` | `/api/student/:wallet` | Profile plus attendance history |
| `POST` | `/api/lecture/create` | Open a lecture |
| `GET` | `/api/lecture/list` | Lectures, optionally `?professor_wallet=` |
| `GET` | `/api/lecture/:id` | A single lecture |
| `GET` | `/api/qr/generate?lecture_id=` | Issue a signed, time-boxed QR code |
| `POST` | `/api/attendance/mark` | Run every check and record attendance |
| `GET` | `/api/attendance/list?lecture_id=` | Roster for a lecture |

## The program

Three instructions, all keyed by string identifiers so a lecture ID like
`CS101-W3` addresses its own account directly:

| Instruction | PDA seeds |
| --- | --- |
| `register_student` | `["student", wallet]` |
| `create_lecture` | `["lecture", lecture_id]` |
| `mark_attendance` | `["attendance", wallet, lecture_id]` |

Because PDA seeds are capped at 32 bytes, `lecture_id` and `student_id` are
limited to 32 characters; the backend enforces the same limit.

Rebuilding and redeploying:

```bash
cd attendance
anchor build
anchor deploy --provider.cluster devnet
cp target/idl/attendance.json ../frontend/lib/idl/attendance.json
cp target/types/attendance.ts  ../frontend/lib/idl/attendance.ts
```

If deploy fails with `invalid program argument`, the new binary outgrew its
allocated account — extend it first:

```bash
solana program extend <PROGRAM_ID> 50000 --url devnet
```

## Known limitations

- Anyone can call `POST /api/lecture/create`; there is no professor role or auth,
  so the API trusts whatever wallet the client claims. Adding signature-based
  auth is the obvious next step.
- Location comes from the browser's geolocation API, which a determined user can
  override with devtools or a mocking extension.
- SQLite is the source of truth for the UI; the chain holds the tamper-proof
  record. The two are written separately and can drift if the backend call fails
  after the transaction lands.
