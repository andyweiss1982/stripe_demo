let products = [];

const renderProduct = (product) => `
  <section class="product">
    <h2>${product.name}</h2>
    <img alt="${product.name}" src="${product.images[0]}"/>
    <button onclick="addToCart('${product.price.id}')">
      Add $${(product.price.unit_amount / 100).toFixed(2)}
    </button>
  </section>
`;

const fetchProducts = async () => {
  const response = await fetch("/products");
  products = await response.json();
  main.innerHTML = products.map((product) => renderProduct(product)).join("");
};

const confirmPurchase = async () => {
  const sessionId = new URLSearchParams(window.location.search).get(
    "session_id"
  );
  if (sessionId) {
    const response = await fetch("/purchases", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (response.ok) {
      document.querySelector('[role="status"]').innerHTML = `
        <div class="success">
          Your purchase was successful!  A receipt will be sent to your email address.
        </div> `;
    }
  }
};

fetchProducts();
confirmPurchase();
heading.addEventListener("click", () => (window.location = "/"));
