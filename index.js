require("dotenv").config(); // Load environment variables

const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.json());

// PostgreSQL connection using DATABASE_URL from .env
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Needed for hosted services like Neon
    },
});

db.connect()
    .then(() => console.log("✅ Connected to PostgreSQL"))
    .catch((err) => console.error("❌ PostgreSQL connection error:", err));

// Create a new payment
app.post("/payments", async (req, res) => {
    const { amount, currency, description } = req.body;
    if (!amount || !currency) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const result = await db.query(
            `INSERT INTO payments (amount, currency, description) VALUES ($1, $2, $3) RETURNING id`,
            [amount, currency, description || ""]
        );
        const id = result.rows[0].id;
        res.status(201).json({ id, amount, currency, description, status: "pending" });
    } catch (err) {
        console.error("❌ Insert error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get a payment by ID
app.get("/payments/:id", async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM payments WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Payment not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ Fetch error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// Complete a payment
app.post("/payments/:id/complete", async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE payments SET status = 'completed' WHERE id = $1`,
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Payment not found" });
        }
        res.json({ message: "Payment marked as completed" });
    } catch (err) {
        console.error("❌ Update error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API running at http://localhost:${PORT}`);
});
