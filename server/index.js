const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure DB directory exists
const DB_DIR = "/app/data";
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "cards.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", DB_PATH);
    // Initialize schema
    db.run(
      `CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )`,
      (createErr) => {
        if (createErr) {
          console.error("Failed to create tables:", createErr.message);
        } else {
          console.log("Database schema initialized successfully.");
        }
      }
    );
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" })); // profile pictures or custom svgs might be large

// 1. GET card by ID
app.get("/api/cards/:id", (req, res) => {
  const cardId = req.params.id;
  db.get("SELECT data FROM cards WHERE id = ?", [cardId], (err, row) => {
    if (err) {
      console.error(`Error reading card ${cardId}:`, err.message);
      return res.status(500).json({ error: "Failed to read database." });
    }
    if (!row) {
      return res.status(404).json({ error: "Card not found." });
    }
    try {
      const parsedData = JSON.parse(row.data);
      return res.json(parsedData);
    } catch (parseErr) {
      console.error(`Failed to parse json for card ${cardId}:`, parseErr.message);
      return res.status(500).json({ error: "Corrupted card database format." });
    }
  });
});

// 2. POST (Save or overwrite) card
app.post("/api/cards", (req, res) => {
  const newCard = req.body;
  if (!newCard || !newCard.id) {
    return res.status(400).json({ error: "Invalid card payload. 'id' is required." });
  }

  const cardId = newCard.id;

  // Retrieve existing card to verify password
  db.get("SELECT data FROM cards WHERE id = ?", [cardId], (err, row) => {
    if (err) {
      console.error(`Error querying card ${cardId}:`, err.message);
      return res.status(500).json({ error: "Database query failed." });
    }

    if (row) {
      try {
        const existingCard = JSON.parse(row.data);
        
        // If password protection is configured on the existing card, verify it
        if (existingCard.password) {
          // Compare SHA-256 password hash values (client-side hashed)
          if (existingCard.password !== newCard.password) {
            return res.status(403).json({ 
              error: "비밀번호가 일치하지 않습니다. 올바른 비밀번호를 입력해주세요." 
            });
          }
        }
      } catch (parseErr) {
        console.warn(`Corrupted data on card ${cardId}, overwriting...`);
      }
    }

    // Save or update the card
    const serializedData = JSON.stringify(newCard);
    db.run(
      "INSERT OR REPLACE INTO cards (id, data) VALUES (?, ?)",
      [cardId, serializedData],
      (saveErr) => {
        if (saveErr) {
          console.error(`Error saving card ${cardId}:`, saveErr.message);
          return res.status(500).json({ error: "Failed to save card to database." });
        }
        console.log(`Card saved successfully: ${cardId}`);
        return res.json({ success: true, id: cardId });
      }
    );
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", db: DB_PATH });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Unicard API Server listening on port ${PORT}`);
});
