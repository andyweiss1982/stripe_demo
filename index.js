const express = require("express");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const PORT = process.env.PORT || 3000;
const ROOT_URL = process.env.ROOT_URL || `http://localhost:${PORT}`;

const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.static("public"));

app.get("/products", async (req, res) => {
  const { data: products } = await stripe.products.list({ limit: 100 });
  const { data: prices } = await stripe.prices.list({ limit: 100 });
  products.forEach((product) => {
    product.price = prices.find((price) => price.product === product.id);
  });
  res.json(products);
});

app.get("/checkout/:id", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: req.params.id, quantity: 1 }],
    mode: "payment",
    success_url: `${ROOT_URL}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: ROOT_URL,
  });
  res.json({ sessionId: session.id });
});

app.listen(PORT, console.log(`Server is listening on port ${PORT} 🚀`));
