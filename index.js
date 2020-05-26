const express = require("express");
const expressip = require("express-ip");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const PORT = process.env.PORT || 3000;
const ROOT_URL = process.env.ROOT_URL || `http://localhost:${PORT}`;

const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.static("public"));
app.use(express.json());
app.use(expressip().getIpInfoMiddleware);

pool.query(`
  CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    ip INET NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cart_additions (
    id SERIAL PRIMARY KEY,
    ip INET NOT NULL,
    price_id VARCHAR(256) NOT NULL,
    purchased BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS cart_removals (
    id SERIAL PRIMARY KEY,
    ip INET NOT NULL,
    price_id VARCHAR(256) NOT NULL
  );
  CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    ip INET NOT NULL,
    stripe_session_id VARCHAR(256) NOT NULL UNIQUE,
    customer VARCHAR(256) NOT NULL
  );
`);

app.post("/page_views", (req, res) => {
  const {
    ipInfo: { ip },
  } = req;
  pool.query(`INSERT INTO page_views (ip) VALUES ($1);`, [ip]);
  res.sendStatus(200);
});

app.post("/cart_additions", (req, res) => {
  const {
    ipInfo: { ip },
    body: { price_id },
  } = req;
  pool.query(`INSERT INTO cart_additions (ip, price_id) VALUES ($1, $2)`, [
    ip,
    price_id,
  ]);
  res.sendStatus(200);
});

app.post("/cart_removals", (req, res) => {
  const {
    ipInfo: { ip },
    body: { price_id },
  } = req;
  pool.query(`INSERT INTO cart_removals (ip, price_id) VALUES ($1, $2)`, [
    ip,
    price_id,
  ]);
  res.sendStatus(200);
});

app.post("/purchases", async (req, res) => {
  let status = 200;
  const {
    ipInfo: { ip },
    body: { session_id },
  } = req;
  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (!session) {
    status = 422;
  } else {
    const { email } = await stripe.customers.retrieve(session.customer);
    const { data: lineItems } = await stripe.checkout.sessions.listLineItems(
      session_id,
      {
        limit: 100,
      }
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO purchases (ip, stripe_session_id, customer) VALUES ($1, $2, $3);`,
        [ip, session_id, email]
      );
      lineItems.forEach(async (line) => {
        await client.query(
          `UPDATE cart_additions SET purchased = true WHERE id = (
            SELECT id from cart_additions WHERE ip = $1 AND price_id = $2 LIMIT $3
          );`,
          [ip, line.price.id, line.quantity]
        );
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      status = 422;
    } finally {
      client.release();
    }
  }
  res.sendStatus(status);
});

app.get("/products", async (req, res) => {
  const { data: products } = await stripe.products.list({ limit: 100 });
  const { data: prices } = await stripe.prices.list({ limit: 100 });
  products.forEach((product) => {
    product.price = prices.find((price) => price.product === product.id);
  });
  res.json(products);
});

app.post("/checkout", async (req, res) => {
  const { cartData } = req.body;
  const line_items = Object.keys(cartData).map((price) => ({
    price,
    quantity: cartData[price],
  }));
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: `${ROOT_URL}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: ROOT_URL,
  });
  res.json({ sessionId: session.id });
});

app.listen(PORT, console.log(`Server is listening on port ${PORT} 🚀`));
