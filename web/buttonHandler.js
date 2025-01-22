const socket = new WebSocket('ws://localhost:8080/ws');

socket.onmessage = function(event) {
    try {
        const messageBoard = document.querySelector('.message-board');
        const messageBlock = document.createElement('div');
        messageBlock.classList.add('message-others');
        const parsedObject = JSON.parse(event.data);

        messageBlock.innerHTML = `<strong>${parsedObject.user_id}</strong> : ${parsedObject.text}`;

        if (messageBoard) {
            messageBoard.appendChild(messageBlock);
            socket.send(parsedObject)
        }
    } catch {
        console.log("Failed to parse JSON");
    }
};

function addPost(){
    const messageBoard = document.querySelector('.message-board');
    const messageText = messageInput.value.trim();
        if (messageText === "") {
            alert("Message cannot be empty!");
                return;
        }
        fetch('/add-post', {
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
                postDiv.innerHTML = `<strong>${post.User.Name}:</strong> ${post.Text}`;
                messageBoard.appendChild(postDiv);
            });
        })
        .catch(error => console.error('Error fetching posts:', error));
}

function showLoginForm() {
    const modalContainer = document.getElementById('modalContainer');

    // Create modal window
    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button" id="closeModal">&times;</span>
                <div id="formContainer">
                    <h2>Login</h2>
                    <form id="loginForm">
                        <label for="loginEmail">Email or login</label>
                        <input type="text" id="loginEmail" placeholder="Enter your email or login" required>
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter your password" required>
                        <button type="submit" id="loginSubmit">Login</button>
                    </form>
                    <p>
                        Don't have an account? 
                        <span id="switchToSignUp" class="switch-link">Sign Up</span>
                    </p>
                </div>
            </div>
        </div>
    `;

    // Add event listener for close button
    document.getElementById('closeModal').addEventListener('click', () => {
        modalContainer.innerHTML = ''; // Clear the modal
    });

    document.getElementById('loginSubmit').addEventListener('click', (event) => login(event) );
    // Add event listener to switch to sign-up form
    document.getElementById('switchToSignUp').addEventListener('click', showSignUpForm);
}

function showSignUpForm() {
    const formContainer = document.getElementById('formContainer');
    if (formContainer){
    formContainer.innerHTML = `
        <h2>Sign Up</h2>
        <form id="signupForm">
            <label for="signupName">Name</label>
            <input type="text" id="signupName" placeholder="Enter your name" required>
            <label for="signupEmail">Email</label>
            <input type="email" id="signupEmail" placeholder="Enter your email" required>
            <label for="signupPassword">Password</label>
            <input type="password" id="signupPassword" placeholder="Enter your password" required>
            <button type="submit" id="signupSubmit">Sign Up</button>
        </form>
        <p>
            Already have an account? 
            <span id="switchToLogin" class="switch-link">Login</span>
        </p>
    `;}else{
        const modalContainer = document.getElementById('modalContainer');

        modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button" id="closeModal">&times;</span>
                <div id="formContainer">
                    <h2>Sign Up</h2>
                    <form id="signupForm">
                        <label for="signupName">Name</label>
                        <input type="text" id="signupName" placeholder="Enter your name" required>
                        <label for="signupEmail">Email</label>
                        <input type="email" id="signupEmail" placeholder="Enter your email" required>
                        <label for="signupPassword">Password</label>
                        <input type="password" id="signupPassword" placeholder="Enter your password" required>
                        <button type="submit" id="signupSubmit">Sign Up</button>
                    </form>
                    <p>
                        Already have an account? 
                        <span id="switchToLogin" class="switch-link">Login</span>
                    </p>
                </div>
            </div>
        </div>
        `;
        document.getElementById('closeModal').addEventListener('click', () => {
            modalContainer.innerHTML = ''; // Clear the modal
        });
    
    }

    // Add event listener to switch back to login form
    document.getElementById('signupSubmit').addEventListener('click', signup );
    document.getElementById('switchToLogin').addEventListener('click', showLoginForm);
}

function login(event){
    event.preventDefault();
    const login = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;

    console.log("Before fetch");
        
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login: login, password: pass })
    })
        .then(response => {
            console.log("Response status:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Response body:", data);
            document.cookie = "token=" + encodeURIComponent(data.token) + "; path=/; secure; SameSite=Strict";
            document.cookie = `login=${data.login}; path=/;`;
            document.cookie = `email=${data.email}; path=/;`;

            document.getElementById('loginButton').style.display = 'none';
            document.getElementById('signupButton').style.display = 'none';
            document.querySelector('header').innerHTML = `${data.login} (${data.email})`;

        })
        .catch(error => {
            console.error("Fetch error:", error);
            alert("error: ",error);
    });
    document.getElementById('modalContainer').innerHTML = "";

}

function signup(){
    const login = document.getElementById('signupName').value.trim();
    const pass = document.getElementById('signupPassword').value;
    const email = document.getElementById('signupEmail').value.trim();
    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }, 
        body: JSON.stringify({login: login, email: email, password : pass})
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to sign up');
        }
        return response.json(); // Assuming the server sends a JSON response
    })
    .then(data => {
        console.log('Sign up successful:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token) {
        const jwt = token.split('=')[1];
        fetch("/validate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({token: jwt})
            
        }).then(response => response.json())
        .then(data =>{
            document.cookie = "token=" + encodeURIComponent(data.token) + "; path=/; secure; SameSite=Strict";
            document.cookie = `login=${data.login}; path=/;`;
            document.cookie = `email=${data.email}; path=/;`;   
            document.getElementById('loginButton').style.display = 'none';
            document.getElementById('signupButton').style.display = 'none';
            document.querySelector('header').innerHTML = `${data.login} (${data.email})`;
        });
    }

    document.getElementById('runScript').addEventListener('click' ,addPost);
    document.getElementById('signupButton').addEventListener('click', showSignUpForm);
    document.getElementById('loginButton').addEventListener('click',showLoginForm );
    
    loadPosts();
});