// ==================== CONFIGURATION ====================
const API_URL = 'http://localhost:3000/api';

// ==================== STATE MANAGEMENT ====================
let currentUser = null;
let cart = [];
let products = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadFromLocalStorage();
});

function initializeApp() {
    updateCartUI();
    loadFeaturedProducts();
}

function loadFromLocalStorage() {
    const savedUser = localStorage.getItem('coffeeUser');
    const savedCart = localStorage.getItem('coffeeCart');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }
    
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });
    
    // Cart button
    document.getElementById('cartBtn').addEventListener('click', () => navigateTo('cart'));
    
    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => navigateTo('auth'));
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabType = e.target.dataset.tab;
            switchAuthTab(tabType);
        });
    });
    
    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
    document.getElementById('checkoutBtn')?.addEventListener('click', () => navigateTo('checkout'));
    
    // Filters
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
    document.getElementById('roastFilter')?.addEventListener('change', applyFilters);
}

// ==================== NAVIGATION ====================
function navigateTo(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });
    
    // Load page-specific data
    switch(pageName) {
        case 'products':
            loadProducts();
            break;
        case 'cart':
            updateCartPage();
            break;
        case 'checkout':
            updateCheckoutPage();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'admin':
            loadAdminDashboard();
            break;
    }
}

// ==================== API CALLS ====================
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentUser ? `Bearer ${currentUser.token}` : '',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== AUTH FUNCTIONS ====================
function switchAuthTab(tabType) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabType}"]`).classList.add('active');
    
    if (tabType === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        currentUser = data.user;
        currentUser.token = data.token;
        localStorage.setItem('coffeeUser', JSON.stringify(currentUser));
        updateUserUI();
        navigateTo('home');
        e.target.reset();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        currentUser = data.user;
        currentUser.token = data.token;
        localStorage.setItem('coffeeUser', JSON.stringify(currentUser));
        updateUserUI();
        navigateTo('home');
        e.target.reset();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('coffeeUser');
    updateUserUI();
    navigateTo('home');
}

function updateUserUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    const ordersLink = document.getElementById('ordersLink');
    const adminLink = document.getElementById('adminLink');
    
    if (currentUser) {
        loginBtn.style.display = 'none';
        userSection.style.display = 'flex';
        userName.textContent = `Hi, ${currentUser.name}`;
        ordersLink.style.display = 'block';
        
        if (currentUser.role === 'admin') {
            adminLink.style.display = 'block';
        }
    } else {
        loginBtn.style.display = 'block';
        userSection.style.display = 'none';
        ordersLink.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

// ==================== PRODUCTS ====================
async function loadFeaturedProducts() {
    try {
        const data = await apiCall('/products?limit=4');
        renderProducts(data, 'featuredProducts');
    } catch (error) {
        console.error('Error loading featured products:', error);
    }
}

async function loadProducts() {
    showLoading(true);
    try {
        products = await apiCall('/products');
        applyFilters();
    } catch (error) {
        console.error('Error loading products:', error);
    } finally {
        showLoading(false);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || 'All';
    const roast = document.getElementById('roastFilter')?.value || 'All';
    
    let filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'All' || product.category === category;
        const matchesRoast = roast === 'All' || product.roast === roast;
        
        return matchesSearch && matchesCategory && matchesRoast;
    });
    
    renderProducts(filtered, 'productsGrid');
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = productList.map(product => `
        <div class="product-card">
            <div class="product-image">${product.image}</div>
            <div class="product-info">
                <div class="product-header">
                    <span class="product-roast">${product.roast}</span>
                    <div class="product-rating">
                        <span>⭐</span>
                        <span>${product.rating}</span>
                    </div>
                </div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-to-cart-btn" onclick="addToCart('${product._id}')">
                        Add to Cart
                    </button>
                </div>
                <p class="product-stock">${product.stock} in stock</p>
            </div>
        </div>
    `).join('');
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
}

// ==================== CART FUNCTIONS ====================
function addToCart(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item._id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartUI();
    
    // Visual feedback
    const btn = event.target;
    btn.textContent = '✓ Added';
    btn.classList.add('added');
    setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
    }, 2000);
}

function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item._id === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart();
        updateCartUI();
        updateCartPage();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item._id !== productId);
    saveCart();
    updateCartUI();
    updateCartPage();
}

function saveCart() {
    localStorage.setItem('coffeeCart', JSON.stringify(cart));
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function updateCartPage() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartContent.style.display = 'none';
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartContent.style.display = 'block';
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${item.image}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-quantity">
                <button class="quantity-btn" onclick="updateCartQuantity('${item._id}', ${item.quantity - 1})">−</button>
                <span class="quantity-value">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartQuantity('${item._id}', ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
            <button class="remove-btn" onclick="removeFromCart('${item._id}')">🗑️</button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// ==================== CHECKOUT ====================
function updateCheckoutPage() {
    if (!currentUser) {
        alert('Please login to checkout');
        navigateTo('auth');
        return;
    }
    
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} × ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    checkoutTotal.textContent = `$${total.toFixed(2)}`;
    
    // Pre-fill form
    document.querySelector('[name="name"]').value = currentUser.name;
    document.querySelector('[name="email"]').value = currentUser.email;
}

async function handleCheckout(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to place order');
        navigateTo('auth');
        return;
    }
    
    const formData = new FormData(e.target);
    const orderData = {
        userId: currentUser._id,
        items: cart.map(item => ({
            productId: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shippingAddress: {
            name: formData.get('name'),
            address: formData.get('address'),
            city: formData.get('city'),
            zipCode: formData.get('zipCode')
        },
        paymentInfo: {
            cardNumber: formData.get('cardNumber').slice(-4)
        }
    };
    
    try {
        await apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        cart = [];
        saveCart();
        updateCartUI();
        alert('Order placed successfully!');
        navigateTo('orders');
        e.target.reset();
    } catch (error) {
        alert('Error placing order: ' + error.message);
    }
}

// ==================== ORDERS ====================
async function loadOrders() {
    if (!currentUser) {
        navigateTo('auth');
        return;
    }
    
    try {
        const orders = await apiCall(`/orders/user/${currentUser._id}`);
        renderOrders(orders, 'ordersList');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No orders yet</p></div>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Order #${order._id}</span>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
            ${order.items.map(item => `
                <div class="order-item">
                    <span>${item.name} × ${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="order-total">
                <span>Total:</span>
                <span>$${order.total.toFixed(2)}</span>
            </div>
            <p style="margin-top: 1rem; color: #6b7280; font-size: 0.875rem;">
                ${new Date(order.createdAt).toLocaleDateString()}
            </p>
        </div>
    `).join('');
}

// ==================== ADMIN DASHBOARD ====================
async function loadAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        navigateTo('home');
        return;
    }
    
    try {
        const stats = await apiCall('/admin/stats');
        const orders = await apiCall('/orders');
        
        document.getElementById('statRevenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        document.getElementById('statOrders').textContent = stats.totalOrders;
        document.getElementById('statProducts').textContent = stats.totalProducts;
        document.getElementById('statCustomers').textContent = stats.totalCustomers;
        
        renderOrders(orders, 'adminOrdersList');
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}