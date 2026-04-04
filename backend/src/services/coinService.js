const { query, getClient } = require('../lib/db');

/**
 * Atomically deduct coins using a pg transaction with row-level locking.
 * Prevents race conditions when concurrent requests hit the same wallet.
 */
const deductCoins = async (userId, amount, description, referenceId = null) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Lock the wallet row — no other transaction can read/write this row until COMMIT
        const { rows } = await client.query(
            'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE',
            [userId]
        );

        if (rows.length === 0) throw new Error('WALLET_NOT_FOUND');

        const currentBalance = rows[0].balance;
        if (currentBalance < amount) {
            throw new Error(`INSUFFICIENT_COINS — balance: ${currentBalance}, required: ${amount}`);
        }

        const newBalance = currentBalance - amount;

        await client.query(
            `UPDATE wallets
       SET balance = $1, lifetime_spent = lifetime_spent + $2, updated_at = NOW()
       WHERE user_id = $3`,
            [newBalance, amount, userId]
        );

        await client.query(
            `INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id, status)
       VALUES ($1, 'deduction', $2, $3, $4, $5, 'completed')`,
            [userId, -amount, newBalance, description, referenceId]
        );

        await client.query('COMMIT');
        return { success: true, new_balance: newBalance, deducted: amount };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Credit coins to a wallet (purchase, bonus, refund).
 */
const creditCoins = async (userId, amount, type, description, referenceId = null) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `UPDATE wallets
       SET balance = balance + $1,
           lifetime_earned = lifetime_earned + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance`,
            [amount, userId]
        );

        if (rows.length === 0) throw new Error('WALLET_NOT_FOUND');

        const newBalance = rows[0].balance;

        await client.query(
            `INSERT INTO coin_transactions (user_id, type, amount, balance_after, description, reference_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'completed')`,
            [userId, type, amount, newBalance, description, referenceId]
        );

        await client.query('COMMIT');
        return { success: true, new_balance: newBalance, credited: amount };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Fetch wallet balance and stats.
 */
const getWallet = async (userId) => {
    const { rows } = await query(
        'SELECT balance, lifetime_earned, lifetime_spent, updated_at FROM wallets WHERE user_id = $1',
        [userId]
    );
    if (rows.length === 0) throw new Error('WALLET_NOT_FOUND');
    return rows[0];
};

module.exports = { deductCoins, creditCoins, getWallet };
