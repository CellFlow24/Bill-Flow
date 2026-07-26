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

let currentUserName = "";

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

    // --- NEW: Initialize Billing Screen Data ---
    if (screenId === 'billingScreen') {
        // Generates an ID like INV-492817
        document.getElementById('billId').value = 'INV-' + Date.now().toString().slice(-6); 
        // Formats date/time accurately for India locale
        document.getElementById('billDate').value = new Date().toLocaleString('en-IN');
        
        calculateBill(); // Ensure math fields are reset to zero
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
            currentUserName = data.name;
            
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
                loadBills();
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

// --- Billing Engine State ---
let currentCart = [];

// DOM Elements for Billing
const billSearchItem = document.getElementById('billSearchItem');
const billItemDropdown = document.getElementById('billItemDropdown');
const cartBody = document.getElementById('cartBody');
const billDiscount = document.getElementById('billDiscount');
const billPaid = document.getElementById('billPaid');

// 1. Live Item Search Dropdown
billSearchItem.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    billItemDropdown.innerHTML = '';
    
    if (searchTerm.length === 0) {
        billItemDropdown.classList.add('hidden');
        return;
    }

    // Filter inventory based on search
    const filtered = inventoryItems.filter(item => item.name.toLowerCase().includes(searchTerm));
    
    if (filtered.length > 0) {
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = `<span><strong style="color: var(--navy-blue);">${item.name}</strong> <small style="color: var(--text-light);">(GST ${item.gst}%)</small></span><span>₹${item.finalPrice}</span>`;
            
            // Add to cart on click
            div.onclick = () => {
                addItemToCart(item);
                billSearchItem.value = '';
                billItemDropdown.classList.add('hidden');
            };
            billItemDropdown.appendChild(div);
        });
        billItemDropdown.classList.remove('hidden');
    } else {
        billItemDropdown.classList.add('hidden');
    }
});

// Hide dropdowns if clicked outside
document.addEventListener('click', (e) => {
    if (e.target !== billSearchItem) {
        billItemDropdown.classList.add('hidden');
    }
    if (e.target !== billMethodInput) {
        paymentDropdown.classList.add('hidden');
    }
    if (e.target !== dueSearchTypeInput) dueSearchDropdown.classList.add('hidden');
    if (e.target !== historySearchTypeInput) historySearchDropdown.classList.add('hidden');
});

// --- Custom Payment Dropdown Logic ---
const billMethodInput = document.getElementById('billMethod');
const paymentDropdown = document.getElementById('paymentDropdown');

billMethodInput.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents the document click listener from immediately hiding it
    paymentDropdown.classList.toggle('hidden');
});

function selectPayment(method) {
    billMethodInput.value = method;
    paymentDropdown.classList.add('hidden');
}

// 2. Cart Management
function addItemToCart(item) {
    const existingItem = currentCart.find(i => i.id === item.id);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        // Create a deep copy of the item and set initial quantity to 1
        currentCart.push({ ...item, qty: 1 });
    }
    renderCart();
    calculateBill();
}

function updateCartQty(index, newQty) {
    const qty = parseInt(newQty);
    if (qty > 0) {
        currentCart[index].qty = qty;
        renderCart();
        calculateBill();
    }
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    renderCart();
    calculateBill();
}

// 3. Render Cart Table UI
function renderCart() {
    cartBody.innerHTML = '';
    
    if (currentCart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748B;">No items added yet.</td></tr>';
        return;
    }

    currentCart.forEach((item, index) => {
        const itemTotal = (item.finalPrice * item.qty).toFixed(2);
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <strong style="color: var(--navy-blue);">${item.name}</strong><br>
                <small style="color: var(--text-light);">₹${item.finalPrice} / ea</small>
            </td>
            <td>
                <input type="number" value="${item.qty}" min="1" 
                    style="width: 50px; padding: 6px; border-radius: 6px; border: 1px solid #CBD5E1; text-align: center;" 
                    onchange="updateCartQty(${index}, this.value)">
            </td>
            <td style="font-weight: 600; color: var(--navy-blue);">₹${itemTotal}</td>
            <td style="text-align: right;">
                <button type="button" class="delete-btn" onclick="removeFromCart(${index})">×</button>
            </td>
        `;
        cartBody.appendChild(tr);
    });
}

// 4. The Math Calculator Engine
function calculateBill() {
    let subTotal = 0;
    let totalGst = 0;

    // Calculate totals from cart
    currentCart.forEach(item => {
        const basePrice = parseFloat(item.price);
        const gstPercent = parseFloat(item.gst);
        const qty = item.qty;
        
        const itemBaseTotal = basePrice * qty;
        const itemGstTotal = itemBaseTotal * (gstPercent / 100);
        
        // SubTotal includes the base price + GST (matches finalPrice)
        subTotal += (itemBaseTotal + itemGstTotal);
        totalGst += itemGstTotal;
    });

    // Apply Discount
    const discount = parseFloat(billDiscount.value) || 0;
    let payable = subTotal - discount;
    if (payable < 0) payable = 0; // Prevent negative payable
    
    // Calculate Due
    const paid = parseFloat(billPaid.value) || 0;
    let due = payable - paid;
    
    // Update UI Elements
    document.getElementById('summarySubTotal').innerText = `₹${subTotal.toFixed(2)}`;
    document.getElementById('summaryGst').innerText = `₹${totalGst.toFixed(2)}`;
    document.getElementById('summaryPayable').innerText = `₹${payable.toFixed(2)}`;
    
    const dueField = document.getElementById('billDue');
    dueField.value = due.toFixed(2);
    
    // Color code the Due field based on status
    if (due > 0) {
        dueField.style.color = "var(--error-red)"; // Money owed
    } else if (due < 0) {
        dueField.style.color = "var(--trust-green)"; // Overpaid / Change due
    } else {
        dueField.style.color = "var(--text-light)"; // Perfectly balanced
    }
}

// Re-calculate when user types in discount or paid amount
billDiscount.addEventListener('input', calculateBill);
billPaid.addEventListener('input', calculateBill);

// --- Phone Number Validation ---
const customerPhone = document.getElementById('customerPhone');

customerPhone.addEventListener('input', function(e) {
    // This removes anything that is NOT a number (0-9) instantly
    this.value = this.value.replace(/\D/g, '');
    
    // This acts as a backup to ensure it never exceeds 10 digits if they paste a long number
    if (this.value.length > 10) {
        this.value = this.value.slice(0, 10);
    }
});

// Remove any red error styling when they start typing
customerPhone.addEventListener('focus', function() {
    this.style.border = "1px solid #CBD5E1";
});

// --- Save & Generate Bill Logic ---
const saveBillBtn = document.getElementById('saveBillBtn');

saveBillBtn.addEventListener('click', async () => {
    // 1. Validate the form
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const location = document.getElementById('customerLocation').value.trim();

    if (!name || phone.length !== 10 || !location) {
        showToast("Please fill all customer details correctly.", "error");
        return;
    }
    if (currentCart.length === 0) {
        showToast("Cannot save an empty bill. Add items.", "error");
        return;
    }

    // 2. Gather all data
    const billPayload = {
        action: 'saveBill',
        billId: document.getElementById('billId').value,
        billDate: document.getElementById('billDate').value,
        customerName: name,
        customerPhone: phone,
        customerLocation: location,
        subTotal: document.getElementById('summarySubTotal').innerText.replace('₹', ''),
        discount: document.getElementById('billDiscount').value || 0,
        payable: document.getElementById('summaryPayable').innerText.replace('₹', ''),
        paid: document.getElementById('billPaid').value || 0,
        due: document.getElementById('billDue').value,
        method: document.getElementById('billMethod').value,
        createdBy: currentUserName,
        
        // Map the cart to calculate precise GST per item for the database
        cart: currentCart.map(item => {
            const base = parseFloat(item.price);
            const gst = parseFloat(item.gst);
            const baseTotal = base * item.qty;
            const gstTotal = baseTotal * (gst / 100);
            
            return {
                name: item.name,
                qty: item.qty,
                price: item.finalPrice, // Using final price as display price
                gstAmount: gstTotal.toFixed(2),
                itemTotal: (baseTotal + gstTotal).toFixed(2)
            };
        })
    };

    // 3. Send to Google Sheets
    showLoader();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(billPayload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const data = await response.json();
        if (data.success) {
            showToast("Bill Generated Successfully!", "success");
            
            // Reset the form for the next customer
            document.getElementById('billingForm').reset();
            currentCart = [];
            renderCart();
            calculateBill();
            
            // Generate a fresh ID and timestamp immediately
            document.getElementById('billId').value = 'INV-' + Date.now().toString().slice(-6); 
            document.getElementById('billDate').value = new Date().toLocaleString('en-IN');
            
            // Refresh Dashboard numbers in the background
            loadDashboardStats(); 
            loadBills();
            
            // Note: The PDF trigger will be added here in Phase 6!
        } else {
            showToast("Failed to save bill.", "error");
        }
    } catch (error) {
        showToast("Connection error.", "error");
    } finally {
        hideLoader();
    }
});

// --- Custom Search Dropdown Logic ---
const dueSearchTypeInput = document.getElementById('dueSearchTypeInput');
const dueSearchDropdown = document.getElementById('dueSearchDropdown');
const dueSearchType = document.getElementById('dueSearchType');

const historySearchTypeInput = document.getElementById('historySearchTypeInput');
const historySearchDropdown = document.getElementById('historySearchDropdown');
const historySearchType = document.getElementById('historySearchType');

dueSearchTypeInput.addEventListener('click', (e) => {
    e.stopPropagation();
    dueSearchDropdown.classList.toggle('hidden');
});

historySearchTypeInput.addEventListener('click', (e) => {
    e.stopPropagation();
    historySearchDropdown.classList.toggle('hidden');
});

function selectDueSearch(val, text) {
    dueSearchType.value = val;
    dueSearchTypeInput.value = text;
    dueSearchDropdown.classList.add('hidden');
    renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value);
}

function selectHistorySearch(val, text) {
    historySearchType.value = val;
    historySearchTypeInput.value = text;
    historySearchDropdown.classList.add('hidden');
    renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value);
}

// --- History & Dues Logic ---
let allBills = [];

async function loadBills() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getBills' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        
        if (data.success) {
            allBills = data.bills;
            renderBills();
        }
    } catch (error) {
        console.error("Failed to load bills", error);
    }
}

function renderBills(filterDueStr = '', filterHistoryStr = '') {
    const dueListView = document.getElementById('dueListView');
    const historyListView = document.getElementById('historyListView');
    
    dueListView.innerHTML = '';
    historyListView.innerHTML = '';
    
    const dueSearchType = document.getElementById('dueSearchType').value; // 'name' or 'id'
    const historySearchType = document.getElementById('historySearchType').value;

    let hasDue = false;
    let hasHistory = false;

    allBills.forEach(bill => {
        const isDue = parseFloat(bill.due) > 0;
        
        // Format the ugly Date string into a beautiful format (e.g., "26 Jul 2026, 11:38 AM")
        const d = new Date(bill.date);
        let niceDate = bill.date; 
        if (!isNaN(d)) {
            niceDate = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) + ', ' + d.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
        }
        
        // Add the creator's name if it exists in the database
        const creatorText = bill.createdBy ? ` • By ${bill.createdBy}` : '';

        // Build the sleek card UI
        const cardHTML = `
            <div class="bill-card" style="padding: 15px; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: var(--white);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="color: var(--navy-blue); font-size: 1.05rem;">${bill.name}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-light); text-align: right;">${niceDate}${creatorText}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                    <span style="color: var(--text-light); font-family: monospace;">${bill.id}</span>
                    <strong style="color: ${isDue ? 'var(--error-red)' : 'var(--trust-green)'};">
                        ${isDue ? 'Due: ₹' + bill.due : 'Paid: ₹' + bill.paid}
                    </strong>
                </div>
            </div>
        `;

        // Filter Logic for History Screen
        const histMatch = bill[historySearchType.value].toLowerCase().includes(filterHistoryStr.toLowerCase());
        if (histMatch) {
            historyListView.innerHTML += cardHTML;
            hasHistory = true;
        }

        // Filter Logic for Due Screen (Only show if it has a due amount)
        if (isDue) {
            const dueMatch = bill[dueSearchType.value].toLowerCase().includes(filterDueStr.toLowerCase());
            if (dueMatch) {
                dueListView.innerHTML += cardHTML;
                hasDue = true;
            }
        }
    });
    if (!hasDue) dueListView.innerHTML = '<p style="text-align:center; color: #64748B; margin-top: 20px;">No due bills found.</p>';
    if (!hasHistory) historyListView.innerHTML = '<p style="text-align:center; color: #64748B; margin-top: 20px;">No bills found.</p>';
}

// Attach Search Listeners
document.getElementById('dueSearchInput').addEventListener('input', (e) => renderBills(e.target.value, document.getElementById('historySearchInput').value));
document.getElementById('historySearchInput').addEventListener('input', (e) => renderBills(document.getElementById('dueSearchInput').value, e.target.value));
document.getElementById('dueSearchType').addEventListener('change', () => renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value));
document.getElementById('historySearchType').addEventListener('change', () => renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value));
