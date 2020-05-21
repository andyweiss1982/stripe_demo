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

const displayCart = () => {
  const lineItems = Object.keys(cartData).map((priceId) => {
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
  });
  dialog.innerHTML = `
    <ul>${lineItems.join("") || `<li>Nothing in cart</li>`}</ul>
    <button onclick="checkout()" ${
      !lineItems.length ? "disabled" : ""
    }>Checkout</button>
  `;
  dialog.setAttribute("open", true);
};

const toggleCart = () => {
  if (dialog.hasAttribute("open")) {
    dialog.removeAttribute("open");
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
