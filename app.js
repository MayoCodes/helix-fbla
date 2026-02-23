// ========================
// HELIX - DIGITAL PET PLATFORM
// Version 1.0
// ========================

// ========================
// FIREBASE CONFIGURATION
// ========================

// Firebase is currently disabled. To enable Firebase authentication:
// 1. Add Firebase SDK scripts to your HTML
// 2. Add your Firebase config below
// 3. Uncomment the initialization code

// TODO: Add your Firebase configuration here
// IMPORTANT: Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > Your apps > Config
        const firebaseConfig = {
            apiKey: "AIzaSyAihB6sYRLLfVOqupIxn5NJWLHzaA8tJRo",
            authDomain: "helix-fbla.firebaseapp.com",
            projectId: "helix-fbla",
            storageBucket: "helix-fbla.firebasestorage.app",
            messagingSenderId: "154951525413",
            appId: "1:154951525413:web:3fa89cc765fcec9cf0cbcc"
        };
/*
        const MODELS = {
            a: { file: "Leopard_Hybrid_A2.glb", name: "Cat" },
            b: { file: "idle02.glb", name: "Dog" },
            c: { file: "Parrot_A4.glb", name: "Bird" }
        };

                const GEMINI_API_KEY = "AIzaSyAuJD8p0upTimf6bERw9CASFPLhqfGU8FA";
        const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
*/
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========================
// NAVIGATION SCROLL EFFECT
// ========================

window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ========================
// PARALLAX EFFECTS
// ========================

document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;

    // Parallax for hero text
    const heroText = document.querySelector('.parallax-text');
    if (heroText) {
        const moveX = (mouseX - 0.5) * 20;
        const moveY = (mouseY - 0.5) * 20;
        heroText.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }

    // Parallax for floating shapes
    const shapes = document.querySelectorAll('.floating-shape');
    shapes.forEach((shape, index) => {
        const speed = (index + 1) * 0.5;
        const moveX = (mouseX - 0.5) * speed * 30;
        const moveY = (mouseY - 0.5) * speed * 30;
        shape.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});

// ========================
// 3D TILT EFFECT FOR CARDS
// ========================

const cards = document.querySelectorAll('[data-tilt]');

cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-15px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
});

// ========================
// DEMO TAB SWITCHING
// ========================

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.demo-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.demo-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to clicked tab and corresponding content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-content`).classList.add('active');
}

// ========================
// AUTH VIEW SWITCHING
// ========================

function openAuthModal(viewType) {
    const modal = document.getElementById('authModal');
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Set the correct view
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
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchView(viewType) {
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    const authCircle = document.getElementById('authCircle');

    // Add rotation animation
    authCircle.style.transform = 'translate(-50%, -50%) rotateY(90deg)';

    setTimeout(() => {
        if (viewType === 'login') {
            signupView.classList.remove('active');
            loginView.classList.add('active');
        } else {
            loginView.classList.remove('active');
            signupView.classList.add('active');
        }

        authCircle.style.transform = 'translate(-50%, -50%) rotateY(0deg)';
    }, 250);
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('authModal');
        if (modal.classList.contains('active')) {
            closeAuthModal();
        }
    }
});

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

// ========================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ========================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
});

// ========================
// FIREBASE AUTH FUNCTIONS
// ========================

// Email/Password Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('User logged in:', user);
        handleSuccessfulAuth(user);
        closeAuthModal();
    } catch (error) {
        console.error('Login error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
});

// Email/Password Signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with name
        await user.updateProfile({
            displayName: name
        });

        // Store additional user data in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('User registered:', user);
        handleSuccessfulAuth(user);
        closeAuthModal();
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
});

// Google Authentication
async function handleGoogleAuth(type) {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // If this is a new user, create their profile
        if (result.additionalUserInfo.isNewUser) {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        console.log('Google auth successful:', user);
        handleSuccessfulAuth(user);
        closeAuthModal();
    } catch (error) {
        console.error('Google auth error:', error);
        showNotification(`Error: ${error.message}`, 'error');
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
// HELPER FUNCTIONS
// ========================

function handleSuccessfulAuth(user) {
    showNotification(`Welcome, ${user.displayName || 'User'}!`, 'success');
    // Update navbar to show Home button
    updateNavbarForAuthenticatedUser(user);
}

function updateNavbarForAuthenticatedUser(user) {
    const authButtons = document.querySelector('.nav-auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn-nav btn-home" onclick="window.location.href='home.html'">Home</button>
            <button class="btn-nav btn-logout" onclick="handleLogout()">Logout</button>
        `;
    }
}

function updateUIForAuthenticatedUser(user) {
    // Update navbar when page loads with authenticated user
    updateNavbarForAuthenticatedUser(user);
}

function updateUIForUnauthenticatedUser() {
    // Reset navbar to login/signup buttons
    const authButtons = document.querySelector('.nav-auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn-nav btn-login" onclick="openAuthModal('login')">Login</button>
            <button class="btn-nav btn-signup" onclick="openAuthModal('signup')">Sign Up</button>
        `;
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        color: var(--primary-teal);
        padding: 1rem 2rem;
        border-radius: 50px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);