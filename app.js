// Your live Apps Script API URL
const API_URL = "https://script.google.com/macros/s/AKfycbzHM7q9IAJeer1jno6J_fg83b_zG61EqZ1KvENWSxO4iD7_evd4CseccjPJqIXzTyGg/exec";

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const changePasswordScreen = document.getElementById('changePasswordScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loadingOverlay = document.getElementById('loadingOverlay');

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

const changePasswordForm = document.getElementById('changePasswordForm');
const passwordError = document.getElementById('passwordError');

// State
let currentUserId = "";

// Global State for Data
let inventoryItems = [];

// Toast Notification Engine
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success') {
    toastContainer.innerText = message;
    
    // Reset classes and add the specific type (success or error)
    toastContainer.className = 'toast-container';
    toastContainer.classList.add(`toast-${type}`);
    
    // Small delay to ensure CSS transition triggers if called back-to-back
    setTimeout(() => {
        toastContainer.classList.add('show');
    }, 10);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toastContainer.classList.remove('show');
    }, 3000);
}

// --- Dashboard Logic ---
async function loadDashboardStats() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getDashboardStats' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('statTodayAmount').innerText = data.stats.todayAmount.toFixed(2);
            document.getElementById('statTodayCount').innerText = data.stats.todayCount;
            document.getElementById('statTotalCount').innerText = data.stats.totalCount;
            document.getElementById('statTodayDue').innerText = data.stats.todayDue.toFixed(2);
            document.getElementById('statTotalDue').innerText = data.stats.totalDue.toFixed(2);
        }
    } catch (error) {
        console.error("Failed to load stats", error);
    }
}

// --- Item Management Logic ---
const addItemForm = document.getElementById('addItemForm');
const searchItemInput = document.getElementById('searchItem');
const itemListView = document.getElementById('itemListView');

// Save New Item
addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    
    const itemName = document.getElementById('itemName').value;
    const itemPrice = document.getElementById('itemPrice').value;
    const itemGst = document.getElementById('itemGst').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'saveItem',
                itemName: itemName,
                price: itemPrice,
                gst: itemGst
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const data = await response.json();
        if (data.success) {
            addItemForm.reset();
            showToast("Item saved successfully!", "success");
            await loadItems(); // Refresh the list automatically
        } else {
            showToast("Failed to save item.", "error");
        }
    } catch (error) {
        showToast("Connection error.", "error");
    } finally {
        hideLoader();
    }
});    

// Load Items from Server
async function loadItems() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getItems' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        
        if (data.success) {
            inventoryItems = data.items;
            renderItemList(inventoryItems);
        }
    } catch (error) {
        console.error("Failed to load items", error);
    }
}

// Render Items to HTML
function renderItemList(itemsToRender) {
    itemListView.innerHTML = ''; // Clear current list
    
    if (itemsToRender.length === 0) {
        itemListView.innerHTML = '<p style="text-align:center; color: #64748B;">No items found.</p>';
        return;
    }

    itemsToRender.forEach(item => {
        const itemDiv = document.createElement('div');
        // Simple inline CSS for the list items to make them look sharp
        itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #E2E8F0;';
        itemDiv.innerHTML = `
            <div>
                <strong style="color: var(--navy-blue); display: block;">${item.name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-light);">ID: ${item.id} | GST: ${item.gst}%</span>
            </div>
            <div style="text-align: right;">
                <strong style="color: var(--trust-green);">₹${item.finalPrice}</strong>
            </div>
        `;
        itemListView.appendChild(itemDiv);
    });
}

// Search Filter functionality
searchItemInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredItems = inventoryItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        item.id.toLowerCase().includes(searchTerm)
    );
    renderItemList(filteredItems);
});

// Tab Switching Logic
function switchTab(screenId, clickedButton) {
    // Hide all screens
    const screens = ['dashboardScreen', 'itemScreen', 'billingScreen', 'dueScreen', 'historyScreen'];
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
    
    // Show target screen
    document.getElementById(screenId).classList.remove('hidden');

    // Update active state on buttons
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => btn.classList.remove('active'));
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

// Show/Hide Loader
function showLoader() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoader() {
    loadingOverlay.classList.add('hidden');
}

// Switch Screens
function showScreen(screenElement) {
    loginScreen.classList.add('hidden');
    changePasswordScreen.classList.add('hidden');
    dashboardScreen.classList.add('hidden');
    screenElement.classList.remove('hidden');
}

// Handle Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userIdInput = document.getElementById('userId').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    loginError.classList.add('hidden');
    showLoader();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                userId: userIdInput,
                password: passwordInput
            }),
            // text/plain prevents strict CORS preflight issues with Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });

        const data = await response.json();

        if (data.success) {
            currentUserId = userIdInput;
            
            if (data.requirePasswordChange) {
                // Route to password setup
                showScreen(changePasswordScreen);
            } else {
                // Route to dashboard
                document.getElementById('welcomeMessage').innerText = `Hello, ${data.name}!`;
                showScreen(dashboardScreen);
                document.getElementById('bottomNav').classList.remove('hidden');
                
                // Fetch data in the background!
                loadDashboardStats();
                loadItems();
            }
        } else {
            loginError.innerText = data.message;
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        loginError.innerText = "Connection error. Please try again.";
        loginError.classList.remove('hidden');
    } finally {
        hideLoader();
    }
});

// Handle Password Change Form Submission
changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    passwordError.classList.add('hidden');

    if (newPassword !== confirmPassword) {
        passwordError.innerText = "Passwords do not match!";
        passwordError.classList.remove('hidden');
        return;
    }

    if (newPassword.length < 4) {
        passwordError.innerText = "Password must be at least 4 characters.";
        passwordError.classList.remove('hidden');
        return;
    }

    showLoader();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'changePassword',
                userId: currentUserId,
                newPassword: newPassword
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const data = await response.json();

        if (data.success) {
            // Password changed, send them back to login to verify
            showToast("Password updated! Please log in.", "success");
            document.getElementById('userId').value = currentUserId;
            document.getElementById('password').value = "";
            showScreen(loginScreen);
        } else {
            passwordError.innerText = data.message;
            passwordError.classList.remove('hidden');
        }
    } catch (error) {
        passwordError.innerText = "Connection error. Please try again.";
        passwordError.classList.remove('hidden');
    } finally {
        hideLoader();
    }
});
