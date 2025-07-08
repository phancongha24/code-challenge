let eventSource = null;
let leaderboardData = [];
let systemConfig = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSSE();
    loadLeaderboard();
    loadConfig();
    setupForm();
    generateRandomUser();
});

// Initialize Server-Sent Events
function initializeSSE() {
    const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
    eventSource = new EventSource(`/api/events?clientId=${clientId}`);

    eventSource.onopen = function() {
        updateConnectionStatus('🟢 Connected', 'success');
    };

    eventSource.onerror = function() {
        updateConnectionStatus('🔴 Disconnected', 'error');
    };

    eventSource.addEventListener('leaderboard_update', function(event) {
        const data = JSON.parse(event.data);
        updateLeaderboard(data.leaderboard);
    });

    eventSource.addEventListener('user_score_update', function(event) {
        const data = JSON.parse(event.data);
        showNotification(`${data.userScore.username} scored ${data.userScore.score} points!`, 'info');
    });

    eventSource.addEventListener('system_message', function(event) {
        const data = JSON.parse(event.data);
        showNotification(data.message, 'info');
    });
}

// Update connection status
function updateConnectionStatus(status, type) {
    document.getElementById('connection-status').textContent = status;
}

// Load leaderboard from API
async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (data.success) {
            updateLeaderboard(data.data.leaderboard);
            document.getElementById('total-users').textContent = `👤 ${data.data.totalUsers} users`;
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        showNotification('Failed to load leaderboard', 'error');
    }
}

// Update leaderboard display
function updateLeaderboard(leaderboard) {
    const leaderboardEl = document.getElementById('leaderboard');
    leaderboardData = leaderboard;
    
    if (leaderboard.length === 0) {
        leaderboardEl.innerHTML = '<li class="loading">No users on leaderboard yet</li>';
        return;
    }

    leaderboardEl.innerHTML = leaderboard.map((user, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
        const lastUpdated = new Date(user.lastUpdated).toLocaleTimeString();
        
        return `
            <li class="leaderboard-item ${index < 3 ? 'pulse' : ''}">
                <div class="rank ${rankClass}">${user.rank}</div>
                <div class="user-info">
                    <div class="username">${user.username}</div>
                    <div class="last-updated">Updated: ${lastUpdated}</div>
                </div>
                <div class="score">${user.score}</div>
            </li>
        `;
    }).join('');

    document.getElementById('last-update').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

// Load system configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        
        if (data.success) {
            systemConfig = data.data;
            updateConfigDisplay();
        }
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}

// Update configuration display
function updateConfigDisplay() {
    if (systemConfig.rateLimit) {
        document.getElementById('rate-limit-config').textContent = 
            `${systemConfig.rateLimit.maxPoints} points/${systemConfig.rateLimit.windowMs}ms`;
    }
    
    if (systemConfig.leaderboard) {
        document.getElementById('top-count-config').textContent = systemConfig.leaderboard.topCount;
    }
    
    if (systemConfig.sse) {
        document.getElementById('connected-clients-config').textContent = systemConfig.sse.connectedClients;
        document.getElementById('clients-count').textContent = `👥 ${systemConfig.sse.connectedClients} clients`;
    }
}

// Setup form submission
function setupForm() {
    document.getElementById('score-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            userId: document.getElementById('userId').value,
            username: document.getElementById('username').value,
            action: document.getElementById('action').value
        };

        try {
            const response = await fetch('/api/user/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.success) {
                showNotification('Score updated successfully!', 'success');
                updateRateLimitInfo(data.data.rateLimitInfo);
            } else {
                showNotification(data.error, 'error');
                if (data.rateLimitInfo) {
                    updateRateLimitInfo(data.rateLimitInfo);
                }
            }
        } catch (error) {
            console.error('Failed to update score:', error);
            showNotification('Failed to update score', 'error');
        }
    });
}

// Update rate limit info display
function updateRateLimitInfo(rateLimitInfo) {
    const rateLimitEl = document.getElementById('rate-limit-info');
    rateLimitEl.style.display = 'block';
    
    // Handle both old and new format for backward compatibility
    const remainingActions = rateLimitInfo.remainingActions || rateLimitInfo.remainingPoints || 0;
    document.getElementById('remaining-points').textContent = remainingActions;
    document.getElementById('reset-time').textContent = new Date(rateLimitInfo.resetTime).toLocaleTimeString();
}

// Clear leaderboard
async function clearLeaderboard() {
    if (!confirm('Are you sure you want to clear the leaderboard?')) {
        return;
    }

    try {
        const response = await fetch('/api/leaderboard', {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Leaderboard cleared successfully!', 'success');
            loadLeaderboard();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Failed to clear leaderboard:', error);
        showNotification('Failed to clear leaderboard', 'error');
    }
}

// Generate random user data
function generateRandomUser() {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomId = 'user_' + Math.random().toString(36).substr(2, 6);
    
    document.getElementById('userId').value = randomId;
    document.getElementById('username').value = randomName;
}

// Show notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Global functions for HTML onclick handlers
window.loadLeaderboard = loadLeaderboard;
window.clearLeaderboard = clearLeaderboard;

// Auto-refresh configuration every 10 seconds
setInterval(loadConfig, 10000); 