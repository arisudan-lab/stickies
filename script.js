let products = [];
let cart = [];

// --- CONFIGURATION ---
// Your Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzg1ozcNOyH4LpFLrTiUzmbRh-zVdTuZvdLZRNl16vVYTUJqd1SdEUpAr0uDlJgI6fewQ/exec";

// --- 1. DOM ELEMENTS ---
const grid = document.getElementById("sticker-grid");
const cartBtn = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
const cartModal = document.getElementById("cart-modal");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const shareBtn = document.getElementById("whatsapp-btn");


// Modal/Slider Elements
const slider = document.getElementById("cart-slider");
const nextBtn = document.getElementById("go-to-info-btn");
const backBtn = document.getElementById("back-to-items");
const receiptUrlInput = document.getElementById("receipt-url-display");
const receiptBox = document.querySelector(".receipt-share-box");

// Preview Elements
const previewModal = document.getElementById("preview-modal");
const previewImg = document.getElementById("preview-img");
const previewTitle = document.getElementById("preview-title");
const previewPrice = document.getElementById("preview-price");
const previewAddBtn = document.getElementById("preview-add-btn");

// --- 2. INITIALIZATION ---

function lockReceiptBox() {
    if (receiptBox) {
        receiptBox.style.opacity = "0.5";
        receiptBox.style.pointerEvents = "none";
        receiptBox.style.cursor = "not-allowed";
    }

    if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.style.opacity = "0.5";
        shareBtn.style.cursor = "not-allowed";
    }
}


function unlockReceiptBox() {
    if (receiptBox) {
        receiptBox.style.opacity = "1";
        receiptBox.style.pointerEvents = "auto";
        receiptBox.style.cursor = "default";
    }

    if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.style.opacity = "1";
        shareBtn.style.cursor = "pointer";
    }
}


lockReceiptBox(); // Lock on load

// Load Products
fetch("./products.json")
    .then(r => r.json())
    .then(data => {
        products = data;
        renderProducts();
    })
    .catch(err => console.error("Error loading products:", err));


// --- 3. CORE FUNCTIONS ---

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

function updateReceiptLink() {
    const name = document.getElementById("customer-name")?.value.trim() || "";
    const phone = document.getElementById("customer-phone")?.value.trim() || "";
    const email = document.getElementById("customer-email")?.value.trim() || "";
    const address = document.getElementById("customer-address")?.value.trim() || "";
    const coupon = document.getElementById("customer-coupon")?.value.trim() || "";

    const cartData = btoa(JSON.stringify(cart));
    
    const link = `${window.location.origin}/cart.html?c=${cartData}` +
                 `&name=${encodeURIComponent(name || "Customer")}` +
                 `&phone=${encodeURIComponent(phone || "Not Provided")}` +
                 `&email=${encodeURIComponent(email)}` +
                 `&address=${encodeURIComponent(address)}` +
                 `&coupon=${encodeURIComponent(coupon)}`;
    
    if (receiptUrlInput) {
        receiptUrlInput.value = link;
    }
    return link;
}

// --- 4. EVENT LISTENERS ---

cartBtn.onclick = () => {
    renderCart();
    slider.classList.remove("slide-active");
    cartModal.classList.remove("hidden");
};

nextBtn.onclick = () => {
    if (cart.length === 0) return alert("Your cart is empty!");
    slider.classList.add("slide-active");
    lockReceiptBox(); 
    updateReceiptLink();
};

backBtn.onclick = () => {
    slider.classList.remove("slide-active");
};

// --- PLACE ORDER LOGIC (UPDATED WITH GOOGLE SHEETS) ---
document.getElementById("place-order-btn").onclick = () => {
    if (cart.length === 0) return alert("Cart is empty!");

    // 1. Validation
    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const email = document.getElementById("customer-email").value.trim();
    const address = document.getElementById("customer-address").value.trim();
    const coupon = document.getElementById("customer-coupon").value.trim();

    if (!name || !phone || !email || !address) {
        alert("⚠️ Please fill in all required fields (Name, Phone, Email, Address).");
        return;
    }

    // 2. UI Loading State
    const btn = document.getElementById("place-order-btn");
    const originalText = btn.innerText;
    btn.innerText = "⏳ Placing Order...";
    btn.disabled = true;
    
    // 3. Prepare Data
    const freshLink = updateReceiptLink(); 
    const formData = new FormData();
    formData.append("Name", name);
    formData.append("Phone", phone);
    formData.append("Email", email);
    formData.append("Address", address);
    formData.append("Coupon", coupon);
    formData.append("Items", JSON.stringify(cart.map(i => `${i.name} (x${i.qty})`).join(", ")));
    formData.append("Total", cart.reduce((a, b) => a + (b.qty * b.price), 0));
    formData.append("Receipt Link", freshLink);

    // 4. Send to Google Sheets
    fetch(SCRIPT_URL, { method: 'POST', body: formData })
    .then(response => {
        alert("🚀 Order Placed Successfully! Your receipt is ready.");
        unlockReceiptBox(); // Enable Copy/Share buttons
        console.log("Order sent to database");
    })
    .catch(error => {
        alert("⚠️ Network Error: Order placed locally, but failed to save to database.");
        console.error('Error!', error.message);
        unlockReceiptBox(); // Still unlock so they can share manually
    })
    .finally(() => {
        btn.innerText = originalText;
        btn.disabled = false;
    });
};

document.getElementById("whatsapp-btn").onclick = async () => {
    const link = updateReceiptLink();
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

document.getElementById("copy-link-btn").onclick = async () => {
    const link = updateReceiptLink();
    try {
        await navigator.clipboard.writeText(link);
        alert("📋 Link copied to clipboard!");
    } catch (err) { alert("Failed to copy link."); }
};

document.getElementById("close-modal-x").onclick = () => cartModal.classList.add("hidden");
document.getElementById("close-preview").onclick = () => previewModal.classList.add("hidden");

window.onclick = (event) => {
    if (event.target == cartModal) cartModal.classList.add("hidden");
    if (event.target == previewModal) previewModal.classList.add("hidden");
};

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

document.getElementById("clear-cart-btn").onclick = () => {
    if (confirm("Empty cart?")) {
        cart = [];
        updateCount();
        renderCart();
    }
};


// --- CAROUSEL LOGIC ---
let slideIndex = 1;
showSlides(slideIndex);

// Auto-scroll every 5 seconds
let slideInterval = setInterval(() => {
    plusSlides(1);
}, 5000); 

function plusSlides(n) {
    showSlides(slideIndex += n);
    resetTimer(); // Resets timer so it doesn't jump immediately after a click
}

function currentSlide(n) {
    showSlides(slideIndex = n);
    resetTimer();
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("carousel-slide");
    let dots = document.getElementsByClassName("dot");
    
    if (n > slides.length) {slideIndex = 1}    
    if (n < 1) {slideIndex = slides.length}
    
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    
    slides[slideIndex-1].style.display = "block";  
    dots[slideIndex-1].className += " active";
}

function resetTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        plusSlides(1);
    }, 3000);
}