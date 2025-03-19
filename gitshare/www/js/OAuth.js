// GitHub API Configuration
const GITHUB_API_URL = 'https://api.github.com';

// Initialize authentication
document.addEventListener("deviceready", function() {
    console.log('Device ready, initializing authentication...');
    
    // Check for existing authentication first
    checkAuthStatus();
    
    // Handle GitHub login button click
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        githubLoginButton.addEventListener("click", showLoginModal);
    }
});

// Show login modal with username input
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'github-username-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Sign in with GitHub</h3>
            <p class="modal-description">Enter your GitHub username to sign in.</p>
            <div class="modal-help">
                <p>This will give you basic access to view public profiles.</p>
            </div>
            <div class="input-group">
                <input type="text" id="usernameInput" placeholder="Enter your GitHub username">
            </div>
            <div class="modal-buttons">
                <button class="modal-button cancel" onclick="closeLoginModal()">Cancel</button>
                <button class="modal-button submit" onclick="verifyAndStoreUsername()">Sign In</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Close login modal
function closeLoginModal() {
    const modal = document.querySelector('.github-username-modal');
    if (modal) {
        modal.remove();
    }
}

// Check if user is already authenticated
function checkAuthStatus() {
    console.log('Checking auth status...');
    const username = localStorage.getItem("github_username");
    if (username) {
        console.log('Username found, verifying...');
        verifyUsername(username);
    } else {
        console.log('No username found');
        // Show login button if not authenticated
        const githubLoginButton = document.getElementById("githubLoginButton");
        if (githubLoginButton) {
            githubLoginButton.classList.remove("hidden");
        }
    }
}

// Verify and store username
function verifyAndStoreUsername() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        showStatusMessage('Please enter a GitHub username', 'error');
        return;
    }

    showLoadingIndicator();
    
    // Verify the username by making a request to GitHub API
    fetch(`${GITHUB_API_URL}/users/${username}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid username');
        }
        return response.json();
    })
    .then(user => {
        console.log('Username verified, storing...');
        localStorage.setItem("github_username", username);
        updateUIWithUserData(user);
        closeLoginModal();
        hideLoadingIndicator();
        showStatusMessage(`Welcome, ${username}!`, "success");
    })
    .catch(error => {
        console.error('Username verification error:', error);
        hideLoadingIndicator();
        showStatusMessage('Invalid username. Please check and try again.', 'error');
    });
}

// Verify GitHub username
function verifyUsername(username) {
    console.log('Verifying username...');
    fetch(`${GITHUB_API_URL}/users/${username}`)
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Username verification failed');
    })
    .then(user => {
        console.log('Username verified, updating UI for user:', user.login);
        updateUIWithUserData(user);
    })
    .catch(error => {
        console.error('Username verification error:', error);
        // Username is invalid, clear it and show login button
        localStorage.removeItem("github_username");
        const githubLoginButton = document.getElementById("githubLoginButton");
        if (githubLoginButton) {
            githubLoginButton.classList.remove("hidden");
        }
        showStatusMessage('Session expired, please login again', 'error');
    });
}

// Update UI with GitHub profile data
function updateUIWithUserData(user) {
    console.log('Updating UI with user data...', user);
    
    // Hide login button
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        githubLoginButton.classList.add("hidden");
    }
    
    // Show and update profile card
    const githubProfileCard = document.getElementById("githubProfileCard");
    if (githubProfileCard) {
        githubProfileCard.classList.remove("hidden");
        
        // Update profile information
        const profileImage = document.getElementById("profileImage");
        const profileName = document.getElementById("profileName");
        const profileBio = document.getElementById("profileBio");
        const profileFollowers = document.getElementById("profileFollowers");
        const profileFollowing = document.getElementById("profileFollowing");
        const profileRepos = document.getElementById("profileRepos");
        const profileLocation = document.getElementById("profileLocation");
        const profileWebsite = document.getElementById("profileWebsite");
        
        // Update profile data with proper null checks
        if (profileImage) {
            profileImage.src = user.avatar_url || "/api/placeholder/100/100";
            profileImage.onerror = function() {
                this.src = "/api/placeholder/100/100";
            };
        }
        
        if (profileName) {
            profileName.textContent = user.name || user.login || "GitHub User";
        }
        
        if (profileBio) {
            profileBio.textContent = user.bio || "No bio available";
        }
        
        if (profileFollowers) {
            profileFollowers.textContent = user.followers ? user.followers.toLocaleString() : "0";
        }
        
        if (profileFollowing) {
            profileFollowing.textContent = user.following ? user.following.toLocaleString() : "0";
        }
        
        if (profileRepos) {
            profileRepos.textContent = user.public_repos ? user.public_repos.toLocaleString() : "0";
        }
        
        if (profileLocation) {
            profileLocation.textContent = user.location || "Not specified";
        }
        
        if (profileWebsite) {
            if (user.blog) {
                const websiteUrl = user.blog.startsWith("http") ? user.blog : `https://${user.blog}`;
                profileWebsite.href = websiteUrl;
                profileWebsite.textContent = user.blog;
                profileWebsite.target = "_blank";
            } else {
                profileWebsite.href = "#";
                profileWebsite.textContent = "No website";
                profileWebsite.removeAttribute("target");
            }
        }
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
        <img src="${user.avatar_url}" alt="${user.login}" class="header-avatar" onerror="this.src='/api/placeholder/100/100'">
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