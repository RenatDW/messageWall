const socket = new WebSocket('ws://localhost:8080/ws');

function getCookie(name) {
    const cookie = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
    return cookie ? cookie.split('=')[1] : null;
}

function handleInsert(res) {
    try {
        const messageBoard = document.querySelector('.message-board');
        const messageBlock = document.createElement('div');
        const login = getCookie('login');

        if (login && String(login) === String(res.login)) {
            messageBlock.innerHTML = `
                <strong>${res.login}:</strong>
                <span class="post-text">${res.text}</span>
                <span class="post-id" style="display:none">${res.id}</span>
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>`;
            messageBlock.classList.add('message');

            // Event handlers for edit and delete.
            const deleteButton = messageBlock.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => deleteBtn(messageBlock, res.id));

            const editButton = messageBlock.querySelector('.edit-btn');
            editButton.addEventListener('click', () => editBtn(messageBlock, res.id));
        } else {
            messageBlock.innerHTML = `<strong>${res.login}</strong> : ${res.text}`;
            messageBlock.classList.add('message-others');
        }

        if (messageBoard) {
            messageBoard.prepend(messageBlock);
            socket.send(res);
        }
    } catch (error) {
        console.log("Failed to parse JSON", error);
    }
}

function handleUpdate(res) {
    const messages = document.querySelectorAll('.message, .message-others');
    messages.forEach(message => {
        const postIdElement = message.querySelector('.post-id');
        if (postIdElement && postIdElement.textContent == res.id) {
            const postText = message.querySelector('.post-text');
            if (postText) postText.textContent = res.text;
        }
    });
}

function handleDelete(res) {
    const messages = document.querySelectorAll('.message, .message-others');
    messages.forEach(message => {
        const postIdElement = message.querySelector('.post-id');
        if (postIdElement && postIdElement.textContent == res.id) {
            message.remove();
        }
    });
}

socket.onmessage = function(event) {
    const res = JSON.parse(event.data);
    switch (res.action) {
        case "insert":
            handleInsert(res);
            break;
        case "update":
            handleUpdate(res);
            break;
        case "delete":
            handleDelete(res);
            break;
        default:
            console.warn("Unknown action:", res.action);
    }
};

function addPost(){
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token) {
        const jwt = token.split('=')[1];
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
            body: JSON.stringify({token: jwt, text: messageText})
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
}

function loadPosts() {
    const messageBoard = document.querySelector('.message-board');
    fetch('/api/posts')
        .then(response => response.json())
        .then(data => {
            const login_cookie = document.cookie.split('; ').find(row => row.startsWith('login='));
        const login = login_cookie ? login_cookie.split('=')[1] : '';

        data.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.classList.add(login === post.User.Name ? 'message' : 'message-others');

            // Add post content and buttons conditionally
            postDiv.innerHTML = `
                <strong>${post.User.Name}:</strong> <span class="post-text">${post.Text}</span><span class="post-id" style="display:none">${post.ID}</span>
                ${login === post.User.Name ? `
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                ` : ''}
            `;

            messageBoard.appendChild(postDiv);

            if (login === post.User.Name) {
                // Handle delete functionality
                const deleteButton = postDiv.querySelector('.delete-btn');
                deleteButton.addEventListener('click',  () => deleteBtn(postDiv, post.ID));

                // Handle edit functionality
                const editButton = postDiv.querySelector('.edit-btn');
                editButton.addEventListener('click', () => editBtn(postDiv, post.ID));
            }
        });
    }).catch(error => console.error('Error fetching posts:', error));
}
function deleteBtn(postDiv, ID){
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token && token.split('=')[1] != "") {
        const jwt = token.split('=')[1];
        postDiv.remove();
        fetch('/delete-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({token: jwt, id:ID})
            })
    }
    // Optional: Send request to the server to delete the post

}

function editBtn(postDiv, ID){
    const postTextSpan = postDiv.querySelector('.post-text');
    const newText = prompt('Edit your message:', postTextSpan.textContent);

    if (newText !== null && newText.trim() !== '') {
        postTextSpan.textContent = newText;
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        if (token && token.split('=')[1] != "") {
            const jwt = token.split('=')[1];
            fetch('/edit-message',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }, 
                body: JSON.stringify({token: jwt, id:ID ,text: newText})
            })
        }

        // Optional: Send request to the server to update the post

    }
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
            location.reload();

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

function exit(){
    document.cookie = 'email=;';
    document.cookie = 'login=;';
    document.cookie = 'token=;';
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token && token.split('=')[1] != "") {
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
            document.querySelector('header').innerHTML = `${data.login} (${data.email}) 
            <div class="auth-buttons">
                <button id="exitButton">Exit</button> 
            </div>`;
            document.getElementById('exitButton').addEventListener('click' ,exit);
        }).catch(() => {
            setupAuthButtons();
        });
    } else {
        setupAuthButtons();
    }

function setupAuthButtons() {
    document.querySelector('header').innerHTML = `<div class="auth-buttons">
        <button id="loginButton">Login</button>
        <button id="signupButton">Sign Up</button>
    </div>`;
    document.getElementById('signupButton').addEventListener('click', showSignUpForm);
    document.getElementById('loginButton').addEventListener('click', showLoginForm);
}

    document.getElementById('runScript').addEventListener('click' ,addPost);
    
    loadPosts();
});

function getAllMessages() {
    const messageBoard = document.querySelector('.message-board');
    const messages = messageBoard.querySelectorAll('.message, .message-others');
    
    const messageArray = Array.from(messages).map(messageDiv => {
        const textElement = messageDiv.querySelector('.post-text');
        const userElement = messageDiv.querySelector('strong');
        return {
            user: userElement.textContent.replace(':', ''),
            text: textElement.textContent
        };
    });
    
    return messageArray;
}