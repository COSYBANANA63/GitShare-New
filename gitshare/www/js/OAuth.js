// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = 'Ov23liXAudE8sQqd8pjF'; // Replace with your GitHub OAuth App Client ID
const GITHUB_REDIRECT_URI = 'gitshare://oauth/callback'; // Custom URL scheme for mobile app
const GITHUB_SCOPE = 'user repo'; // Request user and repo access

// OAuth state management
let oauthState = null;
let browserRef = null;

// Initialize OAuth flow
document.addEventListener("deviceready", function() {
    console.log('Device ready, initializing OAuth...');
    
    // Check for existing authentication first
    checkAuthStatus();
    
    // Handle GitHub login button click
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        githubLoginButton.addEventListener("click", initiateGitHubLogin);
    }
    
    // Handle deep linking
    handleDeepLink();
});

// Handle deep linking for OAuth callback
function handleDeepLink() {
    console.log('Setting up deep link handler...');
    window.handleOpenURL = function(url) {
        console.log('Deep link received:', url);
        if (url.startsWith(GITHUB_REDIRECT_URI)) {
            handleOAuthCallback(url);
        }
    };
}

// Check if user is already authenticated
function checkAuthStatus() {
    console.log('Checking auth status...');
    const token = localStorage.getItem("github_access_token");
    if (token) {
        console.log('Token found, verifying...');
        verifyToken(token);
    } else {
        console.log('No token found');
        // Show login button if not authenticated
        const githubLoginButton = document.getElementById("githubLoginButton");
        if (githubLoginButton) {
            githubLoginButton.classList.remove("hidden");
        }
    }
}

// Verify GitHub access token
function verifyToken(token) {
    console.log('Verifying token...');
    fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Token verification failed');
    })
    .then(user => {
        console.log('Token verified, updating UI for user:', user.login);
        updateUIWithUserData(user);
    })
    .catch(error => {
        console.error('Token verification error:', error);
        // Token is invalid, clear it and show login button
        localStorage.removeItem("github_access_token");
        const githubLoginButton = document.getElementById("githubLoginButton");
        if (githubLoginButton) {
            githubLoginButton.classList.remove("hidden");
        }
        showStatusMessage('Session expired, please login again', 'error');
    });
}

// Initiate GitHub OAuth flow
function initiateGitHubLogin() {
    console.log('Initiating GitHub login...');
    // Generate random state for security
    oauthState = generateRandomState();
    
    // Store state in localStorage for verification
    localStorage.setItem('oauth_state', oauthState);
    
    // Construct GitHub OAuth URL
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${encodeURIComponent(GITHUB_SCOPE)}&state=${oauthState}`;
    
    // Open GitHub login in InAppBrowser
    browserRef = cordova.InAppBrowser.open(authUrl, '_blank', 'location=yes,clearsessioncache=yes,clearcache=yes');
    
    // Listen for loadstart event
    browserRef.addEventListener('loadstart', function(event) {
        console.log('Browser loadstart:', event.url);
        if (event.url.startsWith(GITHUB_REDIRECT_URI)) {
            console.log('OAuth callback detected, closing browser...');
            browserRef.close();
            handleOAuthCallback(event.url);
        }
    });
    
    // Listen for loaderror event
    browserRef.addEventListener('loaderror', function(event) {
        console.error('Browser load error:', event);
        browserRef.close();
        showStatusMessage('Authentication failed', 'error');
    });
}

// Handle OAuth callback
function handleOAuthCallback(url) {
    console.log('Handling OAuth callback...');
    // Extract code and state from URL
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');
    
    console.log('State verification:', { received: state, stored: storedState });
    
    // Verify state to prevent CSRF attacks
    if (state === storedState) {
        exchangeCodeForToken(code);
    } else {
        console.error('OAuth state mismatch');
        showStatusMessage('Authentication failed: Invalid state', 'error');
    }
}

// Exchange authorization code for access token
function exchangeCodeForToken(code) {
    console.log('Exchanging code for token...');
    fetch('https://paper-cypress-cellar.glitch.me/exchange-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: code,
            client_id: GITHUB_CLIENT_ID,
            redirect_uri: GITHUB_REDIRECT_URI
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.access_token) {
            console.log('Token received, storing...');
            localStorage.setItem("github_access_token", data.access_token);
            localStorage.removeItem('oauth_state');
            fetchGitHubProfile(data.access_token);
        } else {
            throw new Error('No access token in response');
        }
    })
    .catch(error => {
        console.error('Token exchange error:', error);
        showStatusMessage('Authentication failed: ' + error.message, 'error');
    });
}

// Fetch GitHub profile with access token
function fetchGitHubProfile(token) {
    console.log('Fetching GitHub profile...');
    showLoadingIndicator();
    
    fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        return response.json();
    })
    .then(user => {
        console.log('Profile fetched:', user.login);
        localStorage.setItem("github_username", user.login);
        updateUIWithUserData(user);
        hideLoadingIndicator();
        showStatusMessage(`Welcome, ${user.login}!`, "success");
    })
    .catch(error => {
        console.error("Error fetching GitHub profile:", error);
        hideLoadingIndicator();
        showStatusMessage("Could not load GitHub profile: " + error.message, "error");
    });
}

// Update UI with GitHub profile data
function updateUIWithUserData(user) {
    console.log('Updating UI with user data...');
    
    // Hide login button first
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        console.log('Hiding login button...');
        githubLoginButton.classList.add("hidden");
        githubLoginButton.style.display = 'none'; // Force hide
    } else {
        console.error('Login button not found in DOM');
    }
    
    // Show and update profile card
    const githubProfileCard = document.getElementById("githubProfileCard");
    if (githubProfileCard) {
        console.log('Showing profile card...');
        githubProfileCard.classList.remove("hidden");
        githubProfileCard.style.display = 'block'; // Force show
        
        // Update profile information
        const profileImage = document.getElementById("profileImage");
        const profileName = document.getElementById("profileName");
        const profileBio = document.getElementById("profileBio");
        const profileFollowers = document.getElementById("profileFollowers");
        const profileFollowing = document.getElementById("profileFollowing");
        const profileRepos = document.getElementById("profileRepos");
        const profileLocation = document.getElementById("profileLocation");
        const profileWebsite = document.getElementById("profileWebsite");
        
        if (profileImage) profileImage.src = user.avatar_url || "/api/placeholder/100/100";
        if (profileName) profileName.textContent = user.name || user.login;
        if (profileBio) profileBio.textContent = user.bio || "No bio available";
        if (profileFollowers) profileFollowers.textContent = user.followers || 0;
        if (profileFollowing) profileFollowing.textContent = user.following || 0;
        if (profileRepos) profileRepos.textContent = user.public_repos || 0;
        if (profileLocation) profileLocation.textContent = user.location || "Not specified";
        
        if (profileWebsite) {
            if (user.blog) {
                profileWebsite.href = user.blog.startsWith("http") ? user.blog : `https://${user.blog}`;
                profileWebsite.textContent = user.blog;
            } else {
                profileWebsite.href = "#";
                profileWebsite.textContent = "No website";
            }
        }
    } else {
        console.error('Profile card not found in DOM');
    }
    
    // Add user info to header
    addUserToHeader(user);
}

// Add user info to header
function addUserToHeader(user) {
    console.log('Adding user info to header...');
    const headerUserInfo = document.createElement("div");
    headerUserInfo.className = "header-user-info";
    headerUserInfo.innerHTML = `
        <img src="${user.avatar_url}" alt="${user.login}" class="header-avatar">
        <span class="header-username">${user.login}</span>
        <button id="logoutButton" class="change-profile-button" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        </button>
    `;
    
    // Remove existing user info if present
    const existingUserInfo = document.querySelector(".header-user-info");
    if (existingUserInfo) {
        existingUserInfo.remove();
    }
    
    // Add to header
    const header = document.querySelector(".header");
    if (header) {
        header.appendChild(headerUserInfo);
        
        // Add logout functionality
        const logoutButton = document.getElementById("logoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    }
}

// Logout function
function logout() {
    console.log('Logging out...');
    // Clear stored data
    localStorage.removeItem("github_access_token");
    localStorage.removeItem('oauth_state');
    localStorage.removeItem("github_username");
    
    // Reset UI
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        githubLoginButton.classList.remove("hidden");
    }
    
    const githubProfileCard = document.getElementById("githubProfileCard");
    if (githubProfileCard) {
        githubProfileCard.classList.add("hidden");
    }
    
    const headerUserInfo = document.querySelector(".header-user-info");
    if (headerUserInfo) {
        headerUserInfo.remove();
    }
    
    showStatusMessage("Logged out successfully", "info");
}

// Generate random state for OAuth
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Show loading indicator
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) {
        loadingIndicator.classList.add("visible");
    }
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) {
        loadingIndicator.classList.remove("visible");
    }
}

// Show status message
function showStatusMessage(message, type = "info") {
    const statusMessage = document.getElementById("statusMessage");
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.add("visible");
        
        setTimeout(() => {
            statusMessage.classList.remove("visible");
        }, 3000);
    }
}