document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatBox = document.getElementById('chat-box');
    const userMessageInput = document.getElementById('user-message');
    const sendButton = document.getElementById('send-btn');
    const stars = document.querySelectorAll('.stars i');
    const historyBox = document.getElementById('history-box');
    
    // Current rating
    let currentRating = 5; // Default to 5 stars
    
    // Initialize
    loadConversationHistory();
    
    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    userMessageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            setRating(rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });
        
        star.addEventListener('mouseout', function() {
            highlightStars(currentRating);
        });
    });
    
    // Functions
    function sendMessage() {
        const message = userMessageInput.value.trim();
        
        if (message === '') return;
        
        // Display user message
        appendUserMessage(message);
        
        // Clear input
        userMessageInput.value = '';
        
        // Send to server
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                rank: currentRating
            })
        })
        .then(response => response.json())
        .then(data => {
            // Display bot response
            appendBotMessage(data.bot_response);
            
            // Reset rating for next interaction
            setRating(5);
            
            // Reload conversation history
            loadConversationHistory();
        })
        .catch(error => {
            console.error('Error:', error);
            appendBotMessage('Sorry, there was an error processing your request.');
        });
    }
    
    function appendUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    function appendBotMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.textContent = message;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    function setRating(rating) {
        currentRating = rating;
        highlightStars(rating);
    }
    
    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            
            if (starRating <= rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    }
    
    function loadConversationHistory() {
        fetch('/api/history')
            .then(response => response.json())
            .then(data => {
                historyBox.innerHTML = '';
                
                if (data.length === 0) {
                    historyBox.innerHTML = '<p>No conversation history yet.</p>';
                    return;
                }
                
                data.forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    const userMessage = document.createElement('div');
                    userMessage.className = 'history-message history-user';
                    userMessage.textContent = 'You: ' + item.user_message;
                    
                    const botMessage = document.createElement('div');
                    botMessage.className = 'history-message history-bot';
                    botMessage.textContent = 'Bot: ' + item.bot_response;
                    
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'history-meta';
                    
                    const starsDiv = document.createElement('div');
                    starsDiv.className = 'history-stars';
                    starsDiv.innerHTML = getStarHTML(item.rank);
                    
                    const timestamp = document.createElement('div');
                    timestamp.className = 'timestamp';
                    timestamp.textContent = item.timestamp;
                    
                    metaDiv.appendChild(starsDiv);
                    metaDiv.appendChild(timestamp);
                    
                    historyItem.appendChild(userMessage);
                    historyItem.appendChild(botMessage);
                    historyItem.appendChild(metaDiv);
                    
                    historyBox.appendChild(historyItem);
                });
            })
            .catch(error => {
                console.error('Error fetching history:', error);
                historyBox.innerHTML = '<p>Error loading conversation history.</p>';
            });
    }
    
    function getStarHTML(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }
});