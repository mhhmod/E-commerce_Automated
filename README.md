# GrindCTRL Vanilla Storefront

Static e‑commerce storefront implemented with plain **HTML + CSS + JavaScript**. No build step required. Data-driven catalog via `products.json`. Cart and wishlist persist in `localStorage`. Checkout and post‑purchase flows integrate with your automation backend via configurable webhooks.

## Contents
- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Data Model](#data-model)
- [Checkout and Webhooks](#checkout-and-webhooks)
- [Returns / Exchanges](#returns--exchanges)
- [Deployment](#deployment)
- [Notes](#notes)

## Overview
This project renders a small catalog from `products.json`, supports category filtering and featured items, and implements a full client‑side cart and wishlist. Orders are serialized to JSON and sent to a webhook. Return and exchange requests follow the same pattern.

## Features
- Product grid from `products.json` with images, colors, sizes.
- Category filter and featured flag.
- Cart with quantity updates and removal.
- Wishlist with persistence.
- LocalStorage persistence for cart and wishlist.
- Lightweight animations and lazy loading.
- Resilient webhook delivery with multiple strategies.
- SEO: meta tags and JSON‑LD in `index.html`.

## Project Structure
```
/index.html        # App shell, sections, SEO tags, JSON-LD
/styles.css        # Theme and responsive styles
/main.js           # State, rendering, cart, wishlist, checkout
/config.js         # Endpoints + feature flags
/products.json     # Catalog data
/components.json   # shadcn/ui schema (not required at runtime)
```
> Do not rename or move files. The app expects this flat structure.

## Quick Start

Option A: Python
```bash
# from the project directory
python3 -m http.server 5173
# open http://localhost:5173
```

Option B: Node
```bash
npm i -g http-server
http-server -p 5173
```

Option C: VS Code
- Install the “Live Server” extension.
- Right‑click `index.html` → **Open with Live Server**.

> Opening `index.html` directly via `file://` will block `fetch()` for `products.json` in many browsers. Use a local server as above.

## Configuration

Edit `config.js`. The following keys are present and can be customized:

- `WEBHOOK_URL`
- `RETURN_WEBHOOK_URL`
- `EXCHANGE_WEBHOOK_URL`
- `API_ENDPOINTS`
- `NEWSLETTER`
- `CONTACT`
- `SETTINGS`
- `CART_PERSISTENCE`
- `WISHLIST_PERSISTENCE`
- `ANIMATIONS_ENABLED`
- `LAZY_LOADING`

Typical meaning:
- `WEBHOOK_URL`: receives order JSON on checkout.
- `RETURN_WEBHOOK_URL`: receives return payloads.
- `EXCHANGE_WEBHOOK_URL`: receives exchange payloads.
- `API_ENDPOINTS`: optional endpoints for newsletter/contact.
- `SETTINGS`: UI/UX flags like persistence and animations.

Never put secrets in `config.js`. This runs on the client.

## Data Model

`products.json` shape (representative sample):
```json
{
  "id": "luxury-cropped-black-tee",
  "name": "Luxury Cropped Black T-Shirt",
  "description": "Premium cotton blend with perfect fit. Minimalist design meets maximum impact.",
  "price": 300.0,
  "originalPrice": 350.0,
  "category": "tshirts",
  "featured": true,
  "images": [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800"
  ],
  "colors": [
    {
      "name": "Black",
      "value": "#000000"
    },
    {
      "name": "White",
      "value": "#FFFFFF"
    },
    {
      "name": "Gray",
      "value": "#6B7280"
    }
  ],
  "sizes": [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL"
  ],
  "inStock": true,
  "rating": 4.9,
  "reviewCount": 127,
  "tags": [
    "HOT",
    "BESTSELLER"
  ]
}
```
Required fields per product: `id`, `name`, `price`, `category`. Others are optional but recommended.

## Checkout and Webhooks

The checkout flow composes an order object and tries multiple delivery strategies to `WEBHOOK_URL` to maximize success in CORS‑restricted environments. The code references keys like: `orderId`, `name`, `phone`, `email`, `address`, `city`, `items`, `sku`, `price`, `quantity`, `subtotal`, `shipping`, `total`, `payment`.

**Representative payload example** (confirm against `main.js` implementation in `prepareOrderData()`):
```json
{
  "orderId": "GC-XXXXXX",
  "customer": {
    "name": "John Doe",
    "phone": "01000000000",
    "email": "john@example.com"
  },
  "address": {
    "city": "Giza"
  },
  "items": [
    {
      "sku": "luxury-cropped-black-tee",
      "name": "Luxury Cropped Black T‑Shirt",
      "price": 300.0,
      "quantity": 1
    }
  ],
  "subtotal": 300.0,
  "shipping": 0.0,
  "total": 300.0,
  "payment": "Cash on Delivery"
}
```
Your webhook handler should accept `application/json` and store or forward the order.

## Returns / Exchanges

Return and exchange requests are sent to `RETURN_WEBHOOK_URL` and `EXCHANGE_WEBHOOK_URL`. The project uses the same resilient delivery strategies as checkout. Validate and sanitize all input server‑side.

## Deployment

This is a static site. Any static host works:

- **Netlify**: drag‑and‑drop the folder or connect the repo.
- **Vercel**: import the repo, framework = “Other”, output = `/`.
- **GitHub Pages**: push the files and enable Pages.
- **Nginx/Apache/S3**: upload files as‑is.

## Notes
- No secrets on the client.
- Keep `products.json` small for fast first paint.
- Image assets should be optimized and CDN‑served.
- If you need i18n, use separate product files per locale and switch by config.

---

Owner: GrindCTRL
Status: Release‑ready
