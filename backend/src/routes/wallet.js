const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { getWallet, creditCoins } = require('../services/coinService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// GET /wallet
router.get('/', async (req, res) => {
    try {
        const wallet = await getWallet(req.user.id);
        const { rows: transactions } = await query(
            `SELECT id, type, amount, balance_after, description, reference_id, status, created_at
       FROM coin_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
            [req.user.id]
        );
        res.json({ wallet, transactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /wallet/purchase
router.post('/purchase', async (req, res) => {
    const COIN_PACKAGES = {
        starter: { coins: 100, price: 199, label: '100 Coins' },
        pro: { coins: 500, price: 799, label: '500 Coins' },
        elite: { coins: 1500, price: 1999, label: '1500 Coins' },
    };
    const { packageId } = req.body;
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: 'INVALID_PACKAGE' });

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'usd', product_data: { name: `SPECTAGLINT — ${pkg.label}` }, unit_amount: pkg.price }, quantity: 1 }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/wallet?success=1`,
            cancel_url: `${process.env.FRONTEND_URL}/wallet?cancelled=1`,
            metadata: { userId: req.user.id, coins: pkg.coins, packageId }
        });
        res.json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /wallet/webhook  (raw body, no auth — mounted separately)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).json({ error: `WEBHOOK_SIG_FAILED: ${err.message}` });
    }
    if (event.type === 'checkout.session.completed') {
        const { userId, coins, packageId } = event.data.object.metadata;
        try {
            await creditCoins(userId, parseInt(coins), 'purchase', `COIN_PURCHASE — ${packageId}`, event.data.object.payment_intent);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    res.json({ received: true });
});

module.exports = router;
