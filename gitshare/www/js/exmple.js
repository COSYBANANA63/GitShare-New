document.addEventListener("deviceready", onDeviceReady, false);

let db = null;

function onDeviceReady() {
  console.log("Device is ready");

  // back button event handler
  document.addEventListener("backbutton", handleBackButton, false);

  // Initialize navigation history stack...obob i don tire
  window.navigationStack = [];

  // Add status bar padding if available
  if (window.StatusBar) {
    StatusBar.styleDefault();
    // document.body.classList.add('has-status-bar');
  }

  // Initialize SQLite database
  db = window.sqlitePlugin.openDatabase({
    name: "githubcards.db",
    location: "default",
  });

  // Create table for saved GitHub profiles
  db.transaction(
    (tx) => {
      tx.executeSql(`
            CREATE TABLE IF NOT EXISTS github_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                name TEXT,
                bio TEXT,
                followers INTEGER,
                following INTEGER,
                repos INTEGER,
                location TEXT,
                website TEXT,
                profile_image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
      //table for messages
      // tx.executeSql(`
      //     CREATE TABLE IF NOT EXISTS user_messages (
      //         id INTEGER PRIMARY KEY AUTOINCREMENT,
      //         sender_username TEXT,
      //         receiver_username TEXT,
      //         message TEXT,
      //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAM
      //     )
      // `);
    },
    (error) => {
      console.log("Error creating table:", error);
      showStatusMessage("Error initializing database");
    },
    () => {
      loadSavedProfiles(); // Load saved profiles on startup
    }
  );

  // Event listeners
  document
    .getElementById("searchButton")
    .addEventListener("click", searchGitHub);
  document
    .getElementById("githubSearch")
    .addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        searchGitHub();
      }
    });
  document
    .getElementById("addTagButton")
    .addEventListener("click", addTagToProfile);
  document
    .getElementById("filterInput")
    .addEventListener("keyup", updateTagSuggestions);
  document
    .getElementById("clearFilters")
    .addEventListener("click", clearFilters);
  document
    .getElementById("saveProfile")
    .addEventListener("click", saveGitHubProfile);
  document
    .getElementById("shareProfile")
    .addEventListener("click", function () {
      shareGitHubProfile(document.getElementById("githubSearch").value.trim());
    });
  document
    .querySelector(".stat-item:nth-child(1)")
    .addEventListener("click", function () {
      const username = document.getElementById("githubSearch").value.trim();
      showFollowers(username);
    });

  document
    .querySelector(".stat-item:nth-child(2)")
    .addEventListener("click", function () {
      const username = document.getElementById("githubSearch").value.trim();
      showFollowing(username);
    });

  document
    .querySelector(".stat-item:nth-child(3)")
    .addEventListener("click", function () {
      const username = document.getElementById("githubSearch").value.trim();
      showRepositories(username);
    });
  document
    .getElementById("messagesButton")
    .addEventListener("click", showConversations);
  // Add keyboard event for search input
  document
    .getElementById("githubSearch")
    .addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        searchGitHubProfile();
      }
    });
  document
    .getElementById("forks-tab-button")
    .addEventListener("click", function () {
      loadRepoForks(selectedUsername, selectedRepo);
    });

  document
    .getElementById("issues-tab-button")
    .addEventListener("click", function () {
      loadRepoIssues(selectedUsername, selectedRepo);
    });

  // addMessageStyles();
  // addRepoDetailsStyles();
  setupNetworkMonitoring();
  // addInteractionStyles();
  initializeRepositoryInteractions();
  // Add touch feedback
  addTouchFeedback();
}

// Handle back button press
function handleBackButton(e) {
  e.preventDefault();

  // Check if there are any open overlays or dialogs first
  if (handleOverlaysBack()) {
    return;
  }

  // Check navigation stack
  if (window.navigationStack.length > 0) {
    // Pop the last state and navigate back
    const lastState = window.navigationStack.pop();
    navigateBack(lastState);
  } else {
    // If no more states in stack, ask user if they want to exit
    confirmExit();
  }
}

// Handle closing overlays and dialogs
function handleOverlaysBack() {
  // Check for open message dialog
  const messageDialog = document.querySelector(".message-dialog");
  if (messageDialog) {
    closeMessageDialog();
    return true;
  }

  // Check for open details card
  const detailsCard = document.getElementById("detailsCard");
  if (detailsCard && detailsCard.classList.contains("active")) {
    closeDetailsCard();
    return true;
  }

  // Check for open custom alert
  const alertOverlay = document.querySelector(".alert-overlay");
  if (alertOverlay) {
    closeCustomAlert();
    return true;
  }

  return false;
}

// Navigate back to previous state
function navigateBack(state) {
  switch (state.type) {
    case "profile":
      // Return to main profile view
      document.getElementById("githubSearch").value = state.username;
      searchGitHubProfile();
      break;

    case "savedProfiles":
      // Return to saved profiles list
      loadSavedProfiles();
      break;

    case "home":
      // Return to initial state
      document.getElementById("githubSearch").value = "";
      document.getElementById("githubProfileCard").classList.add("hidden");
      break;
  }
}

// Confirm exit dialog
function confirmExit() {
  showCustomAlert("Do you want to exit the app?", function () {
    navigator.app.exitApp();
  });
}

// Add touch feedback for buttons
function addTouchFeedback() {
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.addEventListener("touchstart", function () {
      // Save the original transform if it exists
      const originalTransform = this.style.transform || "none";
      this.dataset.originalTransform = originalTransform;

      // Only apply scale if it's not the search button (to avoid misalignment)
      if (this.id !== "searchButton") {
        this.style.transform = "scale(0.98)";
      }
    });

    button.addEventListener("touchend", function () {
      // Restore original transform or reset
      if (this.id !== "searchButton") {
        this.style.transform = this.dataset.originalTransform || "none";
      }
    });
  });
}

// Show loading indicator
function showLoading() {
  document.getElementById("loadingIndicator").classList.add("active");
}

// Hide loading indicator
function hideLoading() {
  document.getElementById("loadingIndicator").classList.remove("active");
}

// Show status message
function showStatusMessage(message, duration = 2000) {
  const statusElement = document.getElementById("statusMessage");
  statusElement.textContent = message;
  statusElement.classList.add("active");

  setTimeout(() => {
    statusElement.classList.remove("active");
  }, duration);
}

// Verify image URL - this function was missing in your original code
async function verifyImageURL(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      return url;
    } else {
      // Return a default image URL if the original URL is not accessible
      return "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
    }
  } catch (error) {
    console.error("Error verifying image URL:", error);
    return "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
  }
}

// Save GitHub profile to database
function saveGitHubProfile() {
  showLoading();

  const profile = {
    username: document.getElementById("githubSearch").value.trim(),
    name: document.getElementById("profileName").textContent,
    bio: document.getElementById("profileBio").textContent,
    followers: document.getElementById("profileFollowers").textContent,
    following: document.getElementById("profileFollowing").textContent,
    repos: document.getElementById("profileRepos").textContent,
    location: document.getElementById("profileLocation").textContent,
    website: document.getElementById("profileWebsite").href,
    profile_image: document.getElementById("profileImage").src,
  };

  db.transaction(
    (tx) => {
      tx.executeSql(
        `
            INSERT INTO github_profiles (username, name, bio, followers, following, repos, location, website, profile_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          profile.username,
          profile.name,
          profile.bio,
          profile.followers,
          profile.following,
          profile.repos,
          profile.location,
          profile.website,
          profile.profile_image,
        ],
        (tx, results) => {
          if (results.rowsAffected > 0) {
            hideLoading();
            showStatusMessage("Profile saved successfully");
            loadSavedProfiles(); // Reload saved profiles
          }
        }
      );
    },
    (error) => {
      console.error("Error saving profile:", error);
      hideLoading();
      showStatusMessage("Failed to save profile");
    }
  );
}

// Delete a saved profile
function deleteProfile(id) {
  // Show confirmation
  showCustomAlert(
    "Are you sure you want to delete this profile?",

    function () {
      showLoading();

      db.transaction(
        (tx) => {
          tx.executeSql(
            "DELETE FROM github_profiles WHERE id = ?",
            [id],
            (tx, results) => {
              if (results.rowsAffected > 0) {
                hideLoading();
                showStatusMessage("Profile deleted successfully");
                loadSavedProfiles(); // Reload saved profiles
              } else {
                hideLoading();
                showStatusMessage("Failed to delete profile");
              }
            }
          );
        },
        (error) => {
          console.error("Error deleting profile:", error);
          hideLoading();
          showStatusMessage("Error deleting profile");
        }
      );
    }
  );
}

// Load saved profiles from database
// Load saved profiles from database with tag filtering
function loadSavedProfiles() {
  const savedCardsContainer = document.getElementById("savedCards");
  savedCardsContainer.innerHTML = "";

        // Process each profile
        for (let i = 0; i < results.rows.length; i++) {
          const profile = results.rows.item(i);
          // Convert tags string to array
          profile.tags = profile.tags ? profile.tags.split(",") : [];
          const card = createSavedCard(profile);
          savedCardsContainer.appendChild(card);
        }
      }

// Create a saved profile card
function createSavedCard(profile) {
  const card = document.createElement("div");
  card.className = "saved-card";
  const messageButton = document.createElement("button");
  messageButton.className = "message-button";
  messageButton.textContent = "Message";
  messageButton.onclick = () => showMessageDialog(profile.username);
  card.appendChild(messageButton);

  // Main card click handler
  card.addEventListener("click", function (event) {
    // Prevent click from triggering if we clicked on the menu or its children
    if (
      event.target.closest(".card-menu") ||
      event.target.closest(".card-menu-dropdown")
    ) {
      return;
    }

    // Add visual feedback
    this.classList.add("card-active");

    // Get a fresh reference to the search input and profile card
    const searchInput = document.getElementById("githubSearch");
    const profileCard = document.getElementById("githubProfileCard");

    // Set the username in the search box
    searchInput.value = profile.username;

    // Prepare the profile card
    if (profileCard) {
      // Reset transition properties
      profileCard.style.transition = "none";
      profileCard.offsetHeight; // Force reflow
      profileCard.style.transition = "opacity 0.3s ease";

      // Start with opacity 0
      profileCard.style.opacity = "0";
      profileCard.classList.remove("hidden");
    }

    // Fill in the profile data directly from our saved data to avoid API call
    document.getElementById("profileImage").src = profile.profile_image;
    document.getElementById("profileName").textContent = profile.name;
    document.getElementById("profileBio").textContent = profile.bio;
    document.getElementById("profileFollowers").textContent = profile.followers;
    document.getElementById("profileFollowing").textContent = profile.following;
    document.getElementById("profileRepos").textContent = profile.repos;
    document.getElementById("profileLocation").textContent = profile.location;
    document.getElementById("profileWebsite").href = profile.website;
    document.getElementById("profileWebsite").textContent =
      profile.website !== "#" ? profile.website : "No website";

    // Hide the save button for saved profiles
    document.getElementById("saveProfile").style.display = "none";

    // Use a short timeout to ensure the visual feedback is shown before transitioning
    setTimeout(() => {
      // Remove the active class
      this.classList.remove("card-active");

      // Show the profile card with a smooth fade-in
      if (profileCard) {
        profileCard.style.opacity = "1";

        // Immediately scroll to the profile card
        profileCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  });

  // Create the card HTML structure
  card.innerHTML = `
        <div class="card-menu">
            <button class="menu-dots-button" onclick="event.stopPropagation(); toggleCardMenu(this)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="dots-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>
            <div class="card-menu-dropdown hidden">
                <button class="share-action" onclick="event.stopPropagation(); shareGitHubProfile('${
                  profile.username
                }')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="action-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                </button>
                <button class="delete-action" onclick="event.stopPropagation(); deleteProfile(${
                  profile.id
                })">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="action-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
                <button class="message-action" onclick="event.stopPropagation(); showMessageDialog(${
                  profile.id
                }, '${profile.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="action-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Messages
                </button>
                <button class="github-action" onclick="event.stopPropagation(); window.open('https://github.com/${
                  profile.username
                }', '_blank')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="action-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit GitHub
                </button>
            </div>
        </div>
        <img src="${profile.profile_image}" alt="${
    profile.name
  }" loading="lazy">
        <h3>${profile.name}</h3>
        <p>${profile.bio}</p>
        <div class="saved-card-stats">
            <span><strong>${profile.followers}</strong> followers</span>
            <span><strong>${profile.repos}</strong> repos</span>
        </div>
    `;

  return card;
}

// Function to toggle the dropdown menu visibility
function toggleCardMenu(button) {
  const dropdown = button.nextElementSibling;

  // Close all other open dropdowns first
  document
    .querySelectorAll(".card-menu-dropdown:not(.hidden)")
    .forEach((menu) => {
      if (menu !== dropdown) {
        menu.classList.add("hidden");
      }
    });

  // Toggle the current dropdown
  dropdown.classList.toggle("hidden");

  // Add click outside listener to close the dropdown
  if (!dropdown.classList.contains("hidden")) {
    setTimeout(() => {
      document.addEventListener("click", closeDropdowns);
    }, 10);
  }
}

// Function to close all dropdowns when clicking outside
function closeDropdowns(event) {
  if (!event.target.closest(".card-menu")) {
    document.querySelectorAll(".card-menu-dropdown").forEach((dropdown) => {
      dropdown.classList.add("hidden");
    });
    document.removeEventListener("click", closeDropdowns);
  }
}

// Share GitHub profile
function shareGitHubProfile(username) {
  const profileUrl = `https://github.com/${username}`;
  if (navigator.share) {
    navigator
      .share({
        title: `GitHub Profile: ${username}`,
        url: profileUrl,
      })
      .then(() => {
        console.log("Profile shared successfully");
        showStatusMessage("Profile shared successfully");
      })
      .catch((error) => {
        console.error("Error sharing profile:", error);
        showStatusMessage("Error sharing profile");
      });
  } else {
    // Fallback for devices that do not support the Web Share API
    showStatusMessage(`Share this profile: ${profileUrl}`);
  }
}

// Global variables for pagination
let currentPage = 1;
const perPage = 30; // Increased from 10
let currentEndpoint = "";
let totalPages = 1;

// Fetch and display repositories with pagination
function showRepositories(username, page = 1) {
  window.navigationStack.push({
    type: "profile",
    username: username,
  });
  showLoading();
  currentEndpoint = "repos";
  currentPage = page;

  fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=${perPage}&page=${page}`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch repositories");
      // Get total count from header if available
      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        totalPages = parseLinkHeader(linkHeader);
      }
      return response.json();
    })
    .then((repos) => {
      // Create and show the details card
      const detailsContent = createReposList(repos, username);
      showDetailsCard("Repositories", detailsContent);
      hideLoading();
    })
    .catch((error) => {
      console.error("Error fetching repositories:", error);
      hideLoading();
      showStatusMessage("Failed to fetch repositories");
    });
}

// Fetch and display followers with pagination
function showFollowers(username, page = 1) {
  window.navigationStack.push({
    type: "profile",
    username: username,
  });
  showLoading();
  currentEndpoint = "followers";
  currentPage = page;

  fetch(
    `https://api.github.com/users/${username}/followers?per_page=${perPage}&page=${page}`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch followers");
      // Get total count from header if available
      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        totalPages = parseLinkHeader(linkHeader);
      }
      return response.json();
    })
    .then((followers) => {
      // Create and show the details card
      const detailsContent = createUsersList(followers, "follower", username);
      showDetailsCard("Followers", detailsContent);
      hideLoading();
    })
    .catch((error) => {
      console.error("Error fetching followers:", error);
      hideLoading();
      showStatusMessage("Failed to fetch followers");
    });
}

// Fetch and display following with pagination
function showFollowing(username, page = 1) {
  window.navigationStack.push({
    type: "profile",
    username: username,
  });
  showLoading();
  currentEndpoint = "following";
  currentPage = page;

  fetch(
    `https://api.github.com/users/${username}/following?per_page=${perPage}&page=${page}`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch following");
      // Get total count from header if available
      const linkHeader = response.headers.get("Link");
      if (linkHeader) {
        totalPages = parseLinkHeader(linkHeader);
      }
      return response.json();
    })
    .then((following) => {
      // Create and show the details card
      const detailsContent = createUsersList(following, "following", username);
      showDetailsCard("Following", detailsContent);
      hideLoading();
    })
    .catch((error) => {
      console.error("Error fetching following:", error);
      hideLoading();
      showStatusMessage("Failed to fetch following");
    });
}

// Parse Link header to get pagination info
function parseLinkHeader(linkHeader) {
  const links = linkHeader.split(",");
  let lastPage = 1;

  // Find the 'last' link which contains the total number of pages
  links.forEach((link) => {
    if (link.includes('rel="last"')) {
      // Extract page number from the URL
      const match = link.match(/[&?]page=(\d+)/);
      if (match && match[1]) {
        lastPage = parseInt(match[1]);
      }
    }
  });

  return lastPage;
}

// Create pagination controls
function createPaginationControls(currentPage, totalPages, username) {
  if (totalPages <= 1) return "";

  let paginationHTML = `<div class="pagination">`;

  // Previous button
  if (currentPage > 1) {
    paginationHTML += `<button onclick="loadPage('${username}', ${
      currentPage - 1
    })" class="pagination-button">Previous</button>`;
  } else {
    paginationHTML += `<button disabled class="pagination-button disabled">Previous</button>`;
  }

  // Page indicator
  paginationHTML += `<span class="page-indicator">Page ${currentPage} of ${totalPages}</span>`;

  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `<button onclick="loadPage('${username}', ${
      currentPage + 1
    })" class="pagination-button">Next</button>`;
  } else {
    paginationHTML += `<button disabled class="pagination-button disabled">Next</button>`;
  }

  paginationHTML += `</div>`;
  return paginationHTML;
}

// Load a specific page based on the current endpoint
function loadPage(username, page) {
  switch (currentEndpoint) {
    case "repos":
      showRepositories(username, page);
      break;
    case "followers":
      showFollowers(username, page);
      break;
    case "following":
      showFollowing(username, page);
      break;
  }
}

// Create HTML for repositories list with pagination
function createReposList(repos, username) {
  if (repos.length === 0) {
    return '<p class="empty-message">No repositories found</p>';
  }

  return `
        <div class="details-list">
            ${repos
              .map(
                (repo) => `
                <div class="details-item">
                    <h3>
                        <a href="${repo.html_url}" target="_blank">${
                  repo.name
                }</a>
                        ${repo.fork ? '<span class="badge">Fork</span>' : ""}
                    </h3>
                    <p>${repo.description || "No description available"}</p>
                    <div class="details-meta">
                        ${
                          repo.language
                            ? `<span class="language"><span class="language-dot" style="background-color: ${getLanguageColor(
                                repo.language
                              )}"></span>${repo.language}</span>`
                            : ""
                        }
                        <span class="stars">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            ${repo.stargazers_count}
                        </span>
                        <span class="forks">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                <circle cx="18" cy="6" r="3"></circle>
                                <circle cx="6" cy="18" r="3"></circle>
                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            ${repo.forks_count}
                        </span>
                        <span class="updated">Updated ${formatDate(
                          repo.updated_at
                        )}</span>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
        ${createPaginationControls(currentPage, totalPages, username)}
    `;
}

// Create HTML for users list (followers or following) with pagination
function createUsersList(users, type, username) {
  if (users.length === 0) {
    return `<p class="empty-message">No ${type}s found</p>`;
  }

  return `
        <div class="users-grid">
            ${users
              .map(
                (user) => `
                <div class="user-item" onclick="document.getElementById('githubSearch').value = '${user.login}'; searchGitHubProfile(); closeDetailsCard();">
                    <img src="${user.avatar_url}" alt="${user.login}" loading="lazy">
                    <div class="user-info">
                        <h3>${user.login}</h3>
                        <a href="${user.html_url}" target="_blank" onclick="event.stopPropagation();">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
        ${createPaginationControls(currentPage, totalPages, username)}
    `;
}

// Show details card with content
function showDetailsCard(title, content) {
  let detailsCard = document.getElementById("detailsCard");

  // Create the card if it doesn't exist
  if (!detailsCard) {
    detailsCard = document.createElement("div");
    detailsCard.id = "detailsCard";
    detailsCard.className = "details-card";
    document.querySelector(".container").appendChild(detailsCard);
  }

  // Populate the card
  detailsCard.innerHTML = `
        <div class="details-header">
            <h2>${title}</h2>
            <button class="close-button" onclick="closeDetailsCard()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <div class="details-content">
            ${content}
        </div>
    `;

  // Show with animation
  setTimeout(() => {
    detailsCard.classList.add("active");
  }, 10);

  // Scroll to the card
  detailsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Close details card
function closeDetailsCard() {
  const detailsCard = document.getElementById("detailsCard");
  if (detailsCard) {
    detailsCard.classList.remove("active");
    setTimeout(() => {
      detailsCard.remove();
    }, 300);
  }
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // If less than a day, show hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return hours === 0 ? "just now" : `${hours} hours ago`;
  }

  // If less than a month, show days
  if (diff < 2592000000) {
    const days = Math.floor(diff / 86400000);
    return `${days} days ago`;
  }

  // Otherwise show month and day
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper function to get a color for programming languages
function getLanguageColor(language) {
  const colors = {
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Java: "#b07219",
    TypeScript: "#2b7489",
    "C#": "#178600",
    PHP: "#4F5D95",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    Go: "#00ADD8",
    Swift: "#ffac45",
    Kotlin: "#F18E33",
    Rust: "#dea584",
    HTML: "#e34c26",
    CSS: "#563d7c",
  };

  return colors[language] || "#8257e5"; // Default purple color
}

// Global variable to track if an alert is currently showing
let alertIsVisible = false;

// Custom alert/confirmation dialog
function showCustomAlert(message, confirmCallback, cancelCallback) {
  // Prevent multiple alerts
  if (alertIsVisible) return;
  alertIsVisible = true;

  // Create the alert elements
  const alertOverlay = document.createElement("div");
  alertOverlay.className = "alert-overlay";

  const alertBox = document.createElement("div");
  alertBox.className = "alert-box";

  // Add content to the alert box
  alertBox.innerHTML = `
        <p class="alert-message">${message}</p>
        <div class="alert-buttons">
            <button class="alert-button cancel-button">Cancel</button>
            <button class="alert-button confirm-button">Delete</button>
        </div>
    `;

  // Add to DOM
  alertOverlay.appendChild(alertBox);
  document.body.appendChild(alertOverlay);

  // Force reflow to enable transitions
  void alertOverlay.offsetWidth;

  // Show with animation
  alertOverlay.classList.add("visible");

  // Add event listeners for buttons
  const confirmButton = alertBox.querySelector(".confirm-button");
  const cancelButton = alertBox.querySelector(".cancel-button");

  confirmButton.addEventListener("click", function () {
    closeCustomAlert();
    if (confirmCallback) confirmCallback();
  });

  cancelButton.addEventListener("click", function () {
    closeCustomAlert();
    if (cancelCallback) cancelCallback();
  });

  // Also close when clicking the overlay (outside the box)
  alertOverlay.addEventListener("click", function (event) {
    if (event.target === alertOverlay) {
      closeCustomAlert();
      if (cancelCallback) cancelCallback();
    }
  });
}

function isProfileSaved(username, callback) {
  db.transaction(
    (tx) => {
      tx.executeSql(
        "SELECT COUNT(*) AS count FROM github_profiles WHERE username = ?",
        [username],
        (tx, results) => {
          const count = results.rows.item(0).count;
          callback(count > 0);
        }
      );
    },
    (error) => {
      console.error("Error checking if profile is saved:", error);
      callback(false);
    }
  );
}

// Close custom alert
function closeCustomAlert() {
  const alertOverlay = document.querySelector(".alert-overlay");
  if (alertOverlay) {
    alertOverlay.classList.remove("visible");

    // Remove from DOM after animation completes
    setTimeout(() => {
      document.body.removeChild(alertOverlay);
      alertIsVisible = false;
    }, 300);
  }
}

// Set a default timeout value (in milliseconds)
const NETWORK_TIMEOUT = 10000; // 10 seconds

// Keep track of loading timeouts
let loadingTimeoutId = null;

// Modified showLoading function with timeout
function showLoading() {
  document.getElementById("loadingIndicator").classList.add("active");

  // Clear any existing timeout
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
  }

  // Set a new timeout
  loadingTimeoutId = setTimeout(() => {
    hideLoading();
    showConnectionError(
      "Request timed out. Check your connection and try again."
    );
  }, NETWORK_TIMEOUT);
}

// Modified hideLoading function to clear timeout
function hideLoading() {
  document.getElementById("loadingIndicator").classList.remove("active");

  // Clear the timeout if loading completes normally
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }
}

// Function to show connection error message
function showConnectionError(message) {
  const errorBanner = document.getElementById("connectionError");

  // Create error banner if it doesn't exist
  if (!errorBanner) {
    const banner = document.createElement("div");
    banner.id = "connectionError";
    banner.className = "connection-error";
    document.body.appendChild(banner);
  }

  // Update message and show banner
  document.getElementById("connectionError").textContent = message;
  document.getElementById("connectionError").classList.add("active");

  // Hide after 5 seconds
  setTimeout(() => {
    if (document.getElementById("connectionError")) {
      document.getElementById("connectionError").classList.remove("active");
    }
  }, 5000);
}

// Check network status on startup and when network status changes
function setupNetworkMonitoring() {
  function updateNetworkStatus() {
    if (!navigator.onLine) {
      showConnectionError("No internet connection");
    }
  }

  // Initial check
  updateNetworkStatus();

  // Listen for online/offline events
  window.addEventListener("online", function () {
    document.getElementById("connectionError")?.classList.remove("active");
  });

  window.addEventListener("offline", function () {
    showConnectionError("No internet connection");
  });
}

// Modify our network operations to handle errors better
function searchGitHubProfile() {
  const username = document.getElementById("githubSearch").value.trim();
  if (!username) {
    showStatusMessage("Please enter a GitHub username");
    return;
  }

  // Check network connection
  if (!navigator.onLine) {
    showConnectionError("No internet connection");
    return;
  }

  window.navigationStack.push({
    type: "home",
  });

  // Show loading indicator
  showLoading();

  // IMPORTANT: Get a fresh reference to the profile card element each time
  const profileCard = document.getElementById("githubProfileCard");

  // Reset any previous animation state - this is critical
  profileCard.style.transition = "none";
  profileCard.offsetHeight; // Force reflow
  profileCard.style.transition = "opacity 0.3s ease"; // Re-enable transition

  // Start with opacity 0 to ensure smooth fade-in
  profileCard.style.opacity = "0";
  profileCard.classList.remove("hidden");

  fetch(`https://api.github.com/users/${username}`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      return verifyImageURL(data.avatar_url).then((verifiedAvatarURL) => {
        // Update UI with data
        document.getElementById("profileImage").src = verifiedAvatarURL;
        document.getElementById("profileName").textContent =
          data.name || data.login;
        document.getElementById("profileBio").textContent =
          data.bio || "No bio available";
        document.getElementById("profileFollowers").textContent =
          data.followers;
        document.getElementById("profileFollowing").textContent =
          data.following;
        document.getElementById("profileRepos").textContent = data.public_repos;
        document.getElementById("profileLocation").textContent =
          data.location || "Not specified";
        document.getElementById("profileWebsite").href = data.blog || "#";
        document.getElementById("profileWebsite").textContent =
          data.blog || "No website";

        // Check if the profile is already saved
        isProfileSaved(username, (isSaved) => {
          const saveProfileButton = document.getElementById("saveProfile");
          if (isSaved) {
            saveProfileButton.style.display = "none";
          } else {
            saveProfileButton.style.display = "block";
          }

          // Use a timeout to ensure the browser has finished updating the DOM
          // This is critical for consistent transitions
          setTimeout(() => {
            profileCard.style.opacity = "1";
          }, 20);
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching GitHub profile:", error);
      showStatusMessage(error.message || "Failed to fetch GitHub profile");
      profileCard.classList.add("hidden");
    })
    .finally(() => {
      hideLoading();
    });
}

function createReposList(repos, username) {
  if (repos.length === 0) {
    return '<p class="empty-message">No repositories found</p>';
  }

  return `
        <div class="details-list">
            ${repos
              .map(
                (repo) => `
                <div class="details-item" onclick="showRepoDetails('${username}', '${
                  repo.name
                }')">
                    <h3>
                        <a href="#" onclick="event.stopPropagation();">${
                          repo.name
                        }</a>
                        ${repo.fork ? '<span class="badge">Fork</span>' : ""}
                    </h3>
                    <p>${repo.description || "No description available"}</p>
                    <div class="details-meta">
                        ${
                          repo.language
                            ? `<span class="language"><span class="language-dot" style="background-color: ${getLanguageColor(
                                repo.language
                              )}"></span>${repo.language}</span>`
                            : ""
                        }
                        <span class="stars">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            ${repo.stargazers_count}
                        </span>
                        <span class="forks">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                <circle cx="18" cy="6" r="3"></circle>
                                <circle cx="6" cy="18" r="3"></circle>
                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            ${repo.forks_count}
                        </span>
                        <span class="updated">Updated ${formatDate(
                          repo.updated_at
                        )}</span>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
        ${createPaginationControls(currentPage, totalPages, username)}
    `;
}

function showRepoDetails(username, repoName) {
  window.navigationStack.push({
    type: "profile",
    username: username,
  });

  showLoading();

  // Fetch the repository details
  fetch(`https://api.github.com/repos/${username}/${repoName}`)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch repository details");
      return response.json();
    })
    .then((repo) => {
      // Fetch README content if available
      return fetch(
        `https://api.github.com/repos/${username}/${repoName}/readme`
      )
        .then((response) => {
          if (!response.ok) {
            // If README not found, return null
            return null;
          }
          return response.json();
        })
        .catch(() => null)
        .then((readmeData) => {
          // Create and show detailed repository view
          const detailsContent = createRepoDetailsView(
            repo,
            readmeData,
            username
          );
          showDetailsCard(`Repository: ${repo.name}`, detailsContent);
          hideLoading();
        });
    })
    .catch((error) => {
      console.error("Error fetching repository details:", error);
      hideLoading();
      showStatusMessage("Failed to fetch repository details");
    });
}

// Function to create detailed repository view
function createRepoDetailsView(repo, readmeData, username) {
  // Download ZIP URL
  const downloadUrl = `https://github.com/${repo.owner.login}/${repo.name}/archive/refs/heads/${repo.default_branch}.zip`;

  let readmeContent =
    '<p class="readme-placeholder">No README found for this repository.</p>';

  if (readmeData) {
    // GitHub API returns README content as base64 encoded
    try {
      const decodedContent = atob(readmeData.content);
      // Very simple markdown rendering (just for demonstration)
      readmeContent = `<div class="readme-content">${decodedContent.replace(
        /\n/g,
        "<br>"
      )}</div>`;
    } catch (e) {
      console.error("Error decoding README content:", e);
      readmeContent =
        '<p class="readme-placeholder">Error loading README content.</p>';
    }
  }

  return `
        <div class="repo-details">
            <div class="repo-header">
                <h2>${repo.full_name}</h2>
                <p>${repo.description || "No description available"}</p>
            </div>
            
            <div class="repo-stats">
                <div class="stat-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <span>${repo.stargazers_count} stars</span>
                </div>
                
                <div class="stat-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <circle cx="18" cy="6" r="3"></circle>
                        <circle cx="6" cy="18" r="3"></circle>
                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                    <span>${repo.forks_count} forks</span>
                </div>
                
                <div class="stat-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>${repo.open_issues_count} issues</span>
                </div>
                
                ${
                  repo.language
                    ? `
                <div class="stat-badge">
                    <span class="language-dot" style="background-color: ${getLanguageColor(
                      repo.language
                    )}"></span>
                    <span>${repo.language}</span>
                </div>
                `
                    : ""
                }
                
                <div class="stat-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Updated ${formatDate(repo.updated_at)}</span>
                </div>
            </div>
            
            <div class="repo-actions">
                <a href="${
                  repo.html_url
                }" target="_blank" class="repo-action-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View on GitHub
                </a>
                
                <a href="${downloadUrl}" target="_blank" class="repo-action-button download-button" onclick="trackDownload('${username}', '${
    repo.name
  }')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download ZIP
                </a>
            </div>
            
            <div class="repo-tabs">
                <div class="tab-header">
                    <button class="tab-button active" onclick="switchRepoTab(this, 'readme')">README</button>
                    <button class="tab-button" onclick="switchRepoTab(this, 'files')">Files</button>
                    <button class="tab-button" onclick="switchRepoTab(this, 'commits')">Commits</button>
                </div>
                
                <div class="tab-content" id="readme-tab">
                    ${readmeContent}
                </div>
                
                <div class="tab-content hidden" id="files-tab">
                    <div class="loading-files">
                        <p>Loading files...</p>
                    </div>
                </div>
                
                <div class="tab-content hidden" id="commits-tab">
                    <div class="loading-commits">
                        <p>Loading commit history...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// just to render readme text more accurately
function decodeBase64(content) {
  try {
    return atob(content.replace(/\s/g, ""));
  } catch (e) {
    console.error("Error decoding Base64 content:", e);
    return "Error loading README.";
  }
}

function loadReadMe(username, repoName) {
  fetch(`https://api.github.com/repos/${username}/${repoName}/readme`)
    .then((response) => response.json())
    .then((data) => {
      const readmeContent = decodeBase64(data.content);
      document.getElementById("readme-tab").innerHTML = `
                <div class="readme-content">
                    <pre>${readmeContent}</pre>
                </div>
            `;
    })
    .catch((error) => {
      console.error("Error fetching README:", error);
      document.getElementById("readme-tab").innerHTML =
        "<p class='error-message'>README not found.</p>";
    });
}

// Function to switch between tabs in repo details
function switchRepoTab(button, tabName) {
  // Update active button
  const allTabButtons = document.querySelectorAll(".tab-button");
  allTabButtons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");

  // Hide all tab contents
  const allTabContents = document.querySelectorAll(".tab-content");
  allTabContents.forEach((tab) => tab.classList.add("hidden"));

  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.remove("hidden");
  }

  // Load content if needed
  const username = document.getElementById("githubSearch").value.trim();
  const repoName = document
    .querySelector(".repo-header h2")
    .textContent.split("/")[1];

  if (tabName === "files" && !selectedTab.querySelector(".file-list")) {
    loadRepoFiles(username, repoName);
  } else if (
    tabName === "commits" &&
    !selectedTab.querySelector(".commit-list")
  ) {
    loadRepoCommits(username, repoName);
  }
}

function loadRepoForks(username, repoName) {
  const forksTab = document.getElementById("forks-tab");
  forksTab.innerHTML = '<div class="loading">Loading forks...</div>';

  fetch(
    `https://api.github.com/repos/${username}/${repoName}/forks?per_page=10`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch forks");
      return response.json();
    })
    .then((forks) => {
      if (forks.length === 0) {
        forksTab.innerHTML =
          '<p class="empty-message">No forks found for this repository.</p>';
        return;
      }

      let forksHTML = '<ul class="repo-list">';
      forks.forEach((fork) => {
        forksHTML += `
                    <li>
                        <a href="${fork.html_url}" target="_blank">
                            <strong>${fork.owner.login}</strong> / ${fork.name}
                        </a>
                    </li>
                `;
      });
      forksHTML += "</ul>";
      forksTab.innerHTML = forksHTML;
    })
    .catch((error) => {
      console.error("Error fetching forks:", error);
      forksTab.innerHTML = '<p class="error-message">Error loading forks.</p>';
    });
}

function loadRepoIssues(username, repoName) {
  const issuesTab = document.getElementById("issues-tab");
  issuesTab.innerHTML = '<div class="loading">Fetching open issues...</div>';

  fetch(
    `https://api.github.com/repos/${username}/${repoName}/issues?per_page=10`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json();
    })
    .then((issues) => {
      if (issues.length === 0) {
        issuesTab.innerHTML =
          '<p class="empty-message">No open issues found.</p>';
        return;
      }

      let issuesHTML = '<ul class="issue-list">';
      issues.forEach((issue) => {
        issuesHTML += `
                    <li>
                        <a href="${issue.html_url}" target="_blank">
                            <strong>${issue.title}</strong> - ${issue.user.login}
                        </a>
                    </li>
                `;
      });
      issuesHTML += "</ul>";
      issuesTab.innerHTML = issuesHTML;
    })
    .catch((error) => {
      console.error("Error fetching issues:", error);
      issuesTab.innerHTML =
        '<p class="error-message">Error loading issues.</p>';
    });
}

// Function to load repository files
function loadRepoFiles(username, repoName) {
  const filesTab = document.getElementById("files-tab");
  filesTab.innerHTML =
    '<div class="loading">Loading directory structure...</div>';

  // First, fetch the default branch of the repo
  fetch(`https://api.github.com/repos/${username}/${repoName}`)
    .then((response) => response.json())
    .then((repoData) => {
      const defaultBranch = repoData.default_branch; // Get default branch dynamically

      // Now, fetch the contents of the repository using the correct branch
      return fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents?ref=${defaultBranch}`
      );
    })
    .then((response) => response.json())
    .then((files) => {
      let content = '<div class="file-tree">';
      files.forEach((file) => {
        content += `
                    <div class="file-item ${file.type}">
                        <div class="file-info">
                            <svg class="file-icon" viewBox="0 0 24 24">
                                ${
                                  file.type === "dir"
                                    ? '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
                                    : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
                                }
                            </svg>
                            <a href="${
                              file.html_url
                            }" target="_blank" class="file-name">
                                ${file.name}
                            </a>
                        </div>
                        ${
                          file.type === "file"
                            ? `<a href="${file.download_url}" 
                                download 
                                class="download-file">
                                <svg viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </a>`
                            : ""
                        }
                    </div>
                `;
      });
      content += "</div>";
      filesTab.innerHTML = content;
    })
    .catch((error) => {
      console.error("Error loading files:", error);
      filesTab.innerHTML = '<p class="error">Error loading files</p>';
    });
}

// Function to load repository commits
function loadRepoCommits(username, repoName) {
  const commitsTab = document.getElementById("commits-tab");
  commitsTab.innerHTML =
    '<div class="loading">Fetching commit history...</div>';

  fetch(
    `https://api.github.com/repos/${username}/${repoName}/commits?per_page=10`
  )
    .then((response) => {
      if (!response.ok)
        throw new Error("No commits found or failed to fetch commits");
      return response.json();
    })
    .then((commits) => {
      if (commits.length === 0) {
        commitsTab.innerHTML =
          '<p class="empty-message">No commits found in this repository.</p>';
        return;
      }

      let commitListHTML = '<div class="commit-list">';
      commits.forEach((commit) => {
        const author = commit.author
          ? commit.author.login
          : commit.commit.author
          ? commit.commit.author.name
          : "Unknown";
        const avatarUrl = commit.author
          ? commit.author.avatar_url
          : "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
        const message = commit.commit.message;
        const date = new Date(commit.commit.author.date).toLocaleDateString();

        commitListHTML += `
                    <div class="commit-item">
                        <img src="${avatarUrl}" alt="${author}" class="commit-avatar">
                        <div class="commit-details">
                            <div class="commit-message">${
                              message.split("\n")[0]
                            }</div>
                            <div class="commit-meta">
                                <span class="commit-author">${author}</span>
                                <span class="commit-date">Committed on ${date}</span>
                            </div>
                        </div>
                        <a href="${
                          commit.html_url
                        }" target="_blank" class="commit-sha">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                `;
      });

      commitListHTML += "</div>";
      commitsTab.innerHTML = commitListHTML;
    })
    .catch((error) => {
      console.error("Error fetching commits:", error);
      commitsTab.innerHTML =
        '<p class="error-message">Error loading commit history.</p>';
    });
}

// Function to track downloads
function trackDownload(username, repoName) {
  console.log(`Download requested for ${username}/${repoName}`);
  showStatusMessage(`Downloading ${repoName}.zip...`);

  // I could track this in analytics or in your SQLite DB if desired
}

// Function to handle star/fork/issues interactions
function setupRepoInteractions(repo, username) {
  console.log("Setting up repository interactions for:", repo.name);

  // Find elements using the exact selectors from your HTML structure
  const starsElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(1)"
  );
  const forksElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(2)"
  );
  const issuesElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(3)"
  );

  console.log(
    "Found elements:",
    starsElement ? "Stars ✓" : "Stars ✗",
    forksElement ? "Forks ✓" : "Forks ✗",
    issuesElement ? "Issues ✓" : "Issues ✗"
  );

  // Set up click handler for stars
  if (starsElement) {
    starsElement.style.cursor = "pointer"; // Visual indication it's clickable
    starsElement.addEventListener("click", function (e) {
      console.log("Stars clicked for:", repo.name);
      e.preventDefault();
      e.stopPropagation();
      showStarDetails(repo, username);
    });
  }

  // Set up click handler for forks
  if (forksElement) {
    forksElement.style.cursor = "pointer"; // Visual indication it's clickable
    forksElement.addEventListener("click", function (e) {
      console.log("Forks clicked for:", repo.name);
      e.preventDefault();
      e.stopPropagation();
      showForkDetails(repo, username);
    });
  }

  // Set up click handler for issues
  if (issuesElement) {
    issuesElement.style.cursor = "pointer"; // Visual indication it's clickable
    issuesElement.addEventListener("click", function (e) {
      console.log("Issues clicked for:", repo.name);
      e.preventDefault();
      e.stopPropagation();
      showIssueDetails(repo, username);
    });
  }
}

// Function to show star details and allow starring/unstarring
function showStarDetails(repo, username) {
  showLoading();

  // First check if user has starred this repository
  checkIfStarred(username, repo.name)
    .then((isStarred) => {
      // Create content for the modal
      const content = `
                <div class="star-details">
                    <div class="star-details">
        <div class="star-header">
            <h3>Star Details: ${repo.name}</h3>
            <p>${repo.stargazers_count} ${
        repo.stargazers_count === 1 ? "person has" : "people have"
      } starred this repository</p>
        </div>
                    
                    <div class="star-action">
            <a href="https://github.com/${username}/${
        repo.name
      }" target="_blank" class="button primary-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${
                  isStarred ? "currentColor" : "none"
                }" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                ${isStarred ? "View starred" : "Star this repository"}
            </a>
        </div>
                    
                    <div class="stargazers-list">
                        <h4>Recent Stargazers</h4>
                        <div id="stargazersList" class="user-list">
                            <p>Loading stargazers...</p>
                        </div>
                    </div>
                </div>
            `;

      showDetailsCard(`Star Details: ${repo.name}`, content);

      // Fetch and display recent stargazers
      fetchStargazers(username, repo.name);

      hideLoading();
    })
    .catch((error) => {
      console.error("Error checking star status:", error);
      hideLoading();
      showStatusMessage("Failed to load star details", "error");
    });
}

// Function to check if the authenticated user has starred a repository
function checkIfStarred(username, repoName) {
  // Using the OAuth token from your existing system
  const token = localStorage.getItem("github_oauth_token");

  return fetch(`https://api.github.com/user/starred/${username}/${repoName}`, {
    headers: token ? { Authorization: `token ${token}` } : {},
  })
    .then((response) => {
      // 204 means starred, 404 means not starred
      return response.status === 204;
    })
    .catch((error) => {
      console.error("Error checking if starred:", error);
      return false; // Assume not starred if error
    });
}

// Function to fetch stargazers
function fetchStargazers(username, repoName) {
  fetch(
    `https://api.github.com/repos/${username}/${repoName}/stargazers?per_page=10`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch stargazers");
      return response.json();
    })
    .then((stargazers) => {
      const stargazersList = document.getElementById("stargazersList");

      if (stargazers.length === 0) {
        stargazersList.innerHTML = "<p>No stargazers yet</p>";
        return;
      }

      let html = "";
      stargazers.forEach((user) => {
        html += `
                    <div class="user-item">
                        <img src="${user.avatar_url}" alt="${user.login}" class="user-avatar">
                        <a href="${user.html_url}" target="_blank" class="user-name">${user.login}</a>
                    </div>
                `;
      });

      stargazersList.innerHTML = html;
    })
    .catch((error) => {
      console.error("Error fetching stargazers:", error);
      document.getElementById("stargazersList").innerHTML =
        "<p>Failed to load stargazers</p>";
    });
}

// Function to show fork details
function showForkDetails(repo, username) {
  showLoading();

  fetch(
    `https://api.github.com/repos/${username}/${repo.name}/forks?per_page=10`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch forks");
      return response.json();
    })
    .then((forks) => {
      // Create content for the modal
      const content = `
                <div class="fork-details">
                    <div class="fork-header">
                        <h3>Fork Details: ${repo.name}</h3>
                        <p>${repo.forks_count} ${
        repo.forks_count === 1 ? "fork" : "forks"
      } of this repository</p>
                    </div>
                    
                    <div class="fork-action">
                        <a href="https://github.com/${username}/${
        repo.name
      }/fork" target="_blank" class="button primary-button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <line x1="6" y1="3" x2="6" y2="15"></line>
                                <circle cx="18" cy="6" r="3"></circle>
                                <circle cx="6" cy="18" r="3"></circle>
                                <path d="M18 9a9 9 0 0 1-9 9"></path>
                            </svg>
                            Fork this repository
                        </a>
                    </div>
                    
                    <div class="forks-list">
                        <h4>Recent Forks</h4>
                        <div class="user-list">
                            ${forks.length === 0 ? "<p>No forks yet</p>" : ""}
                            ${forks
                              .map(
                                (fork) => `
                                <div class="user-item">
                                    <img src="${fork.owner.avatar_url}" alt="${
                                  fork.owner.login
                                }" class="user-avatar">
                                    <div class="fork-info">
                                        <a href="${
                                          fork.html_url
                                        }" target="_blank" class="user-name">${
                                  fork.owner.login
                                }/${fork.name}</a>
                                        <span class="fork-date">Forked ${formatDate(
                                          fork.created_at
                                        )}</span>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            `;

      showDetailsCard(`Fork Details: ${repo.name}`, content);

      hideLoading();
    })
    .catch((error) => {
      console.error("Error fetching forks:", error);
      hideLoading();
      showStatusMessage("Failed to load fork details", "error");
    });
}

// Function to show issue details
function showIssueDetails(repo, username) {
  showLoading();

  fetch(
    `https://api.github.com/repos/${username}/${repo.name}/issues?per_page=10&state=open`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch issues");
      return response.json();
    })
    .then((issues) => {
      // Create content for the modal
      const content = `
                <div class="issue-details">
                    <div class="issue-header">
                        <h3>Issues: ${repo.name}</h3>
                        <p>${repo.open_issues_count} open ${
        repo.open_issues_count === 1 ? "issue" : "issues"
      }</p>
                    </div>
                    
                    <div class="issue-action">
                        <a href="https://github.com/${username}/${
        repo.name
      }/issues/new" target="_blank" class="button primary-button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Create new issue
                        </a>
                        <a href="https://github.com/${username}/${
        repo.name
      }/issues" target="_blank" class="button secondary-button">
                            View all issues
                        </a>
                    </div>
                    
                    <div class="issues-list">
                        <h4>Recent Issues</h4>
                        <div class="issues-container">
                            ${
                              issues.length === 0 ? "<p>No open issues</p>" : ""
                            }
                            ${issues
                              .map(
                                (issue) => `
                                <div class="issue-item">
                                    <div class="issue-icon ${issue.state}">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </div>
                                    <div class="issue-content">
                                        <a href="${
                                          issue.html_url
                                        }" target="_blank" class="issue-title">${
                                  issue.title
                                }</a>
                                        <div class="issue-meta">
                                            <span>#${issue.number}</span>
                                            <span>Opened ${formatDate(
                                              issue.created_at
                                            )}</span>
                                            <span>by ${issue.user.login}</span>
                                        </div>
                                        ${
                                          issue.labels.length > 0
                                            ? `
                                            <div class="issue-labels">
                                                ${issue.labels
                                                  .map(
                                                    (label) => `
                                                    <span class="issue-label" style="background-color: #${label.color}">
                                                        ${label.name}
                                                    </span>
                                                `
                                                  )
                                                  .join("")}
                                            </div>
                                        `
                                            : ""
                                        }
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            `;

      showDetailsCard(`Issues: ${repo.name}`, content);
      hideLoading();
    })
    .catch((error) => {
      console.error("Error fetching issues:", error);
      hideLoading();
      showStatusMessage("Failed to load issue details", "error");
    });
}
// Modify the createRepoDetailsView function to include setup for interaction
function modifyCreateRepoDetailsView() {
  console.log("Setting up repository interaction hooks");

  // Make sure the original function exists before attempting to modify it
  if (typeof window.createRepoDetailsView !== "function") {
    console.error(
      "createRepoDetailsView function not found, will retry in 1 second"
    );
    setTimeout(modifyCreateRepoDetailsView, 1000);
    return;
  }

  // Store the original function
  const originalCreateRepoDetailsView = window.createRepoDetailsView;

  // Override with enhanced function
  window.createRepoDetailsView = function (repo, readmeData, username) {
    console.log("Enhanced createRepoDetailsView called for:", repo.name);

    // Handle the case where repo.owner might be missing
    if (!repo.owner && repo.full_name) {
      const [ownerName, repoName] = repo.full_name.split("/");
      repo.owner = { login: ownerName };
    }

    // Call the original function to generate HTML
    const htmlResult = originalCreateRepoDetailsView(
      repo,
      readmeData,
      username
    );

    // This allows the DOM to update before we try to attach event handlers
    setTimeout(() => {
      setupRepoInteractions(repo, username);
    }, 300);

    return htmlResult;
  };

  console.log("Successfully overrode createRepoDetailsView function");
}

// Function to directly attach interactions to the current repo view
// This helps when the page is already loaded
function attachToExistingRepoView() {
  console.log("Attempting to attach interactions to existing repo view");

  // Check if there's a repo details element
  const repoDetailsElement = document.querySelector(".repo-details");
  if (!repoDetailsElement) {
    console.log("No repo details found in current view");
    return false;
  }

  // Try to extract repo information from the page
  const repoNameElement = document.querySelector(".repo-header h2");
  if (!repoNameElement) {
    console.log("Could not find repo name element");
    return false;
  }

  const fullName = repoNameElement.textContent.trim();
  const [owner, repoName] = fullName.split("/");

  // Extract stats from the page
  const starsCountElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(1) span"
  );
  const forksCountElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(2) span"
  );
  const issuesCountElement = document.querySelector(
    ".repo-stats .stat-badge:nth-child(3) span"
  );

  // Create a repo object with the information we have
  const repo = {
    name: repoName,
    full_name: fullName,
    owner: { login: owner },
    stargazers_count: starsCountElement
      ? parseInt(starsCountElement.textContent)
      : 0,
    forks_count: forksCountElement
      ? parseInt(forksCountElement.textContent)
      : 0,
    open_issues_count: issuesCountElement
      ? parseInt(issuesCountElement.textContent)
      : 0,
  };

  console.log("Extracted repo information:", repo);

  // Setup interactions
  setupRepoInteractions(repo, owner);
  return true;
}

// Main initialization function
function initializeRepositoryInteractions() {
  console.log("Initializing repository interactions");

  // Modify the create repo details function for future repo views
  modifyCreateRepoDetailsView();

  // Try to attach to existing repo view
  const attached = attachToExistingRepoView();
  if (!attached) {
    // If we couldn't attach now, try again after a short delay
    // This helps in case the page is still loading
    setTimeout(attachToExistingRepoView, 1000);
  }
}

function searchGitHub() {
  const searchTerm = document.getElementById("githubSearch").value.trim();
  const searchType = document.getElementById("searchType").value;

  if (!searchTerm) {
    showStatusMessage("Please enter a search term");
    return;
  }

  if (searchType === "user") {
    searchGitHubProfile();
  } else {
    searchGitHubRepositories(searchTerm);
  }
}

function searchGitHubRepositories(searchTerm) {
  showLoading();

  fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(
      searchTerm
    )}&sort=stars&order=desc`
  )
    .then((response) => {
      if (!response.ok) throw new Error("Failed to search repositories");
      return response.json();
    })
    .then((data) => {
      showRepositoryResults(data.items);
      hideLoading();
    })
    .catch((error) => {
      console.error("Error searching repositories:", error);
      hideLoading();
      showStatusMessage(error.message || "Failed to search repositories");
    });
}

function showRepositoryResults(repos) {
  const profileCard = document.getElementById("githubProfileCard");
  profileCard.classList.add("hidden");

  const resultsContainer =
    document.getElementById("searchResults") || createSearchResultsContainer();
  resultsContainer.innerHTML = "";

  if (repos.length === 0) {
    resultsContainer.innerHTML =
      '<p class="empty-message">No repositories found</p>';
    return;
  }

  repos.forEach((repo) => {
    const repoCard = createRepoCard(repo);
    resultsContainer.appendChild(repoCard);
  });

  // Scroll to results
  setTimeout(() => {
    resultsContainer.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 300);

  window.navigationStack.push({
    type: "search",
    searchTerm: document.getElementById("githubSearch").value.trim(),
  });
}

function createRepoCard(repo) {
  const card = document.createElement("div");
  card.className = "repo-card";
  card.innerHTML = `
        <div class="repo-header">
            <img src="${repo.owner.avatar_url}" 
                 alt="${repo.owner.login}" 
                 class="repo-owner-avatar"
                 onclick="showRepoDetails('${repo.owner.login}', '${
    repo.name
  }')">
            <div class="repo-meta">
                <h3><a href="#" onclick="event.preventDefault(); showRepoDetails('${
                  repo.owner.login
                }', '${repo.name}')">
                    ${repo.full_name}
                </a></h3>
                <p class="repo-description">${
                  repo.description || "No description available"
                }</p>
            </div>
        </div>
        <div class="repo-stats">
            <span class="stars">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                ${repo.stargazers_count}
            </span>
            <span class="forks">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <line x1="6" y1="3" x2="6" y2="15"/>
                    <circle cx="18" cy="6" r="3"/>
                    <circle cx="6" cy="18" r="3"/>
                    <path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
                ${repo.forks_count}
            </span>
            <span class="updated">
                Updated ${formatDate(repo.updated_at)}
            </span>
        </div>
    `;

  // Add click handler for entire card
  card.addEventListener("click", function (e) {
    if (!e.target.closest("a")) {
      // Prevent double trigger
      showRepoDetails(repo.owner.login, repo.name);
    }
  });

  return card;
}
function createSearchResultsContainer() {
  const existing = document.getElementById("searchResults");
  if (existing) return existing;

  const container = document.createElement("div");
  container.id = "searchResults";
  container.className = "search-results";
  document.querySelector(".container").appendChild(container);
  return container;
}

const loggedInUser = localStorage.getItem("github_username"); // Get logged-in user's GitHub username

function showMessageDialog(receiverUsername) {
  if (!loggedInUser) {
    alert("Please log in first.");
    return;
  }

  const chatBox = document.createElement("div");
  chatBox.className = "chat-dialog";
  chatBox.innerHTML = `
            <div class="chat-header">
                Chat with ${receiverUsername}
                <button class="close-chat" onclick="document.body.removeChild(this.parentNode.parentNode)">X</button>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <input type="text" id="chatMessageInput" placeholder="Type a message...">
                <button onclick="sendMessage('${receiverUsername}')">Send</button>
            </div>
        `;

  document.body.appendChild(chatBox);
  fetchMessages(receiverUsername);

  // Auto-refresh messages every 2 seconds
  setInterval(() => fetchMessages(receiverUsername), 2000);
}

function fetchMessages(receiverUsername) {
  fetch(
    `https://yourserver.com/messages.php?sender=${loggedInUser}&receiver=${receiverUsername}`
  )
    .then((response) => response.json())
    .then((messages) => {
      const chatMessages = document.getElementById("chatMessages");
      chatMessages.innerHTML = messages
        .map(
          (msg) =>
            `<div class="${msg.sender === loggedInUser ? "sent" : "received"}">
                        <strong>${msg.sender}:</strong> ${msg.message}
                    </div>`
        )
        .join("");
    })
    .catch((err) => console.error("Error fetching messages:", err));
}

function sendMessage(receiverUsername) {
  const messageInput = document.getElementById("chatMessageInput");
  const message = messageInput.value.trim();

  if (!message) return;

  fetch("https://yourserver.com/messages.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `sender=${loggedInUser}&receiver=${receiverUsername}&message=${encodeURIComponent(
      message
    )}`,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        messageInput.value = "";
        fetchMessages(receiverUsername);
      }
    })
    .catch((err) => console.error("Error sending message:", err));
}