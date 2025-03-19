// GitHub Authentication Configuration
const GITHUB_API_URL = 'https://api.github.com';

// PubNub Configuration
const PUBNUB_PUBLISH_KEY = 'pub-c-b3ffaba7-7bee-435a-8bd6-91fdbee2c065'; // Replace with your PubNub publish key
const PUBNUB_SUBSCRIBE_KEY = 'sub-c-6c271c1d-0224-4aa4-99b3-c0f1cb654978'; // Replace with your PubNub subscribe key
let pubnub = null;

// Initialize authentication flow
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

// Show login modal
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'github-username-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Sign in with GitHub</h3>
            <div class="modal-description">
                Enter your GitHub username to get started. Add a Personal Access Token for full access to all features.
            </div>
            
            <div class="access-levels">
                <div class="access-level basic">
                    <h4>Basic Access</h4>
                    <ul>
                        <li>View public profiles</li>
                        <li>View public repositories</li>
                        <li>View public activity</li>
                        <li>Search public content</li>
                    </ul>
                </div>
                <div class="access-level full">
                    <h4>Full Access (with token)</h4>
                    <ul>
                        <li>Direct messaging with other users</li>
                        <li>Access private repositories</li>
                        <li>Star and follow users</li>
                        <li>Create and manage repos</li>
                        <li>Higher API rate limits</li>
                        <li>Real-time notifications</li>
                        <li>Custom profile themes</li>
                    </ul>
                </div>
            </div>

            <div class="modal-help">Quick Start:</div>
            <div class="modal-steps">
                <ul>
                    <li>Enter your GitHub username</li>
                    <li>(Optional) Add a Personal Access Token for full access</li>
                    <li>Click "Sign In" to continue</li>
                </ul>
            </div>

            <div class="modal-note">
                To create a Personal Access Token:
                <ol>
                    <li>Go to GitHub Settings → Developer Settings → Personal Access Tokens</li>
                    <li>Click "Tokens (classic)" → "Generate new token (classic)"</li>
                    <li>Select scopes: user, repo, notifications</li>
                    <li>Copy the generated token</li>
                </ol>
            </div>

            <div class="input-group">
                <input type="text" id="githubUsername" placeholder="Enter your GitHub username" />
                <input type="password" id="githubToken" placeholder="Personal Access Token (Optional)" />
            </div>
            
            <div class="modal-buttons">
                <button class="modal-button cancel">Cancel</button>
                <button class="modal-button submit">Sign In</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const usernameInput = modal.querySelector('#githubUsername');
    const tokenInput = modal.querySelector('#githubToken');
    const cancelButton = modal.querySelector('.modal-button.cancel');
    const submitButton = modal.querySelector('.modal-button.submit');

    cancelButton.addEventListener('click', () => {
        modal.remove();
        const githubLoginButton = document.getElementById('githubLoginButton');
        if (githubLoginButton) {
            githubLoginButton.classList.remove('hidden');
            githubLoginButton.style.display = 'block';
        }
    });

    submitButton.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const token = tokenInput.value.trim();

        if (!username) {
            showStatusMessage('Please enter your GitHub username', 'error');
            return;
        }

        try {
            const isValid = await verifyGitHubCredentials(username, token);
            if (isValid) {
                localStorage.setItem('githubUsername', username);
                if (token) {
                    localStorage.setItem('githubToken', token);
                    showStatusMessage(`Welcome ${username}! (Full Access)`, 'success');
                } else {
                    localStorage.removeItem('githubToken');
                    showStatusMessage(`Welcome ${username}! (Basic Access)`, 'success');
                }
                modal.remove();
                updateUIForLoggedInUser(username);
            } else {
                showStatusMessage('Invalid GitHub username or token', 'error');
            }
        } catch (error) {
            showStatusMessage('Error verifying credentials', 'error');
        }
    });

    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            tokenInput.focus();
        }
    });

    tokenInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitButton.click();
        }
    });
}

// Verify GitHub credentials
function verifyGitHubCredentials(username, token) {
    console.log('Verifying GitHub credentials...');
    showLoadingIndicator();
    
    // If token is provided, verify full access
    if (token) {
        return fetch(`${GITHUB_API_URL}/user`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Invalid token');
            }
            return response.json();
        })
        .then(user => {
            // Verify username matches
            if (user.login.toLowerCase() !== username.toLowerCase()) {
                throw new Error('Username does not match token');
            }
            
            console.log('Full access verified for user:', user.login);
            localStorage.setItem('github_username', user.login);
            localStorage.setItem('github_access_token', token);
            updateUIWithUserData(user);
            hideLoadingIndicator();
            return true;
        })
        .catch(error => {
            console.error('Authentication error:', error);
            hideLoadingIndicator();
            return false;
        });
    }
    
    // If no token, verify basic access
    return fetch(`${GITHUB_API_URL}/users/${username}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Username not found');
            }
            return response.json();
        })
        .then(user => {
            console.log('Basic access verified for user:', user.login);
            localStorage.setItem('github_username', user.login);
            localStorage.removeItem('github_access_token');
            updateUIWithUserData(user);
            hideLoadingIndicator();
            return true;
        })
        .catch(error => {
            console.error('Authentication error:', error);
            hideLoadingIndicator();
            return false;
        });
}

// Check if user is already authenticated
function checkAuthStatus() {
    console.log('Checking auth status...');
    const token = localStorage.getItem("github_access_token");
    const username = localStorage.getItem("github_username");
    
    if (token && username) {
        console.log('Credentials found, verifying...');
        // Update UI immediately with stored data
        const user = {
            login: username,
            avatar_url: localStorage.getItem("github_avatar_url") || "/api/placeholder/100/100",
            name: localStorage.getItem("github_name") || username,
            bio: localStorage.getItem("github_bio") || "No bio available",
            followers: parseInt(localStorage.getItem("github_followers") || "0"),
            following: parseInt(localStorage.getItem("github_following") || "0"),
            public_repos: parseInt(localStorage.getItem("github_repos") || "0"),
            location: localStorage.getItem("github_location") || "Not specified",
            blog: localStorage.getItem("github_website") || null
        };
        updateUIWithUserData(user);
        
        // Then verify the credentials in the background
        verifyGitHubCredentials(username, token);
    } else {
        console.log('No credentials found');
        // Show login button if not authenticated
        const githubLoginButton = document.getElementById("githubLoginButton");
        if (githubLoginButton) {
            githubLoginButton.classList.remove("hidden");
            githubLoginButton.style.display = 'block';
        }
    }
}

// Update UI with GitHub profile data
function updateUIWithUserData(user) {
    console.log('Updating UI with user data...');
    
    // Store user data in localStorage
    localStorage.setItem("github_username", user.login);
    localStorage.setItem("github_avatar_url", user.avatar_url);
    localStorage.setItem("github_name", user.name);
    localStorage.setItem("github_bio", user.bio);
    localStorage.setItem("github_followers", user.followers);
    localStorage.setItem("github_following", user.following);
    localStorage.setItem("github_repos", user.public_repos);
    localStorage.setItem("github_location", user.location);
    if (user.blog) localStorage.setItem("github_website", user.blog);
    
    // Hide login button first
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        console.log('Hiding login button...');
        githubLoginButton.classList.add("hidden");
        githubLoginButton.style.display = 'none';
    }
    
    // Show and update profile card
    const githubProfileCard = document.getElementById("githubProfileCard");
    if (githubProfileCard) {
        console.log('Showing profile card...');
        githubProfileCard.classList.remove("hidden");
        githubProfileCard.style.display = 'block';
        
        // Add username to card for messaging
        githubProfileCard.dataset.username = user.login;
        
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
    }
    
    // Add user info to header
    addUserToHeader(user);
    
    // Initialize messaging if token exists
    const token = localStorage.getItem("github_access_token");
    if (token) {
        initializeMessaging();
    }
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
        
        // Add upgrade button if needed
        addUpgradeButton(user);
    }
}

// Logout function
function logout() {
    console.log('Logging out...');
    // Clear all stored data
    localStorage.removeItem("github_access_token");
    localStorage.removeItem("github_username");
    localStorage.removeItem("github_avatar_url");
    localStorage.removeItem("github_name");
    localStorage.removeItem("github_bio");
    localStorage.removeItem("github_followers");
    localStorage.removeItem("github_following");
    localStorage.removeItem("github_repos");
    localStorage.removeItem("github_location");
    localStorage.removeItem("github_website");
    
    // Reset UI
    const githubLoginButton = document.getElementById("githubLoginButton");
    if (githubLoginButton) {
        githubLoginButton.classList.remove("hidden");
        githubLoginButton.style.display = 'block';
    }
    
    const githubProfileCard = document.getElementById("githubProfileCard");
    if (githubProfileCard) {
        githubProfileCard.classList.add("hidden");
        githubProfileCard.style.display = 'none';
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

// Add upgrade to full access button to header
function addUpgradeButton(user) {
    const token = localStorage.getItem("github_access_token");
    if (!token) {
        const headerUserInfo = document.querySelector(".header-user-info");
        if (headerUserInfo) {
            const upgradeButton = document.createElement("button");
            upgradeButton.className = "upgrade-button";
            upgradeButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade to Full Access
            `;
            upgradeButton.addEventListener("click", () => {
                showLoginModal();
            });
            headerUserInfo.appendChild(upgradeButton);
        }
    }
}

// Add messaging functionality
function initializeMessaging() {
    const token = localStorage.getItem("github_access_token");
    if (!token) return;

    // Add message button to profile cards
    const profileCards = document.querySelectorAll('.github-profile-card, .saved-card');
    profileCards.forEach(card => {
        if (!card.querySelector('.message-button')) {
            const messageButton = document.createElement('button');
            messageButton.className = 'message-button';
            messageButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Message
            `;
            messageButton.addEventListener('click', () => showMessageDialog(card.dataset.username));
            card.appendChild(messageButton);
        }
    });
}

// Initialize PubNub
function initializePubNub(username) {
    if (pubnub) return; // Already initialized
    
    pubnub = new PubNub({
        publishKey: PUBNUB_PUBLISH_KEY,
        subscribeKey: PUBNUB_SUBSCRIBE_KEY,
        userId: username
    });
    
    // Subscribe to presence events
    pubnub.subscribe({
        channels: [`chat-${username}`],
        withPresence: true
    });
    
    // Handle presence events
    pubnub.addListener({
        presence: function(event) {
            console.log('Presence event:', event);
            // Update online status if needed
        }
    });
}

// Show message dialog
function showMessageDialog(username) {
    const token = localStorage.getItem("github_access_token");
    if (!token) {
        showStatusMessage('Full access required for messaging', 'error');
        return;
    }

    const currentUser = localStorage.getItem("github_username");
    if (!currentUser) {
        showStatusMessage('Please log in to send messages', 'error');
        return;
    }

    // Initialize PubNub if not already initialized
    if (!pubnub) {
        initializePubNub(currentUser);
    }

    const dialog = document.createElement('div');
    dialog.className = 'message-dialog';
    dialog.innerHTML = `
        <div class="message-dialog-content">
            <div class="message-dialog-header">
                <h3>Message ${username}</h3>
                <button class="close-button" onclick="closeMessageDialog()">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="message-list">
                <div class="loading-messages">Loading messages...</div>
            </div>
            <div class="message-input-container">
                <textarea id="messageInput" placeholder="Type your message..." rows="1"></textarea>
                <button id="sendMessageButton">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('active'), 10);

    // Load messages
    loadMessages(username, currentUser);

    // Handle message input
    const messageInput = dialog.querySelector('#messageInput');
    const sendButton = dialog.querySelector('#sendMessageButton');

    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(username, currentUser);
        }
    });

    sendButton.addEventListener('click', () => sendMessage(username, currentUser));
}

// Load messages
async function loadMessages(username, currentUser) {
    const messageList = document.querySelector('.message-list');
    const channel = `chat-${currentUser}-${username}`;
    
    try {
        // Get message history from PubNub
        const result = await pubnub.fetchMessages({
            channels: [channel],
            count: 50
        });
        
        if (result.channels[channel]) {
            const messages = result.channels[channel];
            messageList.innerHTML = messages.map(msg => createMessageElement(msg.message, msg.uuid === currentUser)).join('');
        } else {
            messageList.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
        }
        
        // Subscribe to new messages
        pubnub.subscribe({
            channels: [channel]
        });
        
        // Handle new messages
        pubnub.addListener({
            message: function(event) {
                if (event.channel === channel) {
                    const messageElement = createMessageElement(event.message, event.publisher === currentUser);
                    messageList.insertAdjacentHTML('beforeend', messageElement);
                    messageList.scrollTop = messageList.scrollHeight;
                }
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        messageList.innerHTML = `
            <div class="error-message">
                Failed to load messages. Please try again later.
            </div>
        `;
    }
}

// Create message element
function createMessageElement(message, isSent) {
    return `
        <div class="message-item ${isSent ? 'sent' : 'received'}">
            <div class="message-content">${formatMessageText(message.text)}</div>
            <div class="message-footer">
                <span>${formatMessageDate(message.timestamp)}</span>
            </div>
        </div>
    `;
}

// Send message
async function sendMessage(username, currentUser) {
    const messageInput = document.querySelector('#messageInput');
    const message = messageInput.value.trim();
    
    if (!message) {
        messageInput.classList.add('shake');
        setTimeout(() => messageInput.classList.remove('shake'), 500);
        return;
    }

    const channel = `chat-${currentUser}-${username}`;
    
    try {
        await pubnub.publish({
            channel: channel,
            message: {
                text: message,
                timestamp: Date.now(),
                sender: currentUser
            }
        });
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        showStatusMessage('Message sent!', 'success');
    } catch (error) {
        console.error('Error sending message:', error);
        showStatusMessage('Failed to send message', 'error');
    }
}

// Close message dialog
function closeMessageDialog() {
    const dialog = document.querySelector('.message-dialog');
    if (dialog) {
        dialog.classList.remove('active');
        setTimeout(() => dialog.remove(), 300);
    }
}