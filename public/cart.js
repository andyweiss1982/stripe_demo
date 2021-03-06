const stripe = Stripe("pk_test_YtG1b7dQjK7u6eIT630S6Mcf009QCxmK9t");

const cartData = {};

const addToCart = (priceId) => {
  cartData[priceId] ? cartData[priceId]++ : (cartData[priceId] = 1);
  displayCart();
};

const removeFromCart = (priceId) => {
  cartData[priceId] > 1 ? cartData[priceId]-- : delete cartData[priceId];
  displayCart();
};

const renderLineItem = (priceId) => {
  const product = products.find((product) => product.price.id === priceId);
  return `
  <li>
    <span class="cart-entry">
      ${product.name}: ${cartData[priceId]} 
    </span>
    <span class="cart-buttons"> 
      <button onclick="addToCart('${priceId}')">+</button> 
      <button onclick="removeFromCart('${priceId}')">-</button>
    </span>
  </li>`;
};

const displayCart = () => {
  const lineItems = Object.keys(cartData)
    .map((priceId) => renderLineItem(priceId))
    .join("");
  dialog.innerHTML = `
    <ul>${lineItems || `<li>Nothing in cart</li>`}</ul>
    <button onclick="checkout()" ${
      !lineItems ? "disabled" : ""
    }>Checkout</button>
  `;
  dialog.setAttribute("open", true);
};

const hideCart = () => dialog.removeAttribute("open");

const toggleCart = () => {
  if (dialog.hasAttribute("open")) {
    hideCart();
  } else {
    displayCart();
  }
};

const checkout = async () => {
  const response = await fetch("/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartData }),
  });
  const { sessionId } = await response.json();
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) alert(error.message);
};
