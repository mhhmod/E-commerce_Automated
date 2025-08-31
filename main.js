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

    changeCartQuantity(itemId, delta) {
        const item = this.cart.find(item => item.id === itemId);
        if (item) {
            const newQuantity = item.quantity + delta;
            this.updateCartQuantity(itemId, Math.max(0, newQuantity));
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
    
    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index >= 0) {
            this.wishlist.splice(index, 1);
        } else {
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
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', -1)" aria-label="Decrease quantity">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="app.changeCartQuantity('${item.id}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} EGP</div>
                    </div>
                </div>
            </div>
        `).join('');

        const subtotal = this.getCartTotal();
        const shipping = 0;
        const total = subtotal + shipping;

        if (cartSummaryContainer) {
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

    static isMobile() {
        return window.innerWidth <= 768;
    }

    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toastElement);

        // Trigger reflow
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

        // Failsafe removal
        setTimeout(() => {
            if (toastElement.parentElement) {
                toastElement.remove();
            }
        }, 10000);
    }

    getIconClass(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info':
            default: return 'fa-info-circle';
        }
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration) {
        this.show(message, 'error', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }
}

class GrindCTRLApp {
    constructor() {
        this.state = new AppState();
        this.notifications = new NotificationManager();
        this.init();
    }

    async init() {
        try {
            this.state.isLoading = true;
            await this.loadProducts();
            this.setupEventListeners();
            this.renderCategories();
            this.renderProducts();
            this.state.updateCartUI();
            this.state.updateWishlistUI();
            this.initScrollEffects();
            this.initMobileMenu();
            this.state.isLoading = false;
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.notifications.error('Failed to load application. Please refresh the page.');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('products.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.state.products = data.products || [];
            this.state.categories = data.categories || [];
        } catch (error) {
            console.error('Failed to load products:', error);
            this.notifications.error('Failed to load products. Please check your connection and try again.');
            // Set empty state instead of mock data
            this.state.products = [];
            this.state.categories = [
                { "id": "all", "name": "All Products", "filter": null }
            ];
        }
    }

    setupEventListeners() {
        // Header scroll effect
        let lastScrollY = window.scrollY;
        const header = document.getElementById('header');
        
        const handleScroll = Utils.throttle(() => {
            const scrollY = window.scrollY;
            
            if (scrollY > 100) {
                if (scrollY > lastScrollY) {
                    header?.classList.add('hidden');
                } else {
                    header?.classList.remove('hidden');
                }
            } else {
                header?.classList.remove('hidden');
            }
            
            lastScrollY = scrollY;
        }, 100);

        window.addEventListener('scroll', handleScroll);

        // Cart and wishlist toggles
        const cartToggle = document.getElementById('cartToggle');
        const wishlistToggle = document.getElementById('wishlistToggle');

        cartToggle?.addEventListener('click', () => this.toggleCartPanel());
        wishlistToggle?.addEventListener('click', () => this.toggleWishlistPanel());

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const nav = document.getElementById('site-menu');
        const mobileNavOverlay = document.getElementById('mobileNavOverlay');

        mobileMenuToggle?.addEventListener('click', () => this.toggleMobileMenu());
        mobileNavOverlay?.addEventListener('click', () => this.closeMobileMenu());

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.scrollToSection(section);
                this.closeMobileMenu();
            });
        });

        // Newsletter form
        const newsletterForm = document.getElementById('newsletterForm');
        newsletterForm?.addEventListener('submit', (e) => this.handleNewsletterSubmit(e));

        // Contact form
        const contactForm = document.getElementById('contactForm');
        contactForm?.addEventListener('submit', (e) => this.handleContactSubmit(e));

        // Return/Exchange forms
        const returnForm = document.getElementById('returnForm');
        const exchangeForm = document.getElementById('exchangeForm');
        
        returnForm?.addEventListener('submit', (e) => this.handleReturnSubmit(e));
        exchangeForm?.addEventListener('submit', (e) => this.handleExchangeSubmit(e));

        // Size guide tabs
        const sizeTabs = document.querySelectorAll('.size-tab');
        sizeTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchSizeGuideTab(tab.dataset.category));
        });

        // Dropdown toggles for mobile
        const dropdowns = document.querySelectorAll('.nav-dropdown');
        dropdowns.forEach(dropdown => {
            const link = dropdown.querySelector('.nav-link');
            link?.addEventListener('click', (e) => {
                if (Utils.isMobile()) {
                    e.preventDefault();
                    dropdown.classList.toggle('open');
                }
            });
        });

        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle touch events for better mobile experience
        if (Utils.isTouchDevice()) {
            this.setupTouchEvents();
        }
    }

    setupTouchEvents() {
        // Add touch feedback for buttons
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('touching');
            });
            
            button.addEventListener('touchend', () => {
                setTimeout(() => button.classList.remove('touching'), 150);
            });
        });
    }

    initMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const nav = document.getElementById('site-menu');
        
        if (mobileMenuToggle && nav) {
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    toggleMobileMenu() {
        const nav = document.getElementById('site-menu');
        const overlay = document.getElementById('mobileNavOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        
        if (!nav) return;

        const isOpen = nav.classList.contains('open');
        
        if (isOpen) {
            this.closeMobileMenu();
        } else {
            nav.classList.add('open');
            overlay?.classList.add('active');
            toggle?.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const nav = document.getElementById('site-menu');
        const overlay = document.getElementById('mobileNavOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        
        nav?.classList.remove('open');
        overlay?.classList.remove('active');
        toggle?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        // Close any open dropdowns
        const openDropdowns = document.querySelectorAll('.nav-dropdown.open');
        openDropdowns.forEach(dropdown => dropdown.classList.remove('open'));
    }

    initScrollEffects() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        // Observe elements for scroll animations
        const animatedElements = document.querySelectorAll('.feature, .product-card');
        animatedElements.forEach(el => observer.observe(el));
    }

    renderCategories() {
        const categoryTabs = document.getElementById('categoryTabs');
        if (!categoryTabs) return;

        if (this.state.categories.length === 0) {
            categoryTabs.innerHTML = '<p class="text-secondary">No categories available</p>';
            return;
        }

        categoryTabs.innerHTML = this.state.categories.map(category => `
            <button class="filter-tab ${category.id === this.state.currentFilter ? 'active' : ''}" 
                    data-filter="${category.id}"
                    onclick="app.filterProducts('${category.id}')"
                    aria-pressed="${category.id === this.state.currentFilter}">
                ${category.name}
            </button>
        `).join('');
    }

    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        if (this.state.products.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Products Available</h3>
                    <p style="color: var(--text-secondary);">Please check back later or try refreshing the page.</p>
                </div>
            `;
            return;
        }

        const filteredProducts = this.getFilteredProducts();
        
        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Products Found</h3>
                    <p style="color: var(--text-secondary);">Try selecting a different category.</p>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');
    }

    getFilteredProducts() {
        if (this.state.currentFilter === 'all') {
            return this.state.products;
        }
        return this.state.products.filter(product => product.category === this.state.currentFilter);
    }

    createProductCard(product) {
        const isInWishlist = this.state.isInWishlist(product.id);
        const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                    ${product.tags ? `
                        <div class="product-tags">
                            ${product.tags.map(tag => `<span class="product-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${discount > 0 ? `<div class="product-tags"><span class="product-tag">-${discount}%</span></div>` : ''}
                    <div class="product-actions">
                        <button class="product-action-btn ${isInWishlist ? 'active' : ''}" 
                                onclick="app.toggleWishlist('${product.id}')"
                                aria-label="${isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="product-action-btn" 
                                onclick="app.openQuickView('${product.id}')"
                                aria-label="Quick view">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-price-container">
                        <span class="product-price">${product.price.toFixed(2)} EGP</span>
                        ${product.originalPrice ? `<span class="product-original-price">${product.originalPrice.toFixed(2)} EGP</span>` : ''}
                    </div>
                    ${product.rating ? `
                        <div class="product-rating">
                            <div class="rating-stars">
                                ${this.generateStars(product.rating)}
                            </div>
                            <span class="rating-count">(${product.reviewCount || 0})</span>
                        </div>
                    ` : ''}
                    <div class="product-options">
                        ${product.colors && product.colors.length > 0 ? `
                            <div class="product-colors">
                                <span class="options-label">Colors:</span>
                                <div class="color-options">
                                    ${product.colors.map(color => `
                                        <div class="color-option" 
                                             style="background-color: ${color.value}"
                                             title="${color.name}"
                                             data-color="${color.name}"></div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${product.sizes && product.sizes.length > 0 ? `
                            <div class="product-sizes">
                                <span class="options-label">Sizes:</span>
                                <div class="size-options">
                                    ${product.sizes.map(size => `
                                        <div class="size-option" data-size="${size}">${size}</div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="product-actions-bottom">
                        <button class="add-to-cart-btn" onclick="app.addToCart('${product.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                        <button class="quick-view-btn" onclick="app.openQuickView('${product.id}')" aria-label="Quick view">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="rating-star fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="rating-star fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="rating-star far fa-star"></i>';
        }

        return stars;
    }

    filterProducts(categoryId) {
        this.state.currentFilter = categoryId;
        
        // Update active tab
        const tabs = document.querySelectorAll('.filter-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.filter === categoryId;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-pressed', isActive);
        });

        this.renderProducts();
    }

    addToCart(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) {
            this.notifications.error('Product not found');
            return;
        }

        // Get selected options from product card
        const productCard = document.querySelector(`[data-product-id="${productId}"]`);
        const selectedColor = productCard?.querySelector('.color-option.selected')?.dataset.color;
        const selectedSize = productCard?.querySelector('.size-option.selected')?.dataset.size;

        const options = {
            quantity: 1,
            color: selectedColor,
            size: selectedSize
        };

        const success = this.state.addToCart(productId, options);
        
        if (success) {
            this.notifications.success(`${product.name} added to cart!`);
            
            // Add visual feedback
            const button = productCard?.querySelector('.add-to-cart-btn');
            if (button) {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Added!';
                button.disabled = true;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1500);
            }
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    toggleWishlist(productId) {
        const isAdded = this.state.toggleWishlist(productId);
        const product = this.state.products.find(p => p.id === productId);
        
        if (product) {
            if (isAdded) {
                this.notifications.success(`${product.name} added to wishlist!`);
            } else {
                this.notifications.info(`${product.name} removed from wishlist`);
            }
        }

        // Update wishlist button state
        const wishlistBtns = document.querySelectorAll(`[onclick="app.toggleWishlist('${productId}')"]`);
        wishlistBtns.forEach(btn => {
            btn.classList.toggle('active', isAdded);
            btn.setAttribute('aria-label', isAdded ? 'Remove from wishlist' : 'Add to wishlist');
        });
    }

    openQuickView(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) {
            this.notifications.error('Product not found');
            return;
        }

        this.state.currentProduct = product;
        const modal = document.getElementById('quickViewModal');
        const content = document.getElementById('quickViewContent');

        if (!modal || !content) return;

        content.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-image-container">
                    <img src="${product.images[0]}" alt="${product.name}" class="quick-view-image">
                </div>
                <div class="quick-view-details">
                    <h3>${product.name}</h3>
                    <div class="quick-view-price">
                        ${product.price.toFixed(2)} EGP
                        ${product.originalPrice ? `<span class="original-price">${product.originalPrice.toFixed(2)} EGP</span>` : ''}
                    </div>
                    ${product.rating ? `
                        <div class="product-rating">
                            <div class="rating-stars">${this.generateStars(product.rating)}</div>
                            <span class="rating-count">(${product.reviewCount || 0} reviews)</span>
                        </div>
                    ` : ''}
                    <p class="quick-view-description">${product.description}</p>
                    
                    ${product.colors && product.colors.length > 0 ? `
                        <div class="product-options">
                            <h4>Colors:</h4>
                            <div class="color-options">
                                ${product.colors.map(color => `
                                    <div class="color-option" 
                                         style="background-color: ${color.value}"
                                         title="${color.name}"
                                         data-color="${color.name}"
                                         onclick="this.parentElement.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected')); this.classList.add('selected');"></div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${product.sizes && product.sizes.length > 0 ? `
                        <div class="product-options">
                            <h4>Sizes:</h4>
                            <div class="size-options">
                                ${product.sizes.map(size => `
                                    <div class="size-option" 
                                         data-size="${size}"
                                         onclick="this.parentElement.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected')); this.classList.add('selected');">${size}</div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="quick-view-actions">
                        <button class="btn btn-primary" onclick="app.addToCartFromQuickView('${product.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                        <button class="btn btn-secondary" onclick="app.toggleWishlist('${product.id}')">
                            <i class="fas fa-heart"></i>
                            ${this.state.isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    addToCartFromQuickView(productId) {
        const modal = document.getElementById('quickViewModal');
        const selectedColor = modal.querySelector('.color-option.selected')?.dataset.color;
        const selectedSize = modal.querySelector('.size-option.selected')?.dataset.size;

        const options = {
            quantity: 1,
            color: selectedColor,
            size: selectedSize
        };

        const success = this.state.addToCart(productId, options);
        const product = this.state.products.find(p => p.id === productId);
        
        if (success && product) {
            this.notifications.success(`${product.name} added to cart!`);
            this.closeQuickView();
        } else {
            this.notifications.error('Failed to add item to cart');
        }
    }

    closeQuickView() {
        const modal = document.getElementById('quickViewModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
        this.state.modals.quickView = false;
    }

    toggleCartPanel() {
        const panel = document.getElementById('cartPanel');
        if (!panel) return;

        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            this.closeCartPanel();
        } else {
            panel.classList.add('open');
            document.body.style.overflow = 'hidden';
            this.state.renderCartItems();
        }
    }

    closeCartPanel() {
        const panel = document.getElementById('cartPanel');
        panel?.classList.remove('open');
        document.body.style.overflow = '';
    }

    toggleWishlistPanel() {
        const panel = document.getElementById('wishlistPanel');
        if (!panel) return;

        const isOpen = panel.classList.contains('open');
        
        if (isOpen) {
            this.closeWishlistPanel();
        } else {
            panel.classList.add('open');
            document.body.style.overflow = 'hidden';
            this.state.renderWishlistItems();
        }
    }

    closeWishlistPanel() {
        const panel = document.getElementById('wishlistPanel');
        panel?.classList.remove('open');
        document.body.style.overflow = '';
    }

    openCheckout() {
        if (this.state.cart.length === 0) {
            this.notifications.warning('Your cart is empty');
            return;
        }

        this.state.checkoutStep = 1;
        const modal = document.getElementById('checkoutModal');
        modal?.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.renderCheckoutStep();
        this.closeCartPanel();
    }

    closeCheckout() {
        const modal = document.getElementById('checkoutModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
        this.state.modals.checkout = false;
    }

    renderCheckoutStep() {
        const content = document.getElementById('checkoutContent');
        const steps = document.querySelectorAll('.step');
        
        // Update step indicators
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === this.state.checkoutStep);
            step.classList.toggle('completed', stepNumber < this.state.checkoutStep);
        });

        if (!content) return;

        switch (this.state.checkoutStep) {
            case 1:
                content.innerHTML = this.getCheckoutStep1HTML();
                break;
            case 2:
                content.innerHTML = this.getCheckoutStep2HTML();
                break;
            case 3:
                content.innerHTML = this.getCheckoutStep3HTML();
                break;
        }
    }

    getCheckoutStep1HTML() {
        return `
            <form id="checkoutStep1Form" class="checkout-form">
                <div class="form-group">
                    <label for="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName" required>
                </div>
                <div class="form-group">
                    <label for="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName" required>
                </div>
                <div class="form-group full-width">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group full-width">
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" required>
                </div>
                <div class="form-group full-width">
                    <button type="submit" class="btn btn-primary">Continue to Shipping</button>
                </div>
            </form>
        `;
    }

    getCheckoutStep2HTML() {
        return `
            <form id="checkoutStep2Form" class="checkout-form">
                <div class="form-group full-width">
                    <label for="address">Street Address</label>
                    <input type="text" id="address" name="address" required>
                </div>
                <div class="form-group">
                    <label for="city">City</label>
                    <input type="text" id="city" name="city" required>
                </div>
                <div class="form-group">
                    <label for="state">State/Province</label>
                    <input type="text" id="state" name="state" required>
                </div>
                <div class="form-group">
                    <label for="zipCode">ZIP/Postal Code</label>
                    <input type="text" id="zipCode" name="zipCode" required>
                </div>
                <div class="form-group">
                    <label for="country">Country</label>
                    <select id="country" name="country" required>
                        <option value="">Select Country</option>
                        <option value="EG">Egypt</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                        <option value="AU">Australia</option>
                    </select>
                </div>
                <div class="form-group full-width">
                    <div style="display: flex; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" onclick="app.previousCheckoutStep()">Back</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Continue to Payment</button>
                    </div>
                </div>
            </form>
        `;
    }

    getCheckoutStep3HTML() {
        const total = this.state.getCartTotal();
        return `
            <div class="checkout-summary">
                <h4>Order Summary</h4>
                <div class="order-items">
                    ${this.state.cart.map(item => `
                        <div class="order-item">
                            <span>${item.name} x ${item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)} EGP</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <strong>Total: ${total.toFixed(2)} EGP</strong>
                </div>
            </div>
            <form id="checkoutStep3Form" class="checkout-form">
                <div class="form-group full-width">
                    <label for="cardNumber">Card Number</label>
                    <input type="text" id="cardNumber" name="cardNumber" placeholder="1234 5678 9012 3456" required>
                </div>
                <div class="form-group">
                    <label for="expiryDate">Expiry Date</label>
                    <input type="text" id="expiryDate" name="expiryDate" placeholder="MM/YY" required>
                </div>
                <div class="form-group">
                    <label for="cvv">CVV</label>
                    <input type="text" id="cvv" name="cvv" placeholder="123" required>
                </div>
                <div class="form-group full-width">
                    <label for="cardName">Name on Card</label>
                    <input type="text" id="cardName" name="cardName" required>
                </div>
                <div class="form-group full-width">
                    <div style="display: flex; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" onclick="app.previousCheckoutStep()">Back</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Place Order</button>
                    </div>
                </div>
            </form>
        `;
    }

    nextCheckoutStep() {
        if (this.state.checkoutStep < 3) {
            this.state.checkoutStep++;
            this.renderCheckoutStep();
        }
    }

    previousCheckoutStep() {
        if (this.state.checkoutStep > 1) {
            this.state.checkoutStep--;
            this.renderCheckoutStep();
        }
    }

    async processOrder(formData) {
        try {
            const orderData = {
                id: Utils.generateOrderId(),
                tracking: Utils.generateTrackingNumber(),
                items: this.state.cart,
                total: this.state.getCartTotal(),
                customer: formData,
                timestamp: new Date().toISOString()
            };

            // Simulate order processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Send webhook if configured
            if (window.CONFIG?.WEBHOOK_URL && window.CONFIG.WEBHOOK_URL !== 'NEWORDER_URL') {
                try {
                    await fetch(window.CONFIG.WEBHOOK_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(orderData)
                    });
                } catch (webhookError) {
                    console.warn('Webhook failed:', webhookError);
                }
            }

            this.state.orderData = orderData;
            this.state.clearCart();
            this.closeCheckout();
            this.showSuccessModal(orderData);

        } catch (error) {
            console.error('Order processing failed:', error);
            this.notifications.error('Failed to process order. Please try again.');
        }
    }

    showSuccessModal(orderData) {
        const modal = document.getElementById('successModal');
        const details = document.getElementById('successDetails');

        if (details) {
            details.innerHTML = `
                <p><strong>Order ID:</strong> ${orderData.id}</p>
                <p><strong>Tracking Number:</strong> ${orderData.tracking}</p>
                <p><strong>Total:</strong> ${orderData.total.toFixed(2)} EGP</p>
                <p><strong>Items:</strong> ${orderData.items.length}</p>
                <p>You will receive a confirmation email shortly.</p>
            `;
        }

        modal?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeSuccess() {
        const modal = document.getElementById('successModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
        this.state.modals.success = false;
    }

    openSizeGuide() {
        const modal = document.getElementById('sizeGuideModal');
        modal?.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.state.modals.sizeGuide = true;
    }

    closeSizeGuide() {
        const modal = document.getElementById('sizeGuideModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
        this.state.modals.sizeGuide = false;
    }

    switchSizeGuideTab(category) {
        const tabs = document.querySelectorAll('.size-tab');
        const tables = document.querySelectorAll('.size-table');

        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.category === category));
        tables.forEach(table => {
            table.style.display = table.dataset.category === category ? 'block' : 'none';
        });
    }

    openReturnModal() {
        const modal = document.getElementById('returnModal');
        modal?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeReturnModal() {
        const modal = document.getElementById('returnModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
    }

    openExchangeModal() {
        const modal = document.getElementById('exchangeModal');
        modal?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeExchangeModal() {
        const modal = document.getElementById('exchangeModal');
        modal?.classList.remove('open');
        document.body.style.overflow = '';
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('open'));
        
        const panels = document.querySelectorAll('.side-panel');
        panels.forEach(panel => panel.classList.remove('open'));
        
        document.body.style.overflow = '';
        this.closeMobileMenu();
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = 70;
            const targetPosition = section.offsetTop - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    async handleNewsletterSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const email = formData.get('email');

        if (!Utils.validateEmail(email)) {
            this.notifications.error('Please enter a valid email address');
            return;
        }

        try {
            // Simulate newsletter signup
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.notifications.success('Successfully subscribed to newsletter!');
            form.reset();
        } catch (error) {
            this.notifications.error('Failed to subscribe. Please try again.');
        }
    }

    async handleContactSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            // Simulate contact form submission
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.notifications.success('Message sent successfully! We\'ll get back to you soon.');
            form.reset();
        } catch (error) {
            this.notifications.error('Failed to send message. Please try again.');
        }
    }

    async handleReturnSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const returnData = {
                orderId: formData.get('orderId'),
                email: formData.get('email'),
                reason: formData.get('reason'),
                description: formData.get('description'),
                timestamp: new Date().toISOString()
            };

            // Send webhook if configured
            if (window.CONFIG?.RETURN_WEBHOOK_URL && window.CONFIG.RETURN_WEBHOOK_URL !== 'RETURN_URL') {
                await fetch(window.CONFIG.RETURN_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(returnData)
                });
            }

            this.notifications.success('Return request submitted successfully!');
            this.closeReturnModal();
            form.reset();
        } catch (error) {
            this.notifications.error('Failed to submit return request. Please try again.');
        }
    }

    async handleExchangeSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const exchangeData = {
                orderId: formData.get('orderId'),
                email: formData.get('email'),
                reason: formData.get('reason'),
                newSize: formData.get('newSize'),
                description: formData.get('description'),
                timestamp: new Date().toISOString()
            };

            // Send webhook if configured
            if (window.CONFIG?.EXCHANGE_WEBHOOK_URL && window.CONFIG.EXCHANGE_WEBHOOK_URL !== 'EXCHANGE_URL') {
                await fetch(window.CONFIG.EXCHANGE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(exchangeData)
                });
            }

            this.notifications.success('Exchange request submitted successfully!');
            this.closeExchangeModal();
            form.reset();
        } catch (error) {
            this.notifications.error('Failed to submit exchange request. Please try again.');
        }
    }

    // Method to handle form submissions with proper validation
    setupFormHandlers() {
        const checkoutForms = document.querySelectorAll('#checkoutStep1Form, #checkoutStep2Form, #checkoutStep3Form');
        
        checkoutForms.forEach((form, index) => {
            form?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                
                if (index === 2) { // Step 3 - Final submission
                    await this.processOrder(Object.fromEntries(formData));
                } else {
                    this.nextCheckoutStep();
                }
            });
        });
    }
}

// Global app instance
window.app = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.app = new GrindCTRLApp();
    
    // Setup event delegation for dynamic content
    document.addEventListener('click', function(e) {
        // Handle product option selections
        if (e.target.classList.contains('color-option')) {
            const container = e.target.parentElement;
            container.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
        }
        
        if (e.target.classList.contains('size-option')) {
            const container = e.target.parentElement;
            container.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });
    
    // Handle form submissions dynamically
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'checkoutStep1Form' || 
            e.target.id === 'checkoutStep2Form' || 
            e.target.id === 'checkoutStep3Form') {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const stepNumber = parseInt(e.target.id.replace('checkoutStep', '').replace('Form', ''));
            
            if (stepNumber === 3) {
                window.app.processOrder(Object.fromEntries(formData));
            } else {
                window.app.nextCheckoutStep();
            }
        }
    });
    
    // Handle viewport changes for responsive behavior
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Close mobile menu if screen becomes desktop size
            if (window.innerWidth > 768) {
                window.app.closeMobileMenu();
            }
        }, 250);
    });
    
    // Handle orientation change on mobile devices
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            window.app.closeMobileMenu();
        }, 500);
    });
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GrindCTRLApp, AppState, Utils, NotificationManager };
}
