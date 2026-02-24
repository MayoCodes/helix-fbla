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
// AUTH MODAL FUNCTIONS
// ========================

function openAuthModal(viewType) {
    const modal = document.getElementById('authModal');
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    
    modal.style.display = 'block';
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
    modal.style.display = 'none';
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

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('User logged in:', user);
        showNotification(`Welcome back, ${user.displayName || user.email}!`, 'success');
        closeAuthModal();
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
});

// Email/Password Signup
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
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
        showNotification(`Welcome, ${name}!`, 'success');
        closeAuthModal();
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
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
        showNotification(`Welcome, ${user.displayName}!`, 'success');
        closeAuthModal();
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
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
// UI UPDATE FUNCTIONS
// ========================

function updateUIForAuthenticatedUser(user) {
    const authButtons = document.querySelector('.nav-auth-buttons');
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn-login" onclick="window.location.href='home.html'">Dashboard</button>
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
// 3D PET PREVIEW SCENES
// ========================

const PET_MODELS = {
    dog: "idle02.glb",
    cat: "Leopard_Hybrid_A2.glb",
    bird: "Parrot_A4.glb"
};

function create3DPreview(canvasId, modelFile) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.95, 0.97, 0.97, 1);

    // Camera setup - same as home.html
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    camera.lowerRadiusLimit = 3;
    camera.upperRadiusLimit = 8;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2;

    // Auto-rotate camera
    let angle = 0;
    scene.registerBeforeRender(() => {
        angle += 0.005;
        camera.alpha = angle;
    });

    // Lighting
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 0.7;

    const dirLight = new BABYLON.DirectionalLight(
        "dirLight",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    dirLight.intensity = 0.5;

    // Load model
    BABYLON.SceneLoader.ImportMesh(
        "",
        "https://raw.githubusercontent.com/BabylonJS/Assets/master/meshes/",
        modelFile,
        scene,
        (meshes) => {
            if (meshes.length > 0) {
                meshes.forEach(mesh => {
                    mesh.position.y = 0;
                });
            }
        }
    );

    // Render loop
    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());
}

// Initialize 3D previews when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        create3DPreview('dogCanvas', PET_MODELS.dog);
        create3DPreview('catCanvas', PET_MODELS.cat);
        create3DPreview('birdCanvas', PET_MODELS.bird);
    }, 500);
});