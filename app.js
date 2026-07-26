// Your live Apps Script API URL
const API_URL = "https://script.google.com/macros/s/AKfycbxf0TzpV8l7v9zPOdzsWtJ-HDn2WWZqF44O-EJMFq0tV4eS1v31lSHRzYmLywBIprEf/exec";

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
                document.getElementById('bottomNav').classList.remove('hidden'); // SHOW NAVBAR
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
            alert("Password updated successfully. Please log in with your new password.");
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
