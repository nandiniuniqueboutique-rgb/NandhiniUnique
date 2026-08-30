# Nandini Unique — Saree E-Commerce Platform

A full e-commerce site built specifically for a saree business, with a customer-facing store
and an owner/admin panel to manage products, orders, offers and support queries.

## What's included

**Customer side**
- Browse sarees **and dresses** by type, search, filter by price and by type/fabric (typed freely, not a fixed list)
- **Quick Order button right on every product photo/card** — pick a size and quantity and buy immediately without opening the full detail page (still available too, with the full gallery/description)
- Product page with photo gallery, colour/fabric/other details, and size options where the
  **price changes per size exactly the way the seller has configured it** — sarees can use "Free Size", dresses can use S/M/L/XL, or anything else the seller types in
- Cart, checkout with shipping address, and a manual UPI/Bank-transfer payment flow where the
  customer enters their **Transaction ID / UTR number**, which the owner verifies
- Order tracking: logged-in "My Orders" page, plus a no-login "Track Order" page (order ID + phone)
- Offers page showing active discounts/coupons the owner has published
- Contact page to raise **queries/complaints**, reachable by email or WhatsApp
- A floating WhatsApp button and one-tap "Ask about this order/saree" links throughout

**Owner / admin side** (`/admin`)
- Dashboard with quick stats (orders, revenue, open queries, live listings)
- Add/edit sarees **or dresses**: multiple photos, colour, fabric, a **Product Type** (Saree/Dress/Other),
  and a **free-text "type" field the seller types themselves** (e.g. "Kanjivaram", "Tussar",
  "Anarkali", "Party Wear Gown") instead of being limited to a fixed list — with autocomplete
  suggestions from what's already been typed. Plus free-form "other details" (work type, occasion,
  blouse included, etc.), base price, discount %, and a **size list where you set exactly how much
  extra each size costs** (e.g. "Free Size" = base price, "L" = +₹100, "With Stitched Blouse" =
  +₹600) plus per-size stock. Edit any of this later when new stock arrives — nothing needs to be
  re-uploaded from scratch.
- Orders: see every order, verify payment (UTR/transaction ID), update order status
  (Placed → Confirmed → Packed → Shipped → Out for Delivery → Delivered), add a tracking note —
  every update **emails the customer and messages them on WhatsApp** automatically
- Offers: create/edit discounts and coupon codes, target everything or one specific type/category
- Queries & Complaints inbox: reply by email (auto-sent) or jump straight into WhatsApp

## Tech used (and why)

- **MongoDB** — chosen because sarees have very unstructured, variable attributes (one saree
  might need "work type" and "blouse included", another needs "border style" and "wash care") —
  a flexible document database fits this much better than a rigid set of spreadsheet-style
  columns. `Product.attributes` is a free-form field for exactly this reason.
- **Node.js + Express** — the API server.
- **Plain HTML/CSS/JavaScript** on the frontend (no build step) — so you can open it, edit it,
  and run it with nothing more than a browser and a simple static file server.
- **Nodemailer** for email, and a **WhatsApp "click-to-chat" link** by default for WhatsApp
  contact/updates (no signup needed) with an **optional Twilio integration** if you want status
  updates to send automatically without the owner tapping a link — see
  `backend/.env.example` for details.
- Payments use a manual **UPI / Bank Transfer + UTR verification** flow to start (very common for
  small Indian businesses), with notes in `backend/routes/orderRoutes.js` on where to plug in
  Razorpay later for instant online payments.

## Project structure

```
nandini-unique/
  backend/            Node/Express API + MongoDB models
    models/           User, Product, Order, Offer, Complaint
    routes/           auth, products, orders, offers, complaints, admin stats
    utils/            email.js, whatsapp.js
    uploads/           saree photos get stored here
    seed.js           creates a default admin login + sample sarees
    server.js
  frontend/           the actual website (no build tools needed)
    index.html, shop.html, product.html, cart.html, checkout.html, ...
    admin/            the owner's dashboard pages
    css/style.css
    js/api.js         all API calls + cart/session logic
```

---

## How to run it on your computer (localhost)

### 1. Install prerequisites (one-time)

- **Node.js** (v18 or newer) — https://nodejs.org
- **MongoDB Community Server** — https://www.mongodb.com/try/download/community
  - Easiest alternative if you don't want to install MongoDB locally: create a free
    **MongoDB Atlas** cluster (https://www.mongodb.com/atlas) and use its connection string instead.

Start MongoDB locally (skip this if you're using Atlas):
```bash
mongod
```
(On Windows this usually runs automatically as a service after install; on Mac, `brew services start mongodb-community`.)

### 2. Set up the backend

```bash
cd nandini-unique/backend
npm install
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Open `.env` and check:
- `MONGO_URI` — leave as-is for a local MongoDB, or paste your Atlas connection string
- `STORE_WHATSAPP_NUMBER` — your business WhatsApp number with country code, no `+` or spaces (e.g. `919876543210`)
- (Optional for now) `SMTP_USER` / `SMTP_PASS` — fill in later if you want real emails to send;
  without it, the app just logs emails to the terminal instead of sending them, so everything
  else still works while you're testing.

Create the default admin login and a few sample sarees:
```bash
npm run seed
```
This prints something like:
```
Created admin login -> email: owner@nandiniunique.com / password: Nandini@123
```
**Change this password after your first login** (or edit `backend/seed.js` before seeding).

Start the API server:
```bash
npm start
```
You should see: `Nandini Unique API running on http://localhost:5000`
Leave this terminal window open.

### 3. Set up the frontend

The frontend is plain HTML/CSS/JS, so it just needs to be served as static files (opening the
`.html` files directly by double-clicking also mostly works, but a tiny local server avoids
occasional browser quirks). Open a **second terminal window**:

```bash
cd nandini-unique/frontend
npx serve -l 5500
```
*(`npx serve` needs no separate install — it downloads a tiny static server on first run. Python
users can instead run `python -m http.server 5500`.)*

Then open your browser to:
- **Storefront:** http://localhost:5500
- **Owner/Admin panel:** http://localhost:5500/admin/login.html

Log in to the admin panel with the seeded credentials above, add a few real sarees with photos,
and browse the storefront to see them appear.

> The frontend talks to the API at `http://localhost:5000/api` — this is set in
> `frontend/js/api.js` (`API_BASE`). If you ever run the backend on a different port, update it there.

### 4. Try the full flow

1. As admin: add a saree with a couple of photos, set sizes/prices, save.
2. As a customer: register an account on the storefront, add that saree to cart, check out
   (choose UPI, type any test reference number as the "Transaction ID").
3. As admin: open Orders → Manage → verify the payment → update status to "Confirmed", "Shipped",
   etc. Each update sends an email (or logs it to the backend terminal if SMTP isn't configured)
   and gives you a WhatsApp link to notify the customer with one tap.
4. As the customer: check "My Orders" or the public "Track Order" page to see the status update.

---

## Turning on real WhatsApp & email

- **Email:** in `backend/.env`, set `SMTP_USER`/`SMTP_PASS` to a real mailbox. For Gmail, turn on
  2-Step Verification and create an **App Password** (Google Account → Security → App Passwords) —
  use that as `SMTP_PASS`, not your normal Gmail password.
- **WhatsApp (automatic sending):** by default the app uses free "click to chat" WhatsApp links —
  no signup needed, but the owner taps a button to send each update. To make status updates send
  **automatically**, sign up for the Twilio WhatsApp Sandbox/API (free to start), then:
  ```bash
  cd backend
  npm install twilio
  ```
  and fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` in `.env`.

## Adding real online payments later

Right now customers pay by UPI/bank transfer and type in their transaction ID, which you verify
manually — simple and works from day one with no paperwork. When you're ready for instant card/UPI
checkout, sign up with **Razorpay** (or a similar Indian payment gateway), add their Checkout
script to `checkout.html`, and verify the payment signature server-side in
`backend/routes/orderRoutes.js` (there's a comment marking exactly where). Fields for
`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are already reserved in `.env.example`.

## Deploying beyond localhost (when you're ready)

When your customer is happy with it and wants it live on the internet:
1. **Backend:** deploy to a Node host (Render, Railway, a VPS, etc.) and point `MONGO_URI` at a
   MongoDB Atlas cluster (works from anywhere, not just your PC).
2. **Frontend:** deploy the `frontend/` folder to any static host (Netlify, Vercel, GitHub Pages,
   or the same server as the backend) and update `API_BASE` in `frontend/js/api.js` to your
   backend's live URL.
3. Buy a domain, connect it, and add HTTPS (most hosts above do this automatically).

Happy to help with any of this when you're ready — just say the word.
