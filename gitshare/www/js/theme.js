// theme.js
document.addEventListener('DOMContentLoaded', function() {
    // Get theme toggle button and icons
    const themeToggle = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');
    
    // Check for saved theme preference or use default (dark)
    const savedTheme = localStorage.getItem('theme');
    
    // If there's a saved preference, apply it
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    }
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', function() {
        // Toggle light theme class
        document.body.classList.toggle('light-theme');
        
        // Update icons
        if (document.body.classList.contains('light-theme')) {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'block';
            localStorage.setItem('theme', 'light');
        } else {
            lightIcon.style.display = 'block';
            darkIcon.style.display = 'none';
            localStorage.setItem('theme', 'dark');
        }
        
        // Show status message
        const statusMessage = document.getElementById('statusMessage');
        const theme = document.body.classList.contains('light-theme') ? 'Light' : 'Dark';
        statusMessage.textContent = `${theme} theme activated`;
        statusMessage.classList.add('active');
        
        // Hide status message after 2 seconds
        setTimeout(function() {
            statusMessage.classList.remove('active');
        }, 2000);
    });
});