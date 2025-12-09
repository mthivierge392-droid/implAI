# Stripe Quick Start - Single Product with Quantity

This is a simplified guide for your single-product setup where customers can adjust quantity to get more minutes.

## 🎯 Your Setup

**One product only:** 100 Minutes

Customers adjust the quantity at checkout to buy more:
- Quantity 1 = 100 minutes
- Quantity 3 = 300 minutes
- Quantity 10 = 1,000 minutes

## ⚡ Quick Setup (5 Minutes)

### 1. Get Stripe Secret Key
```env
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_your_key_here
```
Get from: [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API Keys

---

### 2. Create Product in Stripe
1. Stripe Dashboard → Products → **+ Add product**
2. Name: "100 Minutes"
3. Price: $10 (or your price)
4. Billing: **One-time**
5. ✅ **Enable "Adjustable quantity"**
6. Copy the **Price ID** (starts with `price_...`)

---

### 3. Create Payment Link
1. Stripe Dashboard → Payment links → **+ New**
2. Select your "100 Minutes" product
3. ✅ Ensure "Allow customers to adjust quantity" is checked
4. Create link and copy the URL

```env
# Add to .env.local
NEXT_PUBLIC_STRIPE_PAYMENT_LINK="https://buy.stripe.com/your-link-here"
```

---

### 4. Configure Price ID

Edit `lib/stripe-config.ts`:

```typescript
export const MINUTE_PACKAGES: Record<string, number> = {
  'price_1YourActualPriceID': 100,  // Replace with your Price ID
};
```

---

### 5. Set Up Webhook

1. Deploy your app (or use ngrok for testing)
2. Stripe Dashboard → Developers → Webhooks → **+ Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select event: **checkout.session.completed**
5. Copy the **Signing secret** (starts with `whsec_...`)

```env
# Add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## ✅ Done!

When a customer purchases:
1. They see your payment link
2. They adjust quantity (1, 2, 3, 10, etc.)
3. They complete payment
4. **Webhook automatically adds:** `quantity × 100` minutes to their account

## 🧪 Test It

Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Any future expiry, any CVC
- Buy quantity 3 → Customer gets 300 minutes ✅

Check server logs for:
```
✅ Webhook event received: checkout.session.completed
📦 Item: 100 Minutes × 3 = 300 minutes
✅ Successfully added 300 minutes to customer@example.com
```

---

## 📊 Example Scenarios

| Quantity | Minutes Added | Total Cost |
|----------|--------------|------------|
| 1        | 100          | $10        |
| 2        | 200          | $20        |
| 5        | 500          | $50        |
| 10       | 1,000        | $100       |
| 50       | 5,000        | $500       |

The webhook handles all the math automatically! 🎉
