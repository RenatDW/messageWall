

const socket = new WebSocket('ws://localhost:8080/ws');

socket.onmessage = function(event) {
    const messageBoard = document.querySelector('.message-board');
    const message = document.createElement('div');
    message.textContent = `Server: ${event.data}`;
    messageBoard.appendChild(message);
};

function addPost(){
    const messageBoard = document.querySelector('.message-board');
    const messageText = messageInput.value.trim();
        if (messageText === "") {
            alert("Message cannot be empty!");
                return;
        }
        fetch('/run-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify({user_id: 0, text : messageText})
        })
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    throw new Error('Failed to execute script.');
                }
            })
            .then(result => {
                const messageBlock = document.createElement('div');
                messageBlock.classList.add('message');
                messageBlock.innerHTML = `<strong>You:</strong> ${messageText}`;
    
                if (messageBoard) {
                    messageBoard.appendChild(messageBlock);
                    socket.send(messageText)
                } else {
                    console.error('Message board not found.');
                }
    
                messageInput.value = "";
            })
            .catch(error => {
                alert('Error: ' + error.message);
            });
}


function loadPosts() {
    const messageBoard = document.querySelector('.message-board');
    fetch('/api/posts')
        .then(response => response.json())
        .then(data => {
            const postsContainer = document.getElementById('posts');
            data.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.classList.add('message');
                postDiv.innerHTML = `<strong>You:</strong> ${post.Text}`;
                messageBoard.appendChild(postDiv);
            });
        })
        .catch(error => console.error('Error fetching posts:', error));
}

function login(){

}

function signup(){

}


document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('runScript').addEventListener('click' ,addPost);
    
    document.getElementById('signupButton').addEventListener('click', login);
    document.getElementById('loginButton').addEventListener('click', signup);
    loadPosts();
});