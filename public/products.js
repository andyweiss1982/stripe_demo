const stripe = Stripe("pk_test_YtG1b7dQjK7u6eIT630S6Mcf009QCxmK9t");

const renderProduct = (product) => `
  <section class="product">
    <h2>${product.name}</h2>
    <img alt="${product.name}" src="${product.images[0]}"/>
    <button onclick="checkout('${product.price.id}')">
      Buy Now $${(product.price.unit_amount / 100).toFixed(2)}
    </button>
  </section>
`;

const fetchProducts = async () => {
  const response = await fetch("/products");
  const products = await response.json();
  main.innerHTML = products.map((product) => renderProduct(product)).join("");
};

const checkout = async (priceId) => {
  const response = await fetch(`/checkout/${priceId}`);
  const { sessionId } = await response.json();
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) alert(error.message);
};

const confirmPurchase = () => {
  const sessionId = new URLSearchParams(window.location.search).get(
    "session_id"
  );
  if (sessionId) {
    document.querySelector('[role="status"]').innerHTML = `
      <div id="confirmation">
        Your purchase was successful!  A receipt will be sent to your email address.
      </div> `;
  }
};

fetchProducts();
confirmPurchase();
heading.addEventListener("click", () => (window.location = "/"));
