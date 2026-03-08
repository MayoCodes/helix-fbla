// ========================
// HELIX - DIGITAL PET PLATFORM
// Version 1.0
// ========================

// ========================
// FIREBASE CONFIGURATION
// ========================

const firebaseConfig = {
    apiKey: "AIzaSyAihB6sYRLLfVOqupIxn5NJWLHzaA8tJRo",
    authDomain: "helix-fbla.firebaseapp.com",
    projectId: "helix-fbla",
    storageBucket: "helix-fbla.firebasestorage.app",
    messagingSenderId: "154951525413",
    appId: "1:154951525413:web:3fa89cc765fcec9cf0cbcc"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========================
// LOADING OVERLAY
// ========================

function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(5, 11, 11, 0.85);
            backdrop-filter: blur(6px);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: white;
            font-family: 'DM Sans', sans-serif;
        `;
        overlay.innerHTML = `
            <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,.2);border-top-color:#3a9090;border-radius:50%;animation:spin .8s linear infinite;"></div>
            <p id="loadingMessage" style="font-size:15px;opacity:.7;">${message}</p>
        `;
        const spinStyle = document.createElement('style');
        spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(spinStyle);
        document.body.appendChild(overlay);
    } else {
        const msg = overlay.querySelector('#loadingMessage');
        if (msg) msg.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading(delay = 0) {
    setTimeout(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }, delay);
}

// ========================
// AUTH MODAL FUNCTIONS
// ========================

function openAuthModal(viewType) {
    const modal = document.getElementById('authModal');
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    if (viewType === 'login') {
        loginView.classList.add('active');
        signupView.classList.remove('active');
    } else {
        signupView.classList.add('active');
        loginView.classList.remove('active');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('open');
    document.body.style.overflow = 'auto';
}

function switchView(viewType) {
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');

    if (viewType === 'login') {
        signupView.classList.remove('active');
        loginView.classList.add('active');
    } else {
        loginView.classList.remove('active');
        signupView.classList.add('active');
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAuthModal();
    }
});

// ========================
// FIREBASE AUTH FUNCTIONS
// ========================

// Email/Password Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading('Logging in...');

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('User logged in:', user);
        showNotification(`Welcome back, ${user.displayName || user.email}!`, 'success');
        closeAuthModal();
        showLoading('Loading your homepage...');
        setTimeout(() => {
            window.location.href = 'homepage.html';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        hideLoading();
    }
});

// Email/Password Signup
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    showLoading('Creating your account...');

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({
            displayName: name
        });

        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('User registered:', user);
        showNotification(`Welcome, ${name}!`, 'success');
        closeAuthModal();
        showLoading('Setting up your homepage...');
        setTimeout(() => {
            window.location.href = 'homepage.html';
        }, 1000);
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        hideLoading();
    }
});

// Google Authentication
async function handleGoogleAuth(type) {
    showLoading('Signing in with Google...');
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        if (result.additionalUserInfo.isNewUser) {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('Google auth successful:', user);
        showNotification(`Welcome, ${user.displayName}!`, 'success');
        closeAuthModal();
        showLoading('Loading your homepage...');
        setTimeout(() => {
            window.location.href = 'homepage.html';
        }, 1000);
    } catch (error) {
        console.error('Google auth error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        hideLoading();
    }
}

// ========================
// AUTH STATE OBSERVER
// ========================

auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user);
        updateUIForAuthenticatedUser(user);
    } else {
        console.log('User is signed out');
        updateUIForUnauthenticatedUser();
    }
});

// ========================
// UI UPDATE FUNCTIONS
// ========================

function updateUIForAuthenticatedUser(user) {
    const authButtons = document.querySelector('.nav-auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn-login" onclick="window.location.href='homepage.html'">Homepage</button>
            <button class="btn-signup" onclick="handleLogout()">Logout</button>
        `;
    }
}

function updateUIForUnauthenticatedUser() {
    const authButtons = document.querySelector('.nav-auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn-login" onclick="openAuthModal('login')">Log In</button>
            <button class="btn-signup" onclick="openAuthModal('signup')">Sign Up</button>
        `;
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// ========================
// NOTIFICATION SYSTEM
// ========================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#ff6b6b' : '#49a6a6'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        font-weight: 600;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ========================
// SMOOTH SCROLLING
// ========================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});