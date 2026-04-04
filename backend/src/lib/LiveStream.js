// SSE (Server-Sent Events) Manager
// Supports multiple simultaneous clients per user (e.g. extension background + web app).
//
// STALE CONNECTION STRATEGY:
// The original duplication bug was caused by stale connections accumulating in the Set
// (e.g. Chrome service worker restarts without closing the old TCP connection).
// Fix: a 25s heartbeat comment ping. Any connection that fails the write is immediately
// evicted from the Set. This guarantees stale conns are cleaned up within one heartbeat
// cycle without calling .end() (which triggers EventSource's auto-reconnect storm).

const clients = new Map(); // Map<userId, Set<res>>

// ── Heartbeat ──────────────────────────────────────────────────────────────────
// Sends an SSE comment `:ping` every 25s to all connections.
// A write failure means the connection is dead → evict it immediately.
const HEARTBEAT_INTERVAL_MS = 25_000;

setInterval(() => {
    clients.forEach((set, userId) => {
        set.forEach(res => {
            try {
                res.write(': ping\n\n');
            } catch (_) {
                // Dead connection — evict
                set.delete(res);
                if (set.size === 0) clients.delete(userId);
                console.log(`[SSE] Heartbeat evicted dead connection for user ${userId}`);
            }
        });
    });
}, HEARTBEAT_INTERVAL_MS);

// ── Client Registration ────────────────────────────────────────────────────────
function addClient(userId, res) {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);

    res.on('close', () => {
        const set = clients.get(userId);
        if (set) {
            set.delete(res);
            if (set.size === 0) clients.delete(userId);
        }
        console.log(`[SSE] Client disconnected. User ${userId} — active streams: ${clients.get(userId)?.size ?? 0}`);
    });

    console.log(`[SSE] Client connected. User ${userId} — active streams: ${clients.get(userId).size}`);
}

// ── Broadcast to all connections for a user ────────────────────────────────────
function broadcast(userId, type, payload) {
    const set = clients.get(userId);
    if (!set || set.size === 0) return;

    const dataBuffer = `data: ${JSON.stringify({ type, ...payload })}\n\n`;

    set.forEach(res => {
        try {
            res.write(dataBuffer);
        } catch (_) {
            // Dead connection — evict immediately rather than waiting for heartbeat
            set.delete(res);
            if (set.size === 0) clients.delete(userId);
        }
    });
}

// ── Global broadcast (all users) ──────────────────────────────────────────────
function broadcastAll(type, payload) {
    const dataBuffer = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
    clients.forEach((set, userId) => {
        set.forEach(res => {
            try {
                res.write(dataBuffer);
            } catch (_) {
                set.delete(res);
                if (set.size === 0) clients.delete(userId);
            }
        });
    });
}

module.exports = { addClient, broadcast, broadcastAll };
