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

// --- Menu & Screen Logic ---
function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('open');
    document.getElementById('menuOverlay').classList.toggle('hidden');
}

function switchTab(screenId) {
    const screens = ['dashboardScreen', 'itemScreen', 'billingScreen', 'dueScreen', 'historyScreen', 'printPreviewScreen'];
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
    
    document.getElementById(screenId).classList.remove('hidden');
    
    // Initialize Billing Screen Data
    if (screenId === 'billingScreen') {
        document.getElementById('billId').value = 'INV-' + Date.now().toString().slice(-6); 
        document.getElementById('billDate').value = new Date().toLocaleString('en-IN');
        calculateBill();
    }
    window.scrollTo(0, 0); // Scroll to top when changing screens
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
                document.getElementById('topAppBar').classList.remove('hidden');
                document.getElementById('menuUserName').innerText = `Logged in as: ${data.name}`;
                
                // Fetch data in the background!
                loadDashboardStats();
                loadItems();
                loadBills();
                loadSettings();
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
            
            // Trigger the Print Preview immediately using the payload we just built
            openPrintPreview(billPayload, 'billingScreen');
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
let companySettings = {};

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

async function loadSettings() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getSettings' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        
        if (data.success) {
            companySettings = data.settings;
        }
    } catch (error) {
        console.error("Failed to load settings", error);
    }
}

function renderBills(filterDueStr = '', filterHistoryStr = '') {
    const dueListView = document.getElementById('dueListView');
    const historyListView = document.getElementById('historyListView');
    
    dueListView.innerHTML = '';
    historyListView.innerHTML = '';
    
    const dueSearchType = document.getElementById('dueSearchType').value;
    const historySearchType = document.getElementById('historySearchType').value;

    let hasDue = false;
    let hasHistory = false;

    // Helper to generate the card so we can inject the specific origin screen and Clear Button
    const createCard = (bill, origin, niceDate, creatorText, isDue) => {
        // Create the clear button HTML (Stops click from opening PDF)
        const clearBtn = isDue ? `<button onclick='event.stopPropagation(); openClearDueModal("${bill.id}", ${bill.due})' style="padding: 5px 12px; background: var(--tech-blue); color: #fff; border: none; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-left: 10px; box-shadow: 0 2px 4px rgba(0,82,255,0.2);">Clear Due</button>` : '';
        
        return `
        <div class="bill-card" onclick='openPrintPreview(${JSON.stringify(bill).replace(/'/g, "&apos;")}, "${origin}")' style="padding: 15px; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: var(--white);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <strong style="color: var(--navy-blue); font-size: 1.05rem;">${bill.name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-light); text-align: right;">${niceDate}${creatorText}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
                <span style="color: var(--text-light); font-family: monospace;">${bill.id}</span>
                <strong style="color: ${isDue ? 'var(--error-red)' : 'var(--trust-green)'}; display: flex; align-items: center;">
                    ${isDue ? 'Due: ₹' + bill.due : 'Paid: ₹' + bill.paid}
                    ${clearBtn}
                </strong>
            </div>
        </div>
        `;
    };

    allBills.forEach(bill => {
        const isDue = parseFloat(bill.due) > 0;
        
        const d = new Date(bill.date);
        let niceDate = bill.date; 
        if (!isNaN(d)) {
            niceDate = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) + ', ' + d.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
        }
        
        const creatorText = bill.createdBy ? ` • By ${bill.createdBy}` : '';

        // Filter Logic for History Screen
        const histMatch = bill[historySearchType].toLowerCase().includes(filterHistoryStr.toLowerCase());
        if (histMatch) {
            historyListView.innerHTML += createCard(bill, 'historyScreen', niceDate, creatorText, isDue);
            hasHistory = true;
        }

        // Filter Logic for Due Screen
        if (isDue) {
            const dueMatch = bill[dueSearchType].toLowerCase().includes(filterDueStr.toLowerCase());
            if (dueMatch) {
                dueListView.innerHTML += createCard(bill, 'dueScreen', niceDate, creatorText, isDue);
                hasDue = true;
            }
        }
    });
    
    if (!hasDue) dueListView.innerHTML = '<p style="text-align:center; color: #64748B; margin-top: 20px;">No due bills found.</p>';
    if (!hasHistory) historyListView.innerHTML = '<p style="text-align:center; color: #64748B; margin-top: 20px;">No bills found.</p>';
}

// --- Clear Due Modal Logic ---
const cdMethodInput = document.getElementById('cdMethod');
const cdDropdown = document.getElementById('cdMethodDropdown');
let currentClearBillId = "";

cdMethodInput.addEventListener('click', (e) => {
    e.stopPropagation();
    cdDropdown.classList.toggle('hidden');
});

function selectCdMethod(method) {
    cdMethodInput.value = method;
    cdDropdown.classList.add('hidden');
}

// Ensure clicking outside closes this new dropdown
document.addEventListener('click', (e) => {
    if (e.target !== cdMethodInput && cdDropdown) cdDropdown.classList.add('hidden');
});

function openClearDueModal(billId, dueAmount) {
    currentClearBillId = billId;
    document.getElementById('cdBillId').innerText = billId;
    document.getElementById('cdAmount').value = dueAmount; // Default to full due amount
    document.getElementById('clearDueModal').classList.remove('hidden');
}

function closeClearDueModal() {
    document.getElementById('clearDueModal').classList.add('hidden');
}

async function submitClearDue() {
    const payAmount = document.getElementById('cdAmount').value;
    
    if (!payAmount || payAmount <= 0) {
        showToast("Enter a valid amount.", "error");
        return;
    }
    
    showLoader();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'clearDue',
                billId: currentClearBillId,
                amountPaid: payAmount,
                clearDate: new Date().toLocaleString('en-IN')
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const data = await response.json();
        if (data.success) {
            showToast("Payment recorded successfully!", "success");
            closeClearDueModal();
            loadBills(); // Refresh lists
            loadDashboardStats(); // Update dashboard money stats
        } else {
            showToast("Failed to clear due.", "error");
        }
    } catch (error) {
        showToast("Connection error.", "error");
    } finally {
        hideLoader();
    }
}

// Attach Search Listeners
document.getElementById('dueSearchInput').addEventListener('input', (e) => renderBills(e.target.value, document.getElementById('historySearchInput').value));
document.getElementById('historySearchInput').addEventListener('input', (e) => renderBills(document.getElementById('dueSearchInput').value, e.target.value));
document.getElementById('dueSearchType').addEventListener('change', () => renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value));
document.getElementById('historySearchType').addEventListener('change', () => renderBills(document.getElementById('dueSearchInput').value, document.getElementById('historySearchInput').value));

// --- PDF Generator Engine ---

// Variable to remember where the user came from
let printPreviewOrigin = 'historyScreen';

function closePrintPreview() {
    switchTab(printPreviewOrigin);
}

// Helper: Convert Number to Words (Indian Rupee Format)
function numberToWords(num) {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    
    if ((num = num.toString()).length > 9) return 'Overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
    return str.toUpperCase();
}

function openPrintPreview(billData, origin = 'historyScreen') {
    printPreviewOrigin = origin;
    // 1. Populate Company Settings
    document.getElementById('invCompanyName').innerText = companySettings.CompanyName || '';
    document.getElementById('invCompanyAddress').innerText = companySettings.CompanyAddress || '';
    document.getElementById('invCompanyWebsite').innerText = companySettings.CompanyWebsite || '';
    document.getElementById('invCompanyEmail').innerText = companySettings.CompanyEmail || '';
    document.getElementById('invCompanyPhone').innerText = companySettings.CompanyPhone || '';

    // Handle GST Field Visibility
    const gstBlock = document.getElementById('invGstBlock');
    const hasGst = companySettings.GSTNumber && companySettings.GSTNumber.trim() !== '';
    if (hasGst) {
        document.getElementById('invGstNumber').innerText = companySettings.GSTNumber;
        gstBlock.style.display = 'block';
    } else {
        gstBlock.style.display = 'none'; // Hides entirely if blank
    }

    // Handle Bank Field Visibility
    const bankName = companySettings.BankName || '';
    if (bankName.trim() === '') {
        document.querySelector('.inv-bank-box').innerHTML = '<strong>Payment Options:</strong><br><br>Cash or UPI accepted.';
    } else {
        document.getElementById('invBankName').innerText = bankName;
        document.getElementById('invAccountNumber').innerText = companySettings.AccountNumber || '';
        document.getElementById('invIFSC').innerText = companySettings.IFSCCode || '';
        document.getElementById('invUPI').innerText = companySettings.UPIID || '';
    }

    // Handle Note Visibility
    const noteText = companySettings.Note || '';
    const noteContainer = document.getElementById('invNoteContainer');
    if (noteText.trim() !== '') {
        document.getElementById('invNoteText').innerText = noteText;
        noteContainer.style.display = 'flex';
    } else {
        noteContainer.style.display = 'none';
    }

    // 2. Populate Customer & Bill Info
    document.getElementById('invCustomerName').innerText = billData.customerName || billData.name;
    document.getElementById('invBillId').innerText = billData.billId || billData.id;
    
    // FORMAT THE DATE PROPERLY
    const rawDate = billData.billDate || billData.date;
    const d = new Date(rawDate);
    let niceDate = rawDate; 
    if (!isNaN(d)) {
        niceDate = d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) + ', ' + d.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'});
    }
    document.getElementById('invBillDate').innerText = niceDate;
    
    document.getElementById('invCustomerPhone').innerText = billData.customerPhone || billData.phone;
    const custLoc = billData.customerLocation || billData.location;
    document.getElementById('invCustomerLocation').innerText = custLoc;

    // 3. Populate Items Table
    const tbody = document.getElementById('invItemsBody');
    tbody.innerHTML = '';
    
    let itemsList = [];
    if (typeof billData.cart === 'string') {
        try { itemsList = JSON.parse(billData.cart); } catch(e) { itemsList = []; }
    } else {
        itemsList = billData.cart || [];
    }

    let totalGstAmount = 0;
    
    itemsList.forEach((item, idx) => {
        const tr = document.createElement('tr');
        const itemName = item.name || item.itemName; 
        const qty = item.qty;
        const rate = item.price;
        const itemTot = item.itemTotal || (parseFloat(rate) * qty).toFixed(2);
        const itemGst = parseFloat(item.gstAmount || 0);
        
        totalGstAmount += itemGst;

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="text-align: left;">${itemName}</td>
            <td>${qty}</td>
            <td>${rate}</td>
            <td>${itemTot}</td>
        `;
        tbody.appendChild(tr);
    });

    // 4. Totals, Math, and Strict GST Logic
    document.getElementById('invSubTotal').innerText = billData.subTotal;
    document.getElementById('invDiscount').innerText = billData.discount;
    document.getElementById('invPayable').innerText = billData.payable;
    document.getElementById('invTotalAmount').innerText = billData.payable;
    document.getElementById('invMethod').innerText = billData.method;
    document.getElementById('invDue').innerText = billData.due > 0 ? `₹${billData.due}` : 'N/A';
    document.getElementById('invAmountInWords').innerText = numberToWords(Math.round(billData.payable));

    // ONLY SHOW GST BLOCK IF SETTING EXISTS
    const gstCalcBlock = document.getElementById('invGstCalcBlock');
    gstCalcBlock.innerHTML = ''; 
    
    if (hasGst && totalGstAmount > 0) {
        const locString = custLoc.toLowerCase();
        if (locString.includes('west bengal') || locString.includes('west bangal') || locString.includes('wb')) {
            const splitTax = (totalGstAmount / 2).toFixed(2);
            gstCalcBlock.innerHTML = `
                <div class="calc-row" style="color: #64748B;"><span>CGST</span> <span>${splitTax}</span></div>
                <div class="calc-row" style="color: #64748B;"><span>SGST</span> <span>${splitTax}</span></div>
            `;
        } else {
            gstCalcBlock.innerHTML = `
                <div class="calc-row" style="color: #64748B;"><span>IGST</span> <span>${totalGstAmount.toFixed(2)}</span></div>
            `;
        }
    }

    // 5. PAID / DUE / CLEARED Stamp
    const stampEl = document.getElementById('invStatusStamp');
    if (parseFloat(billData.due) > 0) {
        stampEl.innerText = "DUE";
        stampEl.className = "stamp stamp-due";
    } else if (billData.clearDate && billData.clearDate.trim() !== '') {
        stampEl.innerText = "CLEARED";
        stampEl.className = "stamp stamp-paid"; // Uses the green styling
        // Show clear date on PDF
        document.getElementById('invMethod').innerText = billData.method + ` (Cleared: ${billData.clearDate.split(',')[0]})`;
    } else {
        stampEl.innerText = "PAID";
        stampEl.className = "stamp stamp-paid";
    }
    switchTab('printPreviewScreen');
}
