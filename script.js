let products = [];
let cart = [];

// DOM Elements
const grid = document.getElementById("sticker-grid");
const cartBtn = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
const cartModal = document.getElementById("cart-modal");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

// Modal/Slider Elements
const slider = document.getElementById("cart-slider");
const nextBtn = document.getElementById("go-to-info-btn");
const backBtn = document.getElementById("back-to-items");
const receiptUrlInput = document.getElementById("receipt-url-display");

// Preview Elements
const previewModal = document.getElementById("preview-modal");
const previewImg = document.getElementById("preview-img");
const previewTitle = document.getElementById("preview-title");
const previewPrice = document.getElementById("preview-price");
const previewAddBtn = document.getElementById("preview-add-btn");

// 1. LOAD PRODUCTS
fetch("./products.json")
    .then(r => r.json())
    .then(data => {
        products = data;
        renderProducts();
    })
    .catch(err => console.error("Error loading products:", err));

// 2. RENDER PRODUCTS
function renderProducts() {
    grid.innerHTML = "";
    products.forEach(p => {
        grid.innerHTML += `
        <div class="sticker-card" onclick="openPreview(${p.id})">
            <img src="${p.image}">
            <h3>${p.name}</h3>
            <p class="price">₹${p.price}</p> 
            <button onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
        </div>`;
    });
}

// 3. CART LOGIC
function addToCart(id) {
    let item = cart.find(i => i.id === id);
    if (item) item.qty++;
    else {
        const p = products.find(p => p.id === id);
        cart.push({ ...p, qty: 1 });
    }
    updateCount();
}

function updateCount() {
    cartCount.textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCount();
    renderCart();
}

function renderCart() {
    cartItems.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = "<p style='text-align:center; color:#888;'>Cart is empty</p>";
        cartTotal.textContent = "Total: ₹0";
        return;
    }

    cart.forEach(i => {
        const itemTotal = i.qty * i.price;
        total += itemTotal;
        cartItems.innerHTML += `
        <li>
            <div class="cart-item-info">
                <span>${i.name} <small style="color:#666">x${i.qty}</small></span>
            </div>
            <div class="cart-item-actions">
                <strong>₹${itemTotal}</strong>
                <button class="remove-btn" onclick="removeFromCart(${i.id})">×</button>
            </div>
        </li>`;
    });
    cartTotal.textContent = `Total: ₹${total}`;
}

// 4. NAVIGATION & SLIDER LOGIC
cartBtn.onclick = () => {
    renderCart();
    slider.classList.remove("slide-active"); // Reset to first panel
    cartModal.classList.remove("hidden");
};

nextBtn.onclick = () => {
    if (cart.length === 0) return alert("Your cart is empty!");
    slider.classList.add("slide-active");
    updateReceiptLink();
};

backBtn.onclick = () => {
    slider.classList.remove("slide-active");
};

// 5. RECEIPT & SHARING LOGIC
function updateReceiptLink() {
    const name = document.getElementById("customer-name").value || "Customer";
    const phone = document.getElementById("customer-phone").value || "";
    const cartData = btoa(JSON.stringify(cart));
    
    // Construct link
    const link = `${window.location.origin}/cart.html?c=${cartData}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`;
    receiptUrlInput.value = link;
}

document.getElementById("copy-link-btn").onclick = async () => {
    try {
        await navigator.clipboard.writeText(receiptUrlInput.value);
        alert("Link copied to clipboard!");
    } catch (err) {
        alert("Failed to copy.");
    }
};

document.getElementById("whatsapp-btn").onclick = async () => {
    updateReceiptLink();
    const link = receiptUrlInput.value;
    const name = document.getElementById("customer-name").value || "Customer";

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Stikies Order',
                text: `📦 New Order from ${name}\n`,
                url: link
            });
        } catch (err) { console.log("Share cancelled"); }
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(link)}`);
    }
};

// 6. MODAL CLOSING LOGIC
document.getElementById("close-modal-x").onclick = () => cartModal.classList.add("hidden");

window.onclick = (event) => {
    if (event.target == cartModal) cartModal.classList.add("hidden");
    if (event.target == previewModal) previewModal.classList.add("hidden");
};

// 7. PREVIEW MODAL
function openPreview(id) {
    const product = products.find(p => p.id === id);
    previewImg.src = product.image;
    previewTitle.textContent = product.name;
    previewPrice.textContent = product.price;
    previewAddBtn.onclick = () => {
        addToCart(id);
        previewModal.classList.add("hidden");
    };
    previewModal.classList.remove("hidden");
}

document.getElementById("close-preview").onclick = () => previewModal.classList.add("hidden");

document.getElementById("clear-cart-btn").onclick = () => {
    if (confirm("Empty cart?")) {
        cart = [];
        updateCount();
        renderCart();
    }
};

document.getElementById("place-order-btn").onclick = () => {
    alert("Order data logged to console!");
    console.log("Admin Payload:", {
        customer: document.getElementById("customer-name").value,
        cart: cart
    });
};