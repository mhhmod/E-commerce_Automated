

'use strict';

class AppState {
    constructor() {
        this.products = [];
        this.categories = [];
        this.cart = this.loadFromStorage('grindctrl_cart') || [];
        this.wishlist = this.loadFromStorage('grindctrl_wishlist') || [];
        this.currentFilter = 'all';
        this.currentProduct = null;
        this.isLoading = false;
        this.modals = {
            quickView: false,
            checkout: false,
            sizeGuide: false,
            success: false
        };
        this.checkoutStep = 1;
        this.orderData = null;
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    addToCart(productId, options = {}) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return false;

        const cartItem = {
            id: `${productId}_${options.size || 'default'}_${options.color || 'default'}`,
            productId,
            name: product.name,
            price: product.price,
            image: product.images[0],
            quantity: options.quantity || 1,
            size: options.size,
            color: options.color
        };

        const existingIndex = this.cart.findIndex(item => item.id === cartItem.id);

        if (existingIndex >= 0) {
            this.cart[existingIndex].quantity += cartItem.quantity;
        } else {
            this.cart.push(cartItem);
        }

        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
        return true;
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
    }

    updateCartQuantity(itemId, quantity) {
        if (quantity <= 0) {
            this.removeFromCart(itemId);
            return;
        }

        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            item.quantity = quantity;
            this.saveToStorage('grindctrl_cart', this.cart);
            this.updateCartUI();
        }
    }

    clearCart() {
        this.cart = [];
        this.saveToStorage('grindctrl_cart', this.cart);
        this.updateCartUI();
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    getCartCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    else {
            this.wishlist.push(productId);
        }
        this.saveToStorage('grindctrl_wishlist', this.wishlist);
        this.updateWishlistUI();
        return index < 0;
    }

    isInWishlist(productId) {
        return this.wishlist.includes(productId);
    }

    updateCartUI() {
        const cartCount = this.getCartCount();
        const cartCountElement = document.getElementById('cartCount');

        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.classList.toggle('visible', cartCount > 0);
        }

        this.renderCartItems();
    }

    updateWishlistUI() {
        const wishlistCountElement = document.getElementById('wishlistCount');

        if (wishlistCountElement) {
            wishlistCountElement.textContent = this.wishlist.length;
            wishlistCountElement.classList.toggle('visible', this.wishlist.length > 0);
        }

        this.renderWishlistItems();
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cartItems');
        const cartSummaryContainer = document.getElementById('cartSummary');

        if (!cartItemsContainer) return;

        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    <small>Add some items to get started</small>
                </div>
            `;
            cartSummaryContainer.innerHTML = '';
            return;
        }

        cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-options">
                        ${item.size ? `Size: ${item.size}` : ''}
                        ${item.size && item.color ? ', ' : ''}
                        ${item.color ? `Color: ${item.color}` : ''}
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <!-- Use changeCartQuantity to always compute the new quantity based on current state -->
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', -1)">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', 1)">+</button>
                        </div>
                        <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} EGP</div>
                    </div>
                </div>
            </div>
        `).join('');

        const subtotal = this.getCartTotal();
        const shipping = 0;
        const total = subtotal + shipping;

        cartSummaryContainer.innerHTML = `
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)} EGP</span>
            </div>
            <div class="summary-row">
                <span>Shipping:</span>
                <span class="text-green">Free</span>
            </div>
            <div class="summary-row total">
                <span>Total:</span>
                <span>${total.toFixed(2)} EGP</span>
            </div>
            <button class="btn btn-primary checkout-btn" onclick="app.openCheckout()">
                Proceed to Checkout
            </button>
        `;
    }

    renderWishlistItems() {
        const wishlistItemsContainer = document.getElementById('wishlistItems');

        if (!wishlistItemsContainer) return;

        if (this.wishlist.length === 0) {
            wishlistItemsContainer.innerHTML = `
                <div class="empty-wishlist">
                    <i class="fas fa-heart"></i>
                    <p>Your wishlist is empty</p>
                    <small>Save items you love for later</small>
                </div>
            `;
            return;
        }

        const wishlistProducts = this.wishlist.map(id => this.products.find(p => p.id === id)).filter(Boolean);

        wishlistItemsContainer.innerHTML = wishlistProducts.map(product => `
            <div class="wishlist-item" data-product-id="${product.id}">
                <img src="${product.images[0]}" alt="${product.name}" class="wishlist-item-image" loading="lazy">
                <div class="wishlist-item-details">
                    <div class="wishlist-item-name">${product.name}</div>
                    <div class="wishlist-item-price">${product.price.toFixed(2)} EGP</div>
                    <div class="wishlist-item-actions">
                        <button class="wishlist-btn primary" onclick="app.openQuickView('${product.id}')">
                            Quick View
                        </button>
                        <button class="wishlist-btn secondary" onclick="app.toggleWishlist('${product.id}')">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';

        let start = performance.now();

        function animate(timestamp) {
            let progress = (timestamp - start) / duration;
            if (progress > 1) progress = 1;

            element.style.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        let start = performance.now();
        let startOpacity = parseFloat(getComputedStyle(element).opacity);

        function animate(timestamp) {
            let progress = (timestamp - start) / duration;
            if (progress > 1) progress = 1;

            element.style.opacity = startOpacity * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }

        requestAnimationFrame(animate);
    }

    static scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    static formatPrice(price, currency = 'EGP') {
        return `${price.toFixed(2)} ${currency}`;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^[\+]?[\d\s\-\(\)]{8,}$/;
        return re.test(phone);
    }

    static generateOrderId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `GC-${timestamp}-${randomStr}`.toUpperCase();
    }

    static generateTrackingNumber() {
        const prefix = 'TRK';
        const randomNum = Math.floor(Math.random() * 1000000000);
        return `${prefix}${randomNum.toString().padStart(9, '0')}`;
    }
}

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = document.getElementById('notificationToast');

        this.currentTimeout = null;
        this.watchdogTimeout = null;
    }

    show(message, type = 'info', duration = 3500) {

        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const toastElement = document.createElement('div');
        toastElement.id = toastId;
        toastElement.className = `notification-toast show ${type}`;
        toastElement.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon fas ${this.getIconClass(type)}"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toastElement);

        toastElement.offsetHeight;

        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.classList.remove('show');
                setTimeout(() => {
                    if (toastElement.parentElement) {
                        toastElement.remove();
                    }
                }, 300);
            }
        }, duration);

        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.remove();
            }
        }, 10000);
    }

    getIconClass(type) {
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        return iconMap[type] || iconMap.info;
    }

    render(notification) {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        this.container.querySelector('.toast-icon').className = `toast-icon ${notification.type} ${iconMap[notification.type]}`;
        this.container.querySelector('.toast-message').textContent = notification.message;

        this.container.classList.add('show');

        const closeBtn = this.container.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide(notification.id);
        }
    }

    hide(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.container.classList.remove('show');
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }

    info(message) {
        this.show(message, 'info');
    }

    warning(message) {
        this.show(message, 'warning');
    }
}

class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingTasks = new Set();
    }

    show(taskId = 'default') {
        this.loadingTasks.add(taskId);
        if (this.loadingScreen) {
            this.loadingScreen.classList.remove('hidden');
        }
    }

    hide(taskId = 'default') {
        this.loadingTasks.delete(taskId);
        if (this.loadingTasks.size === 0 && this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    hideAll() {
        this.loadingTasks.clear();
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }
}

class ScrollAnimations {
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        this.init();
    }

    init() {

        const animateElements = document.querySelectorAll('.product-card, .feature, .about-text, .hero-stats .stat');

        animateElements.forEach((el, index) => {
            el.classList.add('fade-in');
            el.style.transitionDelay = `${index * 0.1}s`;
            this.observer.observe(el);
        });
    }
}

class GrindCTRLApp {
    constructor() {
        this.state = new AppState();
        this.notifications = new NotificationManager();
        this.loading = new LoadingManager();
        this.scrollAnimations = null;

        this.init();
    }

    async init() {

        try {
            this.loading.show('init');

            await this.loadProducts();

            this.initializeEventListeners();
            this.initializeNavigation();
            this.initializeModals();
            this.initializeBackToTop();
            this.initializeNewsletterForm();
            this.initializeContactForm();

            this.initializeReturnExchangeForms();

            this.renderCategories();
            this.renderProducts();
            this.state.updateCartUI();
            this.state.updateWishlistUI();

            setTimeout(() => {
                this.scrollAnimations = new ScrollAnimations();
            }, 100);

            } catch (error) {
            console.error('Failed to initialize app:', error);
            this.notifications.error('Failed to load the application. Please refresh the page.');

            this.loading.hideAll();
        } finally {

            this.loading.hide('init');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('./products.json');
            if (!response.ok) throw new Error('Failed to fetch products');

            const data = await response.json();
            this.state.products = data.products;
            this.state.categories = data.categories;

        } catch (error) {
            console.error('Error loading products:', error);

            this.loadFallbackData();
        }
    }

    loadFallbackData() {

        this.state.products = [
            {
                id: "luxury-cropped-black-tee",
                name: "Luxury Cropped Black T-Shirt",
                description: "Premium cotton blend with perfect fit. Minimalist design meets maximum impact.",
                price: 300.00,
                originalPrice: 350.00,
                category: "tshirts",
                featured: true,
                images: [
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800"
                ],
                colors: [
                    { name: "Black", value: "#000000" },
                    { name: "White", value: "#FFFFFF" },
                    { name: "Gray", value: "#6B7280" }
                ],
                sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                inStock: true,
                rating: 4.9,
                reviewCount: 127,
                tags: ["HOT", "BESTSELLER"]
            }
        ];

        this.state.categories = [
            { id: "all", name: "All Products", filter: null },
            { id: "tshirts", name: "T-Shirts", filter: "tshirts" }
        ];
    }

    initializeEventListeners() {

        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());

        const overlay = document.getElementById('drawerOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => { this.toggleCart(false); this.toggleWishlist(false); });
        }
        }

        const wishlistToggle = document.getElementById('wishlistToggle');
        if (wishlistToggle) {
            wishlistToggle.addEventListener('click', () => this.toggleWishlist());
        }

        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        document.addEventListener('click', (event) => {
            const dropdownToggle = event.target.closest('.nav-dropdown > a');
            if (dropdownToggle) {
                event.preventDefault();
                const dropdown = dropdownToggle.parentElement;
                dropdown.classList.toggle('open');
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.cart-close')) {
                this.toggleCart(false);
            }
            if (e.target.matches('.wishlist-close')) {
                this.toggleWishlist(false);
            }
            if (e.target.matches('.modal-close')) {
                this.closeAllModals();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.toggleCart(false);
                this.toggleWishlist(false);
            }
        });

        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        window.addEventListener('scroll', Utils.throttle(() => {
            this.handleScroll();
        }, 16));
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.scrollToSection(section);
                    this.setActiveNavLink(link);
                }

                const nav = document.querySelector('.nav');
                if (nav && nav.classList.contains('open')) {
                    nav.classList.remove('open');
                }

                const openDropdown = document.querySelector('.nav-dropdown.open');
                if (openDropdown && !link.closest('.nav-dropdown')) {
                    openDropdown.classList.remove('open');
                }
            });
        });

        const ordersDropdown = document.querySelector('.nav-dropdown');
        if (ordersDropdown) {
            const ordersLink = ordersDropdown.querySelector('a.nav-link');
            if (ordersLink) {
                ordersLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    ordersDropdown.classList.toggle('open');
                });
            }
            document.addEventListener('click', (e) => {
                if (!ordersDropdown.contains(e.target)) {
                    ordersDropdown.classList.remove('open');
                }
            });
        }

        this.updateActiveNavOnScroll();
    }

    initializeModals() {

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    initializeBackToTop() {
        const backToTopBtn = document.getElementById('backToTop');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    initializeNewsletterForm() {
        const form = document.getElementById('newsletterForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]').value;

                if (Utils.validateEmail(email)) {
                    this.notifications.success('Thank you for subscribing to our newsletter!');
                    form.reset();
                } else {
                    this.notifications.error('Please enter a valid email address.');
                }
            });
        }
    }

    initializeContactForm() {
        const form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = form.querySelector('input[name="name"]').value.trim();
                const email = form.querySelector('input[name="email"]').value.trim();
                const message = form.querySelector('textarea[name="message"]').value.trim();

                if (!name) {
                    this.notifications.error('Please enter your name.');
                    return;
                }
                if (!Utils.validateEmail(email)) {
                    this.notifications.error('Please enter a valid email address.');
                    return;
                }
                if (!message) {
                    this.notifications.error('Please enter a message.');
                    return;
                }

                this.notifications.success('Thank you for reaching out! We will get back to you soon.');
                form.reset();
            });
        }
    }

    renderCategories() {
        const categoryTabs = document.getElementById('categoryTabs');
        if (!categoryTabs) return;

        categoryTabs.innerHTML = this.state.categories.map(category => `
            <button class="filter-tab ${category.id === this.state.currentFilter ? 'active' : ''}"
                    data-category="${category.id}"
                    onclick="app.filterProducts('${category.id}')">
                ${category.name}
            </button>
        `).join('');
    }

    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        let filteredProducts = this.state.products;
        if (this.state.currentFilter !== 'all') {
            filteredProducts = this.state.products.filter(product =>
                product.category === this.state.currentFilter
            );
        }
        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>No products found</h3>
                    <p>Try a different category or check back later.</p>
                </div>
            `;
            return;
        }
        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');
        this.pruneInvalidProductCards();
    }

    pruneInvalidProductCards() {
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const img = card.querySelector('img.product-image');
            if (!img || !img.src) {
                card.remove();
            } else {
                img.onerror = () => {
                    card.remove();
                };
            }
        });
    }

    createProductCard(product) {
        const discount = product.originalPrice ?
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        return `
            <div class="product-card fade-in" data-product-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.images[0]}"
                         alt="${product.name}"
                         class="product-image"
                         loading="lazy">

                    <div class="product-actions">
                        <button class="action-btn ${this.state.isInWishlist(product.id) ? 'active' : ''}"
                                onclick="app.toggleWishlistItem('${product.id}')"
                                title="Add to Wishlist">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="action-btn"
                                onclick="app.openQuickView('${product.id}')"
                                title="Quick View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>

                    ${product.tags && product.tags.length > 0 ? `
                        <div class="product-tags">
                            ${product.tags.map(tag => `
                                <span class="product-tag ${tag.toLowerCase()}">${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}

                    ${discount > 0 ? `
                        <div class="product-tags" style="top: ${(product.tags?.length || 0) * 35 + 16}px;">
                            <span class="product-tag sale">${discount}% OFF</span>
                        </div>
                    ` : ''}

                    <div class="quick-view-overlay">
                        <button class="quick-view-btn" onclick="app.openQuickView('${product.id}')">
                            Quick View
                        </button>
                    </div>
                </div>

                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>

                    ${product.colors && product.colors.length > 0 ? `
                        <div class="product-colors">
                            ${product.colors.slice(0, 3).map(color => `
                                <div class="color-option"
                                     style="background-color: ${color.value}"
                                     title="${color.name}"></div>
                            `).join('')}
                            ${product.colors.length > 3 ? `<span class="color-more">+${product.colors.length - 3}</span>` : ''}
                        </div>
                    ` : ''}

                    <div class="product-price-rating">
                        <div class="product-price">
                            <span class="price-current">${Utils.formatPrice(product.price)}</span>
                            ${product.originalPrice ? `
                                <span class="price-original">${Utils.formatPrice(product.originalPrice)}</span>
                                <span class="price-discount">${discount}% OFF</span>
                            ` : ''}
                        </div>

                        <div class="product-rating">
                            <div class="stars">
                                ${this.generateStars(product.rating)}
                            </div>
                            <span class="rating-count">(${product.reviewCount})</span>
                        </div>
                    </div>

                    <button class="add-to-cart-btn"
                            onclick="app.addToCartQuick('${product.id}')"
                            ${!product.inStock ? 'disabled' : ''}>
                        <span class="btn-text">
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </span>
                        <div class="loading-spinner"></div>
                    </button>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHtml = '';

        for (let i = 0; i < fullStars; i++) {
            starsHtml += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        }

        for (let i = 0; i < emptyStars; i++) {
            starsHtml += '<i class="far fa-star"></i>';
        }

        return starsHtml;
    }

    filterProducts(categoryId) {
        this.state.currentFilter = categoryId;
        this.renderCategories();
        this.renderProducts();

        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });

        const collectionSection = document.getElementById('collection');
        if (collectionSection) {
            Utils.scrollToElement(collectionSection, 80);
        }
    }

    addToCartQuick(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        const options = {
            quantity: 1,
            size: product.sizes && product.sizes.length > 0 ? product.sizes[0] : null,
            color: product.colors && product.colors.length > 0 ? product.colors[0].name : null
        };

        if (this.state.addToCart(productId, options)) {
            this.notifications.success(`${product.name} added to cart!`);

            const cartIcon = document.getElementById('cartToggle');
            if (cartIcon) {
                cartIcon.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    cartIcon.style.transform = 'scale(1)';
                }, 200);
            }
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    toggleWishlistItem(productId) {
        const added = this.state.toggleWishlist(productId);
        const product = this.state.products.find(p => p.id === productId);

        if (product) {
            if (added) {
                this.notifications.success(`${product.name} added to wishlist!`);
            } else {
                this.notifications.info(`${product.name} removed from wishlist`);
            }
        }

        const wishlistBtns = document.querySelectorAll(`[data-product-id="${productId}"] .action-btn`);
        wishlistBtns.forEach(btn => {
            if (btn.querySelector('.fa-heart')) {
                btn.classList.toggle('active', added);
            }
        });
    }

    updateCartQuantity(itemId, quantity) {
        this.state.updateCartQuantity(itemId, quantity);
    }

    changeCartQuantity(itemId, delta) {
        const item = this.state.cart.find(item => item.id === itemId);
        if (!item) return;
        const newQuantity = item.quantity + delta;
        this.state.updateCartQuantity(itemId, newQuantity);
    }

    openQuickView(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        this.state.currentProduct = product;
        this.renderQuickView(product);
        this.openModal('quickView');
    }

    renderQuickView(product) {
        const quickViewBody = document.getElementById('quickViewBody');
        if (!quickViewBody) return;

        const discount = product.originalPrice ?
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        quickViewBody.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-images">
                    <img src="${product.images[0]}"
                         alt="${product.name}"
                         class="quick-view-main-image"
                         id="quickViewMainImage">

                    ${product.images.length > 1 ? `
                        <div class="quick-view-thumbnails">
                            ${product.images.map((image, index) => `
                                <img src="${image}"
                                     alt="${product.name} view ${index + 1}"
                                     class="thumbnail ${index === 0 ? 'active' : ''}"
                                     onclick="app.changeQuickViewImage('${image}', this)">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <div class="quick-view-details">
                    <h3>${product.name}</h3>

                    <div class="quick-view-rating">
                        <div class="stars">${this.generateStars(product.rating)}</div>
                        <span>(${product.reviewCount} reviews)</span>
                    </div>

                    <div class="quick-view-price">
                        <span class="price-large">${Utils.formatPrice(product.price)}</span>
                        ${product.originalPrice ? `
                            <span class="price-original">${Utils.formatPrice(product.originalPrice)}</span>
                            <span class="price-discount">${discount}% OFF</span>
                        ` : ''}
                    </div>

                    <p class="product-description">${product.description}</p>

                    ${product.colors && product.colors.length > 0 ? `
                        <div class="options-section">
                            <h4>Color</h4>
                            <div class="color-options">
                                ${product.colors.map((color, index) => `
                                    <div class="color-option-large ${index === 0 ? 'selected' : ''}"
                                         style="background-color: ${color.value}"
                                         data-color="${color.name}"
                                         onclick="app.selectQuickViewColor(this)"
                                         title="${color.name}"></div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${product.sizes && product.sizes.length > 1 ? `
                        <div class="options-section">
                            <h4>Size <button class="size-guide-link" onclick="app.openSizeGuide()">Size Guide</button></h4>
                            <div class="size-options">
                                ${product.sizes.map((size, index) => `
                                    <button class="size-option ${index === 0 ? 'selected' : ''}"
                                            data-size="${size}"
                                            onclick="app.selectQuickViewSize(this)">
                                        ${size}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div class="quantity-section">
                        <label>Quantity</label>
                        <div class="quantity-selector">
                            <button onclick="app.updateQuickViewQuantity(-1)">-</button>
                            <input type="number" id="quickViewQuantity" value="1" min="1" max="10" readonly>
                            <button onclick="app.updateQuickViewQuantity(1)">+</button>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="app.addToCartFromQuickView()" style="flex: 1;">
                            Add to Cart
                        </button>
                        <button class="wishlist-toggle ${this.state.isInWishlist(product.id) ? 'active' : ''}"
                                onclick="app.toggleWishlistItem('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>

                    <div class="product-features">
                        <div class="feature-item">
                            <i class="fas fa-shipping-fast"></i>
                            <span>Free shipping worldwide</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-undo"></i>
                            <span>30-day return policy</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-certificate"></i>
                            <span>Premium quality guarantee</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    changeQuickViewImage(imageSrc, thumbnail) {
        const mainImage = document.getElementById('quickViewMainImage');
        if (mainImage) {
            mainImage.src = imageSrc;
        }

        document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
        thumbnail.classList.add('active');
    }

    selectQuickViewColor(colorElement) {
        document.querySelectorAll('.color-option-large').forEach(el => el.classList.remove('selected'));
        colorElement.classList.add('selected');
    }

    selectQuickViewSize(sizeElement) {
        document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
        sizeElement.classList.add('selected');
    }

    updateQuickViewQuantity(change) {
        const quantityInput = document.getElementById('quickViewQuantity');
        if (!quantityInput) return;

        let currentValue = parseInt(quantityInput.value) || 1;
        let newValue = currentValue + change;

        if (newValue < 1) newValue = 1;
        if (newValue > 10) newValue = 10;

        quantityInput.value = newValue;
    }

    addToCartFromQuickView() {
        if (!this.state.currentProduct) return;

        const selectedColor = document.querySelector('.color-option-large.selected')?.getAttribute('data-color');
        const selectedSize = document.querySelector('.size-option.selected')?.getAttribute('data-size');
        const quantity = parseInt(document.getElementById('quickViewQuantity')?.value) || 1;

        const options = {
            quantity,
            size: selectedSize,
            color: selectedColor
        };

        if (this.state.addToCart(this.state.currentProduct.id, options)) {
            this.notifications.success(`${this.state.currentProduct.name} added to cart!`);
            this.closeModal('quickView');
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    openCheckout() {
        if (this.state.cart.length === 0) {
            this.notifications.warning('Your cart is empty');
            return;
        }

        this.state.checkoutStep = 1;
        this.renderCheckout();
        this.openModal('checkout');
    }

    renderCheckout() {
        const checkoutBody = document.getElementById('checkoutBody');
        if (!checkoutBody) return;

        this.updateCheckoutProgress();

        if (this.state.checkoutStep === 1) {
            this.renderCheckoutStep1(checkoutBody);
        } else if (this.state.checkoutStep === 2) {
            this.renderCheckoutStep2(checkoutBody);
        } else if (this.state.checkoutStep === 3) {
            this.renderCheckoutStep3(checkoutBody);
        }
    }

    updateCheckoutProgress() {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === this.state.checkoutStep);
            step.classList.toggle('completed', stepNumber < this.state.checkoutStep);
        });
    }

    renderCheckoutStep1(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <form id="checkoutForm1">
                        <div class="form-section">
                            <h4>Shipping Information</h4>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">First Name *</label>
                                    <input type="text" name="firstName" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name *</label>
                                    <input type="text" name="lastName" class="form-input" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Email Address *</label>
                                <input type="email" name="email" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Phone Number *</label>
                                <input type="tel" name="phone" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Shipping Address *</label>
                                <input type="text" name="address" class="form-input" placeholder="Street address" required>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">City *</label>
                                    <input type="text" name="city" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Postal Code *</label>
                                    <input type="text" name="postalCode" class="form-input" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Note (optional)</label>
                                <textarea name="note" class="form-input" maxlength="500" rows="3" placeholder="Add any special instructions or notes about your order"></textarea>
                                <div class="character-counter">
                                    <span class="character-count">0</span>/500 characters remaining
                                </div>
                            </div>
                        </div>

                        <!-- Fixed action bar for checkout button -->
                        <div class="checkout-action-bar">
                            <button type="submit" class="btn btn-primary btn-large">
                                Continue to Payment
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </form>
                </div>

                <div class="checkout-sidebar">
                ${this.renderOrderSummary()}
                </div>
            </div>
        `;

        const noteTextarea = container.querySelector('textarea[name="note"]');
        const characterCount = container.querySelector('.character-count');
        if (noteTextarea && characterCount) {
            const updateCounter = () => {
                const remaining = 500 - noteTextarea.value.length;
                characterCount.textContent = noteTextarea.value.length;
                characterCount.parentElement.textContent = `${noteTextarea.value.length}/500 characters remaining`;
            };
            noteTextarea.addEventListener('input', updateCounter);
            updateCounter();
        }

        const form = document.getElementById('checkoutForm1');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateCheckoutForm(form)) {
                    this.saveCheckoutData(form);
                    this.state.checkoutStep = 2;
                    this.renderCheckout();
                }
            });
        }
    }

    renderCheckoutStep2(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <form id="checkoutForm2">
                        <div class="form-section">
                            <h4>Payment Method</h4>

                            <div class="payment-methods">
                                <div class="payment-method selected" data-method="cod">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-money-bill-wave"></i>
                                    <div>
                                        <strong>Cash on Delivery</strong>
                                        <p>Pay when you receive your order</p>
                                    </div>
                                </div>

                                <div class="payment-method" data-method="transfer">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-university"></i>
                                    <div>
                                        <strong>Bank Transfer</strong>
                                        <p>Transfer to our bank account</p>
                                    </div>
                                </div>

                                <div class="payment-method" data-method="card">
                                    <div class="payment-radio"></div>
                                    <i class="payment-icon fas fa-credit-card"></i>
                                    <div>
                                        <strong>Credit Card</strong>
                                        <p>Secure online payment</p>
                                    </div>
                                </div>
                            </div>

                            <input type="hidden" name="paymentMethod" value="cod">
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="app.prevCheckoutStep()">
                                Back
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Review Order
                            </button>
                        </div>
                    </form>
                </div>

                ${this.renderOrderSummary()}
            </div>
        `;

        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                paymentMethods.forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');

                const hiddenInput = document.querySelector('input[name="paymentMethod"]');
                if (hiddenInput) {
                    hiddenInput.value = method.getAttribute('data-method');
                }
            });
        });

        const form = document.getElementById('checkoutForm2');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCheckoutData(form);
                this.state.checkoutStep = 3;
                this.renderCheckout();
            });
        }
    }

    renderCheckoutStep3(container) {
        container.innerHTML = `
            <div class="checkout-content">
                <div class="checkout-form">
                    <div class="form-section">
                        <h4>Review Your Order</h4>
                        <p>Please review your order details before placing your order.</p>

                        <div class="order-review">
                            <div class="review-section">
                                <h5>Shipping Address</h5>
                                <p>
                                    ${this.state.orderData?.firstName} ${this.state.orderData?.lastName}<br>
                                    ${this.state.orderData?.address}<br>
                                    ${this.state.orderData?.city}, ${this.state.orderData?.postalCode}<br>
                                    ${this.state.orderData?.phone}
                                </p>
                            </div>

                            <div class="review-section">
                                <h5>Payment Method</h5>
                                <p>${this.getPaymentMethodName(this.state.orderData?.paymentMethod)}</p>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="app.prevCheckoutStep()">
                                Back
                            </button>
                            <button type="button" class="btn btn-primary" onclick="app.submitOrder()">
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>

                ${this.renderOrderSummary()}
            </div>
        `;
    }

    renderOrderSummary() {
        const subtotal = this.state.getCartTotal();
        const shipping = 0;
        const tax = 0;
        const total = subtotal + shipping + tax;

        return `
            <div class="order-summary">
                <h4>Order Summary</h4>

                <div class="summary-items">
                    ${this.state.cart.map(item => `
                        <div class="summary-item">
                            <img src="${item.image}" alt="${item.name}" class="summary-item-image">
                            <div class="summary-item-details">
                                <div class="summary-item-name">${item.name}</div>
                                <div class="summary-item-options">
                                    ${item.size ? `Size: ${item.size}` : ''}
                                    ${item.size && item.color ? ', ' : ''}
                                    ${item.color ? `Color: ${item.color}` : ''}
                                    <br>Qty: ${item.quantity}
                                </div>
                                <div class="summary-item-price">${Utils.formatPrice(item.price * item.quantity)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="summary-totals">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>${Utils.formatPrice(subtotal)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>Free</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax:</span>
                        <span>${Utils.formatPrice(tax)}</span>
                    </div>
                    <div class="summary-row summary-total">
                        <span>Total:</span>
                        <span>${Utils.formatPrice(total)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    validateCheckoutForm(form) {
        const formData = new FormData(form);
        let isValid = true;

        form.querySelectorAll('.form-error').forEach(error => error.remove());
        form.querySelectorAll('.form-input.error').forEach(input => input.classList.remove('error'));

        form.querySelectorAll('[required]').forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'This field is required');
                isValid = false;
            }
        });

        const emailInput = form.querySelector('input[type="email"]');
        if (emailInput) {
            if (!emailInput.value.trim()) {
                this.showFieldError(emailInput, 'Email address is required');
                isValid = false;
            } else if (!Utils.validateEmail(emailInput.value)) {
            this.showFieldError(emailInput, 'Please enter a valid email address');
            isValid = false;
            }
        }

        const phoneInput = form.querySelector('input[type="tel"]');
        if (phoneInput && phoneInput.value && !Utils.validatePhone(phoneInput.value)) {
            this.showFieldError(phoneInput, 'Please enter a valid phone number');
            isValid = false;
        }

        return isValid;
    }

    showFieldError(input, message) {
        input.classList.add('error');

        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;

        input.parentNode.appendChild(errorElement);
    }

    saveCheckoutData(form) {
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        this.state.orderData = { ...this.state.orderData, ...data };
    }

    prevCheckoutStep() {
        if (this.state.checkoutStep > 1) {
            this.state.checkoutStep--;
            this.renderCheckout();
        }
    }

    getPaymentMethodName(method) {
        const methods = {
            cod: 'Cash on Delivery',
            transfer: 'Bank Transfer',
            card: 'Credit Card'
        };
        return methods[method] || method;
    }

    async submitOrder() {
        try {
            this.loading.show('order');

            const orderData = this.prepareOrderData();

            const success = await this.sendOrderToWebhook(orderData);

            if (success) {

                this.storeOrder(orderData);
                this.showOrderSuccess(orderData);
                this.state.clearCart();
                this.closeModal('checkout');
            } else {
                throw new Error('Order processing failed');
            }

        } catch (error) {
            console.error('Order submission error:', error);
            this.notifications.error('Failed to place order. Please try again.');
        } finally {
            this.loading.hide('order');
        }
    }

    prepareOrderData() {
        const orderId = Utils.generateOrderId();
        const trackingNumber = Utils.generateTrackingNumber();
        const subtotal = this.state.getCartTotal();
        const total = subtotal;
        const codAmount = this.state.orderData.paymentMethod === 'cod' ? total : 0;

        return {
            "Order ID": orderId,
            "Customer Name": `${this.state.orderData.firstName} ${this.state.orderData.lastName}`,
            "Customer Email": this.state.orderData.email || "",
            "Phone": this.state.orderData.phone,
            "City": this.state.orderData.city,
            "Address": this.state.orderData.address,
            "Note": this.state.orderData.note || "",
            "COD Amount": codAmount.toFixed(2),
            "Tracking Number": trackingNumber,
            "Courier": "BOSTA",
            "Total": total.toFixed(2),
            "Date": new Date().toISOString(),
            "Status": "New",
            "Payment Method": this.getPaymentMethodName(this.state.orderData.paymentMethod),
            "Product": this.state.cart.map(item =>
                `${item.name}${item.size ? ` - ${item.size}` : ''} (${item.quantity}x)`
            ).join(', '),
            "Quantity": this.state.cart.reduce((total, item) => total + item.quantity, 0).toString()
        };
    }

    async sendOrderToWebhook(orderData) {
        const webhookUrl = window.CONFIG?.WEBHOOK_URL;

        if (!webhookUrl || webhookUrl === 'WEBHOOK_URL_NOT_CONFIGURED' || webhookUrl.trim() === '') {
            console.warn('Webhook URL not configured');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        }

        try {
            const resp = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify(orderData)
            });
            if (resp.ok) {
                return true;
            }
        } catch (err) {
            console.error('CORS POST webhook attempt failed:', err);
        }

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(orderData)
            });
            return true;
        } catch (err) {
            console.warn('no‑cors POST webhook attempt failed:', err);
        }

        try {
            if (navigator && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify(orderData)], { type: 'application/json' });
                const ok = navigator.sendBeacon(webhookUrl, blob);
                if (ok) return true;
            }
        } catch (err) {
            console.warn('sendBeacon webhook fallback failed:', err);
        }

        try {
            const query = encodeURIComponent(JSON.stringify(orderData));
            const img = new Image();
            img.src = `${webhookUrl}?payload=${query}`;
            return true;
        } catch (err) {
            console.error('Webhook GET via image attempt failed:', err);
        }

        return false;
    }

    async sendReturnOrExchangeWebhook(requestData, type) {
        const returnUrl  = window.CONFIG?.RETURN_WEBHOOK_URL;
        const exchangeUrl = window.CONFIG?.EXCHANGE_WEBHOOK_URL;
        let url;
        if (type === 'return') url = returnUrl;
        else if (type === 'exchange') url = exchangeUrl;
        else url = null;

        if (!url || url === '' || url === 'WEBHOOK_URL_NOT_CONFIGURED') {
            console.warn('Return/Exchange webhook URL not configured');
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        }

        const payload = { ...requestData, requestType: type };

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                return true;
            }
        } catch (err) {
            console.error('Return/Exchange CORS POST attempt failed:', err);
        }

        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            return true;
        } catch (err) {
            console.warn('Return/Exchange no‑cors POST attempt failed:', err);
        }

        try {
            if (navigator && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const ok = navigator.sendBeacon(url, blob);
                if (ok) return true;
            }
        } catch (err) {
            console.warn('Return/Exchange sendBeacon attempt failed:', err);
        }

        try {
            const query = encodeURIComponent(JSON.stringify(payload));
            const img = new Image();
            img.src = `${url}?payload=${query}`;
            return true;
        } catch (err) {
            console.error('Return/Exchange GET via image attempt failed:', err);
        }
        return false;
    }

    showOrderSuccess(orderData) {
        const successModal = document.getElementById('successModal');
        const orderDetails = document.getElementById('orderDetails');
        const successMessage = document.getElementById('successMessage');

        if (successMessage) {
            successMessage.textContent = `Thank you for your order! Your order #${orderData['Order ID']} has been confirmed.`;
        }

        if (orderDetails) {
            orderDetails.innerHTML = `
                <div class="order-detail-row">
                    <span>Order ID:</span>
                    <span>${orderData['Order ID']}</span>
                </div>
                <div class="order-detail-row">
                    <span>Payment Method:</span>
                    <span>${orderData['Payment Method']}</span>
                </div>
                <div class="order-detail-row">
                    <span>Total:</span>
                    <span>${orderData['Total']} EGP</span>
                </div>
            `;
        }

        this.removePostOrderActions();

        this.openModal('success');
    }

    closeSuccessModal() {
        this.closeModal('success');
    }

    removePostOrderActions() {

        const selectorsToRemove = [
            '.post-order-actions .btn-return',
            '.post-order-actions .btn-exchange',
            '[data-action="return"]',
            '[data-action="exchange"]',
            '.order-actions'
        ];

        selectorsToRemove.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.remove();
            });
        });
    }

    storeOrder(orderData) {
        try {
            const orders = JSON.parse(localStorage.getItem('grindctrl_orders')) || [];
            orders.push(orderData);
            localStorage.setItem('grindctrl_orders', JSON.stringify(orders));
        } catch (error) {
            console.warn('Failed to save order:', error);
        }
    }

    openSizeGuide() {
        const sizeGuideBody = document.getElementById('sizeGuideBody');
        if (sizeGuideBody) {
            sizeGuideBody.innerHTML = `
                <div class="size-guide-content">
                    <div class="size-chart">
                        <h4>T-Shirt Size Chart (cm)</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Size</th>
                                    <th>Chest</th>
                                    <th>Length</th>
                                    <th>Shoulder</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>XS</td><td>86</td><td>66</td><td>41</td></tr>
                                <tr><td>S</td><td>91</td><td>69</td><td>43</td></tr>
                                <tr><td>M</td><td>96</td><td>72</td><td>45</td></tr>
                                <tr><td>L</td><td>101</td><td>75</td><td>47</td></tr>
                                <tr><td>XL</td><td>106</td><td>78</td><td>49</td></tr>
                                <tr><td>XXL</td><td>111</td><td>81</td><td>51</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="size-guide-tips">
                        <h4>How to Measure</h4>
                        <ul>
                            <li><strong>Chest:</strong> Measure around the fullest part of your chest</li>
                            <li><strong>Length:</strong> Measure from shoulder to bottom hem</li>
                            <li><strong>Shoulder:</strong> Measure from shoulder seam to shoulder seam</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        this.openModal('sizeGuide');
    }

    openLookbook() {

        this.notifications.info('Lookbook feature coming soon!');
    }

    openModal(modalId) {
        const modal = document.getElementById(`${modalId}Modal`);
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(`${modalId}Modal`);
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('open');
        }

    updateDrawerOverlay() {
        const overlay = document.getElementById('drawerOverlay');
        const cart = document.getElementById('floatingCart');
        const wishlist = document.getElementById('wishlistPanel');
        const anyOpen = (cart && cart.classList.contains('open')) || (wishlist && wishlist.classList.contains('open'));
        document.body.classList.toggle('drawer-open', !!anyOpen);
        if (overlay) overlay.setAttribute('aria-hidden', anyOpen ? 'false' : 'true');
    }

    toggleCart(force = null) {
        const cart = document.getElementById('floatingCart');
        const wishlist = document.getElementById('wishlistPanel');
        if (!cart) return;

        const shouldOpen = force !== null ? !!force : !cart.classList.contains('open');
        cart.classList.toggle('open', shouldOpen);
        if (shouldOpen && wishlist) wishlist.classList.remove('open');

        this.updateDrawerOverlay();
    }

    toggleWishlist(force = null) {
        const wishlist = document.getElementById('wishlistPanel');
        const cart = document.getElementById('floatingCart');
        if (!wishlist) return;

        const shouldOpen = force !== null ? !!force : !wishlist.classList.contains('open');
        wishlist.classList.toggle('open', shouldOpen);
        if (shouldOpen && cart) cart.classList.remove('open');

        this.updateDrawerOverlay();
    }
);
        document.body.style.overflow = '';
    }

    else {
            cart.classList.toggle('open');
        }

        if (cart.classList.contains('open')) {
            this.toggleWishlist(false);
        }
    }

    toggleWishlist(force = null) {
        const wishlist = document.getElementById('wishlistPanel');
        if (!wishlist) return;

        if (force !== null) {
            wishlist.classList.toggle('open', force);
        } else {
            wishlist.classList.toggle('open');
        }

        if (wishlist.classList.contains('open')) {
            this.toggleCart(false);
        }
    }

    toggleMobileMenu() {
        const nav = document.querySelector('.nav');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        if (nav && toggleBtn) {
            const isOpen = nav.classList.toggle('open');
            toggleBtn.setAttribute('aria-expanded', isOpen);

            if (isOpen) {

                const firstLink = nav.querySelector('.nav-link');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 100);
                }

                this.setupMobileMenuListeners();
            } else {

                this.removeMobileMenuListeners();

                document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
                    dropdown.classList.remove('open');
                });
            }
        }
    }

    setupMobileMenuListeners() {

        this.removeMobileMenuListeners();

        this.outsideClickHandler = (event) => {
            const nav = document.querySelector('.nav');
            const toggleBtn = document.getElementById('mobileMenuToggle');
            if (nav && nav.classList.contains('open') &&
                !nav.contains(event.target) && event.target !== toggleBtn) {
                this.toggleMobileMenu();
            }
        };

        this.escHandler = (event) => {
            if (event.key === 'Escape') {
                const nav = document.querySelector('.nav');
                if (nav && nav.classList.contains('open')) {
                    this.toggleMobileMenu();

                    const toggleBtn = document.getElementById('mobileMenuToggle');
                    if (toggleBtn) toggleBtn.focus();
                }
            }
        };

        document.addEventListener('click', this.outsideClickHandler);
        document.addEventListener('keydown', this.escHandler);
    }

    removeMobileMenuListeners() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }

    renderExchangeProductPreview(product) {
        const mainImage = document.getElementById('exchangePreviewMainImage');
        const thumbnailsContainer = document.getElementById('exchangePreviewThumbnails');
        const detailsContainer = document.getElementById('exchangePreviewDetails');

        if (!mainImage || !thumbnailsContainer || !detailsContainer) return;

        mainImage.src = product.images[0] || '';
        mainImage.alt = product.name;

        if (product.images && product.images.length > 1) {
            thumbnailsContainer.innerHTML = product.images.map((image, index) => `
                <img src="${image}"
                     alt="${product.name} view ${index + 1}"
                     class="${index === 0 ? 'active' : ''}"
                     onclick="app.changeExchangePreviewImage('${image}', this)">
            `).join('');
        } else {
            thumbnailsContainer.innerHTML = '';
        }

        const discount = product.originalPrice ?
            Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        detailsContainer.innerHTML = `
            <p><strong>${product.name}</strong></p>
            <p>
                <span style="font-weight: 600; color: var(--primary-color); font-size: 1.1em;">
                    ${product.price ? product.price.toFixed(2) : 'n/a'} EGP
                </span>
                ${product.originalPrice ? `
                    <span style="text-decoration: line-through; color: var(--text-secondary); margin-left: 8px;">
                        ${product.originalPrice.toFixed(2)} EGP
                    </span>
                    <span style="color: #22c55e; font-weight: 600; margin-left: 8px;">
                        ${discount}% OFF
                    </span>
                ` : ''}
            </p>
            ${product.rating ? `
                <p>
                    <div style="color: #fbbf24; display: inline-block;">
                        ${this.generateStars(product.rating)}
                    </div>
                    <span style="margin-left: 8px; color: var(--text-secondary);">
                        ${product.rating}/5 (${product.reviewCount || 0} reviews)
                    </span>
                </p>
            ` : ''}
            ${product.description ? `
                <p style="margin-top: 8px; line-height: 1.4;">
                    ${product.description.length > 150 ?
                        product.description.substring(0, 150) + '...' :
                        product.description}
                </p>
            ` : ''}
        `;
    }

    renderExchangeComparison(oldOrder, newProduct, priceDelta) {
        const comparisonContainer = document.getElementById('exchangeProductPreview');
        if (!comparisonContainer) return;

        const deltaClass = priceDelta > 0 ? 'price-increase' : priceDelta < 0 ? 'price-decrease' : 'price-same';

        comparisonContainer.innerHTML = `
            <div class="exchange-comparison">
                <h4>Exchange Comparison</h4>

                <div class="comparison-grid">
                    <!-- Original Product -->
                    <div class="comparison-item original">
                        <h5><i class="fas fa-arrow-left"></i> Your Current Item</h5>
                        <div class="item-details">
                            <div class="item-name">${oldOrder.Product}</div>
                            <div class="item-price">${parseFloat(oldOrder.Total).toFixed(2)} EGP</div>
                            <div class="item-meta">
                                <small>Order: ${oldOrder['Order ID']}</small><br>
                                <small>Date: ${new Date(oldOrder.Date).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>

                    <!-- Exchange Arrow -->
                    <div class="exchange-arrow">
                        <i class="fas fa-exchange-alt"></i>
                        <span>Exchange</span>
                    </div>

                    <!-- New Product -->
                    <div class="comparison-item new">
                        <h5>New Item <i class="fas fa-arrow-right"></i></h5>
                        <div class="item-details">
                            <img src="${newProduct.images[0]}" alt="${newProduct.name}" class="item-image">
                            <div class="item-info">
                                <div class="item-name">${newProduct.name}</div>
                                <div class="item-price">${newProduct.price.toFixed(2)} EGP</div>
                                ${newProduct.originalPrice ? `
                                    <div class="item-original-price">${newProduct.originalPrice.toFixed(2)} EGP</div>
                                ` : ''}
                                ${newProduct.rating ? `
                                    <div class="item-rating">
                                        ${this.generateStars(newProduct.rating)} (${newProduct.reviewCount || 0})
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Price Summary -->
                <div class="price-summary ${deltaClass}">
                    <div class="summary-row">
                        <span>Original Item Value:</span>
                        <span>${parseFloat(oldOrder.Total).toFixed(2)} EGP</span>
                    </div>
                    <div class="summary-row">
                        <span>New Item Price:</span>
                        <span>${newProduct.price.toFixed(2)} EGP</span>
                    </div>
                    <div class="summary-row total">
                        <span>Price Difference:</span>
                        <span class="${deltaClass}">
                            ${priceDelta >= 0 ? '+' : ''}${priceDelta.toFixed(2)} EGP
                            ${priceDelta > 0 ? ' (You Pay)' : priceDelta < 0 ? ' (You Get Refund)' : ' (No Change)'}
                        </span>
                    </div>
                </div>

                ${newProduct.colors && newProduct.colors.length > 0 ? `
                    <div class="product-options">
                        <h5>Available Colors:</h5>
                        <div class="color-options">
                            ${newProduct.colors.slice(0, 5).map(color => `
                                <div class="color-swatch"
                                     style="background-color: ${color.value}"
                                     title="${color.name}"></div>
                            `).join('')}
                            ${newProduct.colors.length > 5 ? `<span class="more-colors">+${newProduct.colors.length - 5} more</span>` : ''}
                        </div>
                    </div>
                ` : ''}

                ${newProduct.sizes && newProduct.sizes.length > 0 ? `
                    <div class="product-options">
                        <h5>Available Sizes:</h5>
                        <div class="size-options">
                            ${newProduct.sizes.map(size => `<span class="size-badge">${size}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    changeExchangePreviewImage(imageSrc, thumbnailElement) {
        const mainImage = document.getElementById('exchangePreviewMainImage');
        const thumbnails = document.querySelectorAll('#exchangePreviewThumbnails img');

        if (mainImage) {
            mainImage.src = imageSrc;
        }

        thumbnails.forEach(thumb => thumb.classList.remove('active'));
        thumbnailElement.classList.add('active');
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            Utils.scrollToElement(section, headerHeight + 20);
        }
    }

    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    updateActiveNavOnScroll() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[data-section]');

        window.addEventListener('scroll', Utils.throttle(() => {
            const scrollPosition = window.scrollY + 100;

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('data-section') === sectionId) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, 100));
    }

    handleScroll() {
        const scrollY = window.scrollY;
        const header = document.querySelector('.header');
        const backToTop = document.getElementById('backToTop');

        if (scrollY > 100) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }

        if (scrollY > 500) {
            backToTop?.classList.add('visible');
        } else {
            backToTop?.classList.remove('visible');
        }
    }

    handleResize() {

        if (window.innerWidth > 768) {
            const nav = document.querySelector('.nav');
            if (nav) {
                nav.classList.remove('open');
            }
        }
    }

    handleExchangeOrder() {
        this.notifications.info('Exchange request received. Our team will contact you shortly.');
    }

    handleReturnOrder() {
        this.notifications.info('Return request received. Our team will contact you shortly.');
    }

    openReturnModal() {
        this.openModal('return');
    }

    openExchangeModal() {
        this.openModal('exchange');
    }

    initializeReturnExchangeForms() {

        const getOrdersByPhone = (phone) => {
            try {
                const orders = JSON.parse(localStorage.getItem('grindctrl_orders')) || [];
                return orders.filter(o => (o.Phone && o.Phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, '')));
            } catch (error) {
                console.warn('Failed to load orders for lookup:', error);
                return [];
            }
        };

        const getOrdersByEmail = (email) => {
            try {
                const orders = JSON.parse(localStorage.getItem('grindctrl_orders')) || [];
                return orders.filter(o => (o['Customer Email'] && o['Customer Email'].toLowerCase() === email.toLowerCase()));
            } catch (error) {
                console.warn('Failed to load orders for email lookup:', error);
                return [];
            }
        };

        const getOrdersByPhoneOrEmail = (phone, email) => {
            const phoneOrders = phone ? getOrdersByPhone(phone) : [];
            const emailOrders = email ? getOrdersByEmail(email) : [];

            const combined = [...phoneOrders, ...emailOrders];
            const uniqueOrders = combined.filter((order, index, self) =>
                index === self.findIndex(o => o['Order ID'] === order['Order ID'])
            );

            return uniqueOrders;
        };

        const populateOrderSelect = (container, orders, submitBtn) => {
            container.innerHTML = '';
            if (!orders || orders.length === 0) {
                container.style.display = 'none';
                if (submitBtn) submitBtn.disabled = true;
                return;
            }

            let selectedOrderId = null;

            orders.forEach(order => {
                const item = document.createElement('div');
                item.className = 'order-item clickable-order-item';
                item.setAttribute('data-order-id', order['Order ID']);

                item.innerHTML = `
                    <div class="order-header">
                        <strong>${order['Order ID']}</strong>
                        <span class="order-price">${order.Total} EGP</span>
                    </div>
                    <div class="order-info">
                        <small>Product: ${order.Product}</small><br>
                        <small>Date: ${new Date(order.Date).toLocaleDateString()}</small><br>
                        <small>Status: ${order.Status}</small>
                    </div>
                    <div class="order-select-indicator">
                        <i class="fas fa-check-circle"></i>
                        <span>Click to select this order</span>
                    </div>
                `;

                item.addEventListener('click', function() {

                    container.querySelectorAll('.order-item').forEach(orderItem => {
                        orderItem.classList.remove('selected');
                    });

                    this.classList.add('selected');

                    selectedOrderId = order['Order ID'];

                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = `Continue with Order ${order['Order ID']}`;
                        }
                });

                item.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.backgroundColor = 'var(--background-surface)';
                    }
                });

                item.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.backgroundColor = '';
                    }
                });

                container.appendChild(item);
            });

            container.getSelectedOrderId = () => selectedOrderId;

            container.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Continue to Item Selection';
            }
        };

        const attachLookupHandlers = (phoneId, buttonId, containerId, submitId) => {
            const phoneInput = document.getElementById(phoneId);
            const findBtn = document.getElementById(buttonId);
            const container = document.getElementById(containerId);
            const submitBtn = document.getElementById(submitId);
            if (!phoneInput || !findBtn || !container || !submitBtn) return;
            findBtn.addEventListener('click', () => {
                const phone = phoneInput.value.trim();
                if (!phone) {
                    this.notifications.error('Please enter a phone number.');
                    return;
                }
                const orders = getOrdersByPhone(phone);
                if (orders.length === 0) {
                    this.notifications.error('No orders found for this phone number.');
                    populateOrderSelect(container, [], submitBtn);
                    return;
                }
                populateOrderSelect(container, orders, submitBtn);
            });
        };

       const returnForm = document.getElementById('returnForm');
if (returnForm) {

    const phoneInput = returnForm.querySelector('input[name="phone"]');
    const emailInput = returnForm.querySelector('input[name="email"]');
    const orderIdInput = returnForm.querySelector('input[name="orderId"]');

    const orderListContainer = document.createElement('div');
    orderListContainer.id = 'returnOrderList';
    orderListContainer.className = 'order-list';
    orderListContainer.style.display = 'none';

    const returnSubmitBtn = returnForm.querySelector('button[type="submit"]');
    if (returnSubmitBtn) returnSubmitBtn.textContent = 'Submit Return Request';

    if (orderIdInput) {
        orderIdInput.parentNode.appendChild(orderListContainer);

        orderListContainer.addEventListener('click', () => {
            if (orderIdInput && typeof orderListContainer.getSelectedOrderId === 'function') {
                const selId = orderListContainer.getSelectedOrderId();
                if (selId) {
                    orderIdInput.value = selId;
                    if (returnSubmitBtn) returnSubmitBtn.textContent = `Submit Return for Order ${selId}`;
                }
            }
        });
    }

    const updateOrderList = () => {
        const phone = phoneInput?.value.trim();
        const email = emailInput?.value.trim();

        if (phone || email) {
            const orders = getOrdersByPhoneOrEmail(phone, email);
            if (orders.length > 0) {

                populateOrderSelect(orderListContainer, orders, returnSubmitBtn);
                orderListContainer.style.display = 'block';

                if (orders.length === 1 && orderIdInput) {
                    orderIdInput.value = orders[0]['Order ID'];
                    const radio = orderListContainer.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                        if (returnSubmitBtn) returnSubmitBtn.disabled = false;
                        radio.closest('.order-item').classList.add('selected');
                    }
                }
            } else {
                orderListContainer.style.display = 'none';
                if (returnSubmitBtn) returnSubmitBtn.disabled = true;
            }
        } else {
            orderListContainer.style.display = 'none';
            if (returnSubmitBtn) returnSubmitBtn.disabled = true;
        }
    };

    phoneInput?.addEventListener('input', updateOrderList);
    emailInput?.addEventListener('input', updateOrderList);

    returnForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(returnForm);
        const returnData = {};
        for (let [k, v] of formData.entries()) returnData[k] = v;

        if (!returnData.phone || !returnData.email || !returnData.firstName ||
            !returnData.lastName || !returnData.address || !returnData.city ||
            !returnData.returnReason) {
            this.notifications.error('Please fill in all required fields.');
            return;
        }
        if (!Utils.validateEmail(returnData.email)) {
            this.notifications.error('Please enter a valid email address.');
            return;
        }

        const matchedOrders = getOrdersByPhoneOrEmail(returnData.phone, returnData.email);
        if (matchedOrders.length > 0 && !returnData.orderId) {
            this.notifications.error('Select the order to return from the list.');
            return;
        }

        let selectedOrder = null;
        if (returnData.orderId) {
            const orders = getOrdersByPhoneOrEmail(returnData.phone, returnData.email);
            selectedOrder = orders.find(o => o['Order ID'] === returnData.orderId) || null;
        }

let refundAmount = "0.00";
let paymentMethod = "Refund to Customer";
let originalPaymentMethod = "Unknown";

if (selectedOrder) {
  const rawTotal = parseFloat(selectedOrder['Total'] || selectedOrder['COD Amount'] || "0");
  refundAmount = Number.isFinite(rawTotal) ? rawTotal.toFixed(2) : "0.00";
  originalPaymentMethod = selectedOrder['Payment Method'] || "Unknown";
}

        const returnPayload = {
            "Order ID": returnData.orderId || Utils.generateOrderId(),
            "Customer Name": `${returnData.firstName} ${returnData.lastName}`,
            "Customer Email": returnData.email,
            "Phone": returnData.phone,
            "City": returnData.city,
            "Address": returnData.address,
            "Note": `Return Reason: ${returnData.returnReason}${selectedOrder ? ` | Original Order: ${selectedOrder['Order ID']} | Original Payment: ${originalPaymentMethod} | Refund Amount: ${refundAmount} EGP | Refund Method: Customer will be contacted for refund arrangement` : ''}`,
            "COD Amount": refundAmount,
            "Tracking Number": "",
            "Courier": "",
            "Total": refundAmount,
            "Date": new Date().toISOString(),
            "Status": "Return",
            "Payment Method": paymentMethod,
            "Product": selectedOrder ? selectedOrder['Product'] : "Return Request",
            "Quantity": selectedOrder ? selectedOrder['Quantity'] : "1",
            "requestType": "return",
            "returnDetails": {
                "returnReason": returnData.returnReason,
                "originalOrderId": returnData.orderId || null,
                "originalOrder": selectedOrder || null,
                "refundAmount": refundAmount,
                "originalPaymentMethod": originalPaymentMethod
            }
        };

        const ok = await this.sendReturnOrExchangeWebhook(returnPayload, 'return');
        if (ok) this.notifications.success('Return request submitted. Our support team will contact you soon regarding the refund.');
        else this.notifications.error('Failed to submit return request. Please try again.');

        returnForm.reset();
        orderListContainer.style.display = 'none';
        this.closeModal('return');
    });
}

        const exchangeForm = document.getElementById('exchangeForm');
        if (exchangeForm) {

            let currentStep = 1;
            let selectedOrder = null;
            let selectedOrderItem = null;

            const phoneInput = exchangeForm.querySelector('input[name="phone"]');
            const emailInput = exchangeForm.querySelector('input[name="email"]');
            const orderSelectionSection = document.getElementById('orderSelectionSection');
            const itemSelectionSection = document.getElementById('itemSelectionSection');
            const exchangeSubmitBtn = document.getElementById('exchangeSubmit');
            const exchangeOrderList = document.getElementById('exchangeOrderList');

            const step1ContinueBtn = document.createElement('button');
            step1ContinueBtn.type = 'button';
            step1ContinueBtn.className = 'btn btn-primary';
            step1ContinueBtn.textContent = 'Continue to Order Selection';
            step1ContinueBtn.style.marginTop = 'var(--spacing-md)';

            const step2ContinueBtn = document.createElement('button');
            step2ContinueBtn.type = 'button';
            step2ContinueBtn.className = 'btn btn-primary';
            step2ContinueBtn.textContent = 'Continue to Item Selection';
            step2ContinueBtn.style.display = 'none';
            step2ContinueBtn.style.marginTop = 'var(--spacing-md)';
            step2ContinueBtn.disabled = true;

            const validateStep1 = () => {
                const formData = new FormData(exchangeForm);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }

                if (!data.phone || !data.email || !data.firstName || !data.lastName || !data.address || !data.city) {
                    this.notifications.error('Please fill in all required fields.');
                    return false;
                }

                if (!Utils.validateEmail(data.email)) {
                    this.notifications.error('Please enter a valid email address.');
                    return false;
                }

                return data;
            };

            const showOrderHistory = (customerData) => {
                const orders = getOrdersByPhoneOrEmail(customerData.phone, customerData.email);
                if (orders.length > 0) {

                    const currentContainer = document.getElementById('exchangeOrderList');
                    populateOrderSelect(currentContainer, orders, step2ContinueBtn);

                    const updatedContainer = document.getElementById('exchangeOrderList');

                    orderSelectionSection.style.display = 'block';
                    step2ContinueBtn.style.display = 'block';
                    currentStep = 2;

                    orderSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    if (orders.length === 1) {
                        const firstOrderItem = updatedContainer.querySelector('.order-item');
                        if (firstOrderItem) {

                            firstOrderItem.click();
                        }
                    }
                } else {
                    this.notifications.error('No previous orders found. Please contact support for exchanges.');
                    return false;
                }
                return true;
            };

            const showItemSelection = (order) => {
                selectedOrder = order;
                itemSelectionSection.style.display = 'block';
                currentStep = 3;
                exchangeSubmitBtn.style.display = 'block';

                createProductSelectionGrid();

                itemSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                updateExchangeSummary(order);
            };

            const updateExchangeSummary = (order) => {
                const summaryContent = document.getElementById('summaryContent');
                if (summaryContent && order) {
                    summaryContent.innerHTML = `
                        <div class="summary-item">
                            <strong>Original Order:</strong> ${order['Order ID']}
                        </div>
                        <div class="summary-item">
                            <strong>Original Product:</strong> ${order['Product']}
                        </div>
                        <div class="summary-item">
                            <strong>Original Payment:</strong> ${order['Payment Method']}
                        </div>
                        <div class="summary-item">
                            <strong>Order Date:</strong> ${new Date(order['Date']).toLocaleDateString()}
                        </div>
                    `;
                    document.getElementById('exchangeSummary').style.display = 'block';
                }
            };

            let selectedNewProduct = null;
            const priceDeltaDiv = document.getElementById('priceDelta');
            const deltaAmountSpan = document.getElementById('deltaAmount');
            const deltaExplanation = document.getElementById('deltaExplanation');
            const productPreview = document.getElementById('exchangeProductPreview');

            const createProductSelectionGrid = () => {
                const productGridContainer = document.getElementById('exchangeProductGrid');
                if (!productGridContainer || !this.state.products.length) return;

                productGridContainer.innerHTML = `
                    <h4>Select New Product</h4>
                    <div class="exchange-product-grid">
                        ${this.state.products.map(product => `
                            <div class="exchange-product-card" data-product-id="${product.id}">
                                <div class="product-image-container">
                                    <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                                    ${product.originalPrice ? `
                                        <div class="discount-badge">
                                            ${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="product-info">
                                    <h5 class="product-name">${product.name}</h5>
                                    <div class="product-price">
                                        <span class="current-price">${product.price.toFixed(2)} EGP</span>
                                        ${product.originalPrice ? `
                                            <span class="original-price">${product.originalPrice.toFixed(2)} EGP</span>
                                        ` : ''}
                                    </div>
                                    ${product.rating ? `
                                        <div class="product-rating">
                                            <div class="stars">${this.generateStars(product.rating)}</div>
                                            <span class="rating-text">(${product.reviewCount || 0})</span>
                                        </div>
                                    ` : ''}
                                    <div class="product-select-indicator">
                                        <i class="fas fa-check-circle"></i>
                                        <span>Click to select</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

                const productCards = productGridContainer.querySelectorAll('.exchange-product-card');
                productCards.forEach(card => {
                    card.addEventListener('click', function() {
                        const productId = this.getAttribute('data-product-id');
                        const product = app.state.products.find(p => p.id === productId);

                        if (product) {

                            productCards.forEach(c => c.classList.remove('selected'));

                            this.classList.add('selected');

                            selectedNewProduct = product;

                            updatePriceCalculation();

                            setTimeout(() => {
                                priceDeltaDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                        }
                    });

                    card.addEventListener('mouseenter', function() {
                        if (!this.classList.contains('selected')) {
                            this.style.transform = 'translateY(-2px)';
                            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                        }
                    });

                    card.addEventListener('mouseleave', function() {
                        if (!this.classList.contains('selected')) {
                            this.style.transform = 'translateY(0)';
                            this.style.boxShadow = '';
                        }
                    });
                });
            };

            const updatePriceCalculation = () => {
                if (selectedNewProduct && selectedOrder) {
                    const oldProductPrice = selectedOrder ? parseFloat(selectedOrder['Total']) || 0 : 0;
                    const newPrice = selectedNewProduct.price || 0;
                    const delta = newPrice - oldProductPrice;
                    const deltaText = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);

                    priceDeltaDiv.style.display = 'block';
                    deltaAmountSpan.textContent = `${deltaText} EGP`;
                    deltaAmountSpan.className = delta >= 0 ? 'positive' : 'negative';

                    if (delta > 0) {
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item payment-required">
                                <i class="fas fa-credit-card"></i>
                                <div>
                                    <strong>Additional Payment Required</strong>
                                    <p>You will need to pay <strong>${delta.toFixed(2)} EGP extra</strong> for this exchange</p>
                                </div>
                            </div>
                            <div class="explanation-item delivery-info">
                                <i class="fas fa-truck"></i>
                                <div>
                                    <strong>Payment on Delivery</strong>
                                    <p>Payment will be collected when the new item is delivered</p>
                                </div>
                            </div>
                        `;
                    } else if (delta < 0) {
                        const refundAmount = Math.abs(delta);
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item refund-info">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <strong>Refund Due</strong>
                                    <p>You will receive a <strong>${refundAmount.toFixed(2)} EGP refund</strong></p>
                                </div>
                            </div>
                            <div class="explanation-item processing-info">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <strong>Refund Processing</strong>
                                    <p>Refund will be processed after the exchange is completed</p>
                                </div>
                            </div>
                        `;
                    } else {
                        deltaExplanation.innerHTML = `
                            <div class="explanation-item same-price">
                                <i class="fas fa-check-circle"></i>
                                <div>
                                    <strong>Perfect Match!</strong>
                                    <p><strong>No additional payment required</strong> - same price exchange</p>
                                </div>
                            </div>
                        `;
                    }

                    this.renderExchangeComparison(selectedOrder, selectedNewProduct, delta);
                    productPreview.style.display = 'block';
                } else {
                    priceDeltaDiv.style.display = 'none';
                    productPreview.style.display = 'none';
                }
            };

            const firstFormSection = exchangeForm.querySelector('.form-section:first-child');
            if (firstFormSection) {
                firstFormSection.appendChild(step1ContinueBtn);
            }

            if (orderSelectionSection) {
                orderSelectionSection.appendChild(step2ContinueBtn);
            }

            step1ContinueBtn.addEventListener('click', () => {
                const customerData = validateStep1();
                if (customerData && showOrderHistory(customerData)) {
                    step1ContinueBtn.style.display = 'none';
                }
            });

            step2ContinueBtn.addEventListener('click', () => {
                const exchangeOrderList = document.getElementById('exchangeOrderList');
                const selectedOrderId = exchangeOrderList.getSelectedOrderId ? exchangeOrderList.getSelectedOrderId() : null;

                if (!selectedOrderId) {
                    this.notifications.error('Please select an order to exchange from.');
                    return;
                }

                const customerData = validateStep1();
                const orders = getOrdersByPhoneOrEmail(customerData.phone, customerData.email);
                const order = orders.find(o => o['Order ID'] === selectedOrderId);

                if (order) {
                    showItemSelection(order);
                    step2ContinueBtn.style.display = 'none';
                } else {
                    this.notifications.error('Selected order not found. Please try again.');
                }
            });

            exchangeForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const customerData = validateStep1();
                const note = exchangeForm.querySelector('textarea[name="note"]')?.value || '';

                if (!customerData || !selectedOrder || !selectedNewProduct) {
                    this.notifications.error('Please complete all steps and select a new product.');
                    return;
                }

                const newProduct = selectedNewProduct;

                const oldPrice = parseFloat(selectedOrder['Total']) || 0;
                const newPrice = newProduct.price || 0;
                const delta = newPrice - oldPrice;

                let codAmount = "0.00";
                let paymentMethod = "Exchange Request";
                let exchangeAction = "";

                if (delta > 0) {
                    codAmount = delta.toFixed(2);
                    paymentMethod = "Exchange Payment Required";
                    exchangeAction = `Customer must pay additional ${delta.toFixed(2)} EGP | Payment will be collected on delivery of new item`;
                } else if (delta < 0) {
                    const refundAmount = Math.abs(delta);
                    codAmount = "0.00";
                    paymentMethod = "Exchange Refund";
                    exchangeAction = `Customer will receive ${refundAmount.toFixed(2)} EGP refund | Refund will be processed after exchange completion`;
                } else {
                    codAmount = "0.00";
                    paymentMethod = "Exchange - Same Price";
                    exchangeAction = `Exchange at same price | No additional payment required`;
                }

                const exchangePayload = {
                    "Order ID": Utils.generateOrderId(),
                    "Customer Name": `${customerData.firstName} ${customerData.lastName}`,
                    "Customer Email": customerData.email,
                    "Phone": customerData.phone,
                    "City": customerData.city,
                    "Address": customerData.address,
                    "Note": `Exchange Request | Original Order: ${selectedOrder['Order ID']} | Original Product: ${selectedOrder['Product']} | Original Price: ${oldPrice.toFixed(2)} EGP | New Product: ${newProduct.name}${newProduct.sku ? ` (${newProduct.sku})` : ''} | New Price: ${newPrice.toFixed(2)} EGP | Price Difference: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} EGP | Action Required: ${exchangeAction} | Customer Note: ${note}`,
                    "COD Amount": codAmount,
                    "Tracking Number": "",
                    "Courier": "",
                    "Total": newPrice.toFixed(2),
                    "Date": new Date().toISOString(),
                    "Status": "Exchange",
                    "Payment Method": paymentMethod,
                    "Product": `${newProduct.name}${newProduct.sku ? ` (${newProduct.sku})` : ''} (Exchange)`,
                    "Quantity": "1",
                    "requestType": "exchange",
                    "exchangeDetails": {
                        "originalOrderId": selectedOrder['Order ID'],
                        "originalProduct": selectedOrder['Product'],
                        "originalPrice": oldPrice,
                        "originalPaymentMethod": selectedOrder['Payment Method'],
                        "newProduct": {
                            "id": newProduct.id,
                            "name": newProduct.name,
                            "sku": newProduct.sku || 'n/a',
                            "price": newPrice
                        },
                        "priceDifference": delta,
                        "exchangeAction": exchangeAction,
                        "paymentRequired": delta > 0 ? delta : 0,
                        "refundAmount": delta < 0 ? Math.abs(delta) : 0,
                        "customerNote": note
                    }
                };

                const success = await this.sendReturnOrExchangeWebhook(exchangePayload, 'exchange');
                if (success) {
                    if (delta > 0) {
                        this.notifications.success(`Exchange request submitted! You will need to pay ${delta.toFixed(2)} EGP additional for the new item.`);
                    } else if (delta < 0) {
                        this.notifications.success(`Exchange request submitted! You will receive ${Math.abs(delta).toFixed(2)} EGP refund.`);
                    } else {
                        this.notifications.success('Exchange request submitted! No additional payment required.');
                    }
                } else {
                    this.notifications.error('Failed to submit exchange request. Please try again.');
                }

                exchangeForm.reset();
                orderSelectionSection.style.display = 'none';
                itemSelectionSection.style.display = 'none';
                exchangeSubmitBtn.style.display = 'none';
                priceDeltaDiv.style.display = 'none';
                productPreview.style.display = 'none';
                document.getElementById('exchangeSummary').style.display = 'none';
                exchangeOrderList.innerHTML = '';
                const productGrid = document.getElementById('exchangeProductGrid');
                if (productGrid) productGrid.innerHTML = '';
                step1ContinueBtn.style.display = 'block';
                step2ContinueBtn.style.display = 'none';
                currentStep = 1;
                selectedOrder = null;
                selectedNewProduct = null;
                this.closeModal('exchange');
            });
        }
    }
}

window.scrollToSection = function(sectionId) {
    if (window.app) {
        window.app.scrollToSection(sectionId);
    }
};

window.openLookbook = function() {
    if (window.app) {
        window.app.openLookbook();
    }
};

window.openSizeGuide = function() {
    if (window.app) {
        window.app.openSizeGuide();
    }
};

window.closeSuccessModal = function() {
    if (window.app) {
        window.app.closeSuccessModal();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = new GrindCTRLApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                })
            .catch(registrationError => {
                });
    });
}

document.addEventListener('click', function(e){
  const cartBtn     = e.target.closest && e.target.closest('.cart-close');
  const wishlistBtn = e.target.closest && e.target.closest('.wishlist-close');
  const modalBtn    = e.target.closest && e.target.closest('.modal-close');
  const overlay     = (e.target.classList && e.target.classList.contains('modal-overlay')) ? e.target : null;

  if (cartBtn)     { try { window.app && app.toggleCart(false); } catch(_){} return; }
  if (wishlistBtn) { try { window.app && app.toggleWishlist(false); } catch(_){} return; }
  if (modalBtn)    {
    const m = modalBtn.closest('.modal');
    if (m && m.id) {
      try {
        const id = m.id.replace('Modal','').replace(/Modal$/,'');
        window.app && app.closeModal(id);
      } catch(_){}
    }
    return;
  }
  if (overlay) {
    const m = overlay.closest('.modal');
    if (m && m.id) {
      try {
        const id = m.id.replace('Modal','').replace(/Modal$/,'');
        window.app && app.closeModal(id);
      } catch(_){}
    }
  }
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    try { window.app && app.closeAllModals && app.closeAllModals(); } catch(_){}
  }
});