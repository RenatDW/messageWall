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
        const currentSize = getTextSize(); // Get current font size

        if (login && String(login) === String(res.login)) {
            messageBlock.innerHTML = `
                <strong style="font-size: ${currentSize}px">${res.login}:</strong>
                <span class="post-text" style="font-size: ${currentSize}px">${res.text}</span>
                <span class="post-id" style="display:none">${res.id}</span>
                <button class="delete-btn" style="font-size: ${currentSize}px">Удалить</button>
                <button class="edit-btn" style="font-size: ${currentSize}px">Изменить</button>`;
            messageBlock.classList.add('message');

            // Event handlers for edit and delete
            const deleteButton = messageBlock.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => deleteBtn(messageBlock, res.id));

            const editButton = messageBlock.querySelector('.edit-btn');
            editButton.addEventListener('click', () => editBtn(messageBlock, res.id));
        } else {
            messageBlock.innerHTML = `
                <strong style="font-size: ${currentSize}px">${res.login}:</strong>
                <span class="post-text" style="font-size: ${currentSize}px">${res.text}</span>`;
            messageBlock.classList.add('message-others');
        }

        if (messageBoard) {
            messageBoard.prepend(messageBlock);

            // Apply font size to all elements in the new message
            const allElements = messageBlock.querySelectorAll('*');
            allElements.forEach(element => {
                if (element.tagName !== 'DIV') {
                    element.style.fontSize = `${currentSize}px`;
                }
            });

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

socket.onmessage = function (event) {
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

function addPost() {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));

    if (!token || token.split('=')[1] === '') {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = 'Для отправки сообщений необходимо авторизоваться';
        errorContainer.style.marginBottom = '10px';

        const container = document.querySelector('.container');

        const existingError = container.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const textarea = document.getElementById('messageInput');
        container.insertBefore(errorContainer, textarea.parentNode);

        setTimeout(() => {
            errorContainer.classList.add('show');
        }, 10);

        setTimeout(() => {
            errorContainer.classList.remove('show');
            setTimeout(() => {
                errorContainer.remove();
            }, 300);
        }, 3000);

        return;
    }

    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (messageText === "") {
        alert("Сообщение не может быть пустым!");
        return;
    }

    const jwt = token.split('=')[1];
    fetch('/add-post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: jwt, text: messageText })
    })
        .then(response => {
            if (response.ok) {
                messageInput.value = "";
                saveMessageDraft("");
                return response.text();
            } else {
                throw new Error('Не удалось отправить сообщение');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            errorContainer.textContent = 'Произошла ошибка при отправке сообщения';

            const container = document.querySelector('.container');
            const existingError = container.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }

            const textarea = document.getElementById('messageInput');
            container.insertBefore(errorContainer, textarea.parentNode);

            setTimeout(() => {
                errorContainer.classList.add('show');
            }, 10);

            setTimeout(() => {
                errorContainer.classList.remove('show');
                setTimeout(() => {
                    errorContainer.remove();
                }, 300);
            }, 3000);
        });
}

function loadPosts() {
    const messageBoard = document.querySelector('.message-board');
    fetch('/api/posts')
        .then(response => response.json())
        .then(data => {
            const login_cookie = document.cookie.split('; ').find(row => row.startsWith('login='));
            const login = login_cookie ? login_cookie.split('=')[1] : '';
            const currentSize = getTextSize();

            data.forEach(post => {
                const postDiv = document.createElement('div');
                postDiv.classList.add(login === post.User.Name ? 'message' : 'message-others');

                postDiv.innerHTML = `
                    <strong style="font-size: ${currentSize}px">${post.User.Name}:</strong> 
                    <span class="post-text" style="font-size: ${currentSize}px">${post.Text}</span>
                    <span class="post-id" style="display:none">${post.ID}</span>
                    ${login === post.User.Name ? `
                        <button class="delete-btn" style="font-size: ${currentSize}px">Удалить</button>
                        <button class="edit-btn" style="font-size: ${currentSize}px">Изменить</button>
                    ` : ''}
                `;

                messageBoard.appendChild(postDiv);

                const allElements = postDiv.querySelectorAll('*');
                allElements.forEach(element => {
                    if (element.tagName !== 'DIV') {
                        element.style.fontSize = `${currentSize}px`;
                    }
                });

                if (login === post.User.Name) {
                    const deleteButton = postDiv.querySelector('.delete-btn');
                    deleteButton.addEventListener('click', () => deleteBtn(postDiv, post.ID));

                    const editButton = postDiv.querySelector('.edit-btn');
                    editButton.addEventListener('click', () => editBtn(postDiv, post.ID));
                }
            });
        }).catch(error => console.error('Error fetching posts:', error));
}

function deleteBtn(postDiv, ID) {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (token && token.split('=')[1] != "") {
        const jwt = token.split('=')[1];
        createParticles(postDiv);
        postDiv.classList.add('deleting');
        setTimeout(() => {
            fetch('/delete-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: jwt, id: ID })
            }).then(() => {
                postDiv.remove();
            })
        }, 1000);
    }
}

function editBtn(messageBlock, id) {
    const textSpan = messageBlock.querySelector('.post-text');
    const currentText = textSpan.textContent;

    const messageBoard = document.querySelector('.message-board');

    messageBlock.classList.add('editing');

    const input = document.createElement('textarea');
    input.value = currentText;
    input.style.fontSize = textSpan.style.fontSize;

    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Сохранить';
    saveButton.className = 'save-btn';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Отмена';
    cancelButton.className = 'cancel-btn';

    editControls.appendChild(saveButton);
    editControls.appendChild(cancelButton);

    textSpan.replaceWith(input);
    messageBlock.appendChild(editControls);

    input.focus();

    const cancelEdit = () => {
        input.replaceWith(textSpan);
        editControls.remove();
        messageBlock.classList.remove('editing');
    };

    cancelButton.addEventListener('click', cancelEdit);

    saveButton.addEventListener('click', () => {
        const newText = input.value.trim();
        if (newText === '') {
            alert('Сообщение не может быть пустым!');
            return;
        }

        if (newText === currentText) {
            cancelEdit();
            return;
        }

        const token = getCookie('token');
        if (token) {
            fetch('/edit-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: token, id: id, text: newText })
            }).then(() => {
                textSpan.textContent = newText;
                input.replaceWith(textSpan);
                editControls.remove();

                messageBoard.prepend(messageBlock);

                messageBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });

                messageBlock.classList.remove('editing');
                messageBlock.classList.add('saving');

                messageBlock.classList.add('saved');

                setTimeout(() => {
                    messageBlock.classList.remove('saving');
                    messageBlock.classList.remove('saved');
                }, 500);
            }).catch(error => {
                console.error('Error:', error);
                alert('Failed to save changes');
            });
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

function showLoginForm() {
    const modalContainer = document.getElementById('modalContainer');
    const currentSize = getTextSize();

    modalContainer.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <span class="close-button" id="closeModal" style="font-size: ${currentSize}px">&times;</span>
                <div id="formContainer">
                    <h2 style="font-size: ${currentSize + 4}px">Вход</h2>
                    <div id="errorContainer" class="error-message"></div>
                    <form id="loginForm">
                        <label for="loginName" style="font-size: ${currentSize}px">Имя</label>
                        <input type="text" id="loginName" placeholder="Введите ваше имя" style="font-size: ${currentSize}px" required>
                        <label for="loginPassword" style="font-size: ${currentSize}px">Пароль</label>
                        <input type="password" id="loginPassword" placeholder="Введите ваш пароль" style="font-size: ${currentSize}px" required>
                        <button type="submit" id="loginSubmit" style="font-size: ${currentSize}px">Войти</button>
                    </form>
                    <p style="font-size: ${currentSize}px">
                        Нет аккаунта? 
                        <span id="switchToSignup" class="switch-link" style="font-size: ${currentSize}px">Зарегистрироваться</span>
                    </p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('closeModal').addEventListener('click', () => {
        modalContainer.innerHTML = '';
    });

    document.getElementById('loginSubmit').addEventListener('click', (event) => login(event));
    document.getElementById('switchToSignup').addEventListener('click', showSignUpForm);
}

function showSignUpForm() {
    const formContainer = document.getElementById('formContainer');
    const currentSize = getTextSize();

    if (formContainer) {
        formContainer.innerHTML = `
            <h2 style="font-size: ${currentSize + 4}px">Регистрация</h2>
            <div id="errorContainer" class="error-message"></div>
            <form id="signupForm">
                <label for="signupName" style="font-size: ${currentSize}px">Имя</label>
                <input type="text" id="signupName" placeholder="Введите ваше имя" style="font-size: ${currentSize}px" required>
                <label for="signupEmail" style="font-size: ${currentSize}px">Почта</label>
                <input type="email" id="signupEmail" placeholder="Введите вашу почту" style="font-size: ${currentSize}px" required>
                <label for="signupPassword" style="font-size: ${currentSize}px">Пароль</label>
                <input type="password" id="signupPassword" placeholder="Введите ваш пароль" style="font-size: ${currentSize}px" required>
                <button type="submit" id="signupSubmit" style="font-size: ${currentSize}px">Зарегистрироваться</button>
            </form>
            <p style="font-size: ${currentSize}px">
                Уже есть аккаунт? 
                <span id="switchToLogin" class="switch-link" style="font-size: ${currentSize}px">Войти</span>
            </p>
        `;
    } else {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `
            <div class="modal">
                <div class="modal-content">
                    <span class="close-button" id="closeModal" style="font-size: ${currentSize}px">&times;</span>
                    <div id="formContainer">
                        <h2 style="font-size: ${currentSize + 4}px">Регистрация</h2>
                        <div id="errorContainer" class="error-message"></div>
                        <form id="signupForm">
                            <label for="signupName" style="font-size: ${currentSize}px">Имя</label>
                            <input type="text" id="signupName" placeholder="Введите ваше имя" style="font-size: ${currentSize}px" required>
                            <label for="signupEmail" style="font-size: ${currentSize}px">Почта</label>
                            <input type="email" id="signupEmail" placeholder="Введите вашу почту" style="font-size: ${currentSize}px" required>
                            <label for="signupPassword" style="font-size: ${currentSize}px">Пароль</label>
                            <input type="password" id="signupPassword" placeholder="Введите ваш пароль" style="font-size: ${currentSize}px" required>
                            <button type="submit" id="signupSubmit" style="font-size: ${currentSize}px">Зарегистрироваться</button>
                        </form>
                        <p style="font-size: ${currentSize}px">
                            Уже есть аккаунт? 
                            <span id="switchToLogin" class="switch-link" style="font-size: ${currentSize}px">Войти</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('closeModal').addEventListener('click', () => {
            modalContainer.innerHTML = '';
        });
    }

    document.getElementById('signupSubmit').addEventListener('click', signup);
    document.getElementById('switchToLogin').addEventListener('click', showLoginForm);
}

function login(event) {
    event.preventDefault();
    const login = document.getElementById('loginName').value.trim();
    const pass = document.getElementById('loginPassword').value;

    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = '';
    errorContainer.classList.remove('show');

    document.getElementById('loginName').classList.remove('input-error');
    document.getElementById('loginPassword').classList.remove('input-error');

    if (!login) {
        document.getElementById('loginName').classList.add('input-error');
        errorContainer.textContent = 'Пожалуйста, введите имя пользователя';
        errorContainer.classList.add('show');
        return;
    }

    if (!pass) {
        document.getElementById('loginPassword').classList.add('input-error');
        errorContainer.textContent = 'Пожалуйста, введите пароль';
        errorContainer.classList.add('show');
        return;
    }

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login: login, password: pass })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    if (response.status === 401) {
                        document.getElementById('loginName').classList.add('input-error');
                        document.getElementById('loginPassword').classList.add('input-error');
                        throw new Error('Неверное имя пользователя или пароль');
                    }
                    if (response.status === 404) {
                        document.getElementById('loginName').classList.add('input-error');
                        throw new Error('Пользователь не найден');
                    }
                    throw new Error('Произошла ошибка при входе');
                });
            }
            return response.json();
        })
        .then(data => {
            document.cookie = "token=" + encodeURIComponent(data.token) + "; path=/; secure; SameSite=Strict";
            document.cookie = `login=${data.login}; path=/;`;
            document.cookie = `email=${data.email}; path=/;`;

            const currentSize = getTextSize();
            document.querySelector('header').innerHTML = `
            <div class="header-content">
                <div class="header-left">
                    <a href="/" class="home-link" style="font-size: ${currentSize}px">Главная</a>
                    <a href="/author" class="home-link" style="font-size: ${currentSize}px">Об авторе</a>
                </div>
                <div class="header-right">
                    <span class="user-info" style="font-size: ${currentSize}px">${data.login} (${data.email})</span>
                    <div class="auth-buttons">
                        <button id="exitButton" style="font-size: ${currentSize}px">Выход</button>
                    </div>
                    <div class="text-controls">
                        <button id="decreaseText" style="font-size: ${currentSize}px">А-</button>
                        <button id="increaseText" style="font-size: ${currentSize}px">А+</button>
                    </div>
                </div>
            </div>`;

            location.reload();
        })
        .catch(error => {
            console.error('Ошибка:', error);
            errorContainer.textContent = error.message;
            errorContainer.classList.add('show');

            const errorFields = document.querySelectorAll('.input-error');
            errorFields.forEach(field => {
                field.style.animation = 'none';
                field.offsetHeight;
                field.style.animation = 'shake 0.5s ease-in-out';
            });

            setTimeout(() => {
                errorContainer.classList.remove('show');
            }, 3000);
        });
}

function signup(event) {
    event.preventDefault();
    const login = document.getElementById('signupName').value.trim();
    const pass = document.getElementById('signupPassword').value;
    const email = document.getElementById('signupEmail').value.trim();

    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = '';
    errorContainer.classList.remove('show');

    document.getElementById('signupName').classList.remove('input-error');
    document.getElementById('signupEmail').classList.remove('input-error');
    document.getElementById('signupPassword').classList.remove('input-error');

    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login: login, email: email, password: pass })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    if (text.includes('Username already exists')) {
                        document.getElementById('signupName').classList.add('input-error');
                        throw new Error('Это имя пользователя уже занято. Пожалуйста, выберите другое.');
                    }
                    if (text.includes('Email already exists')) {
                        document.getElementById('signupEmail').classList.add('input-error');
                        throw new Error('Эта почта уже зарегистрирована. Пожалуйста, используйте другую почту.');
                    }
                    throw new Error(text || 'Не удалось зарегистрироваться');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Sign up successful:', data);
            showLoginForm();
        })
        .catch(error => {
            console.error('Error:', error);
            errorContainer.textContent = error.message;
            errorContainer.classList.add('show');
        });
}

function exit() {
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
            body: JSON.stringify({ token: jwt })

        }).then(response => response.json())
            .then(data => {
                document.cookie = "token=" + encodeURIComponent(data.token) + "; path=/; secure; SameSite=Strict";
                document.cookie = `login=${data.login}; path=/;`;
                document.cookie = `email=${data.email}; path=/;`;
                const currentSize = getTextSize();
                document.querySelector('header').innerHTML = `
                    <div class="header-content">
                        <div class="header-left">
                            <a href="/" class="home-link" style="font-size: ${currentSize}px">Главная</a>
                            <a href="/author" class="home-link" style="font-size: ${currentSize}px">Об авторе</a>
                        </div>
                        <div class="header-right">
                            <span class="user-info" style="font-size: ${currentSize}px">${data.login} (${data.email})</span>
                            <div class="auth-buttons">
                                <button id="exitButton" style="font-size: ${currentSize}px">Выход</button> 
                            </div>
                            <div class="text-controls">
                                <button id="decreaseText" style="font-size: ${currentSize}px">А-</button>
                                <button id="increaseText" style="font-size: ${currentSize}px">А+</button>
                            </div>
                        </div>
                    </div>`;

                document.getElementById('exitButton').addEventListener('click', exit);
                document.getElementById('decreaseText').addEventListener('click', () => {
                    const newSize = getTextSize() - 2;
                    if (newSize >= 12) {
                        setTextSize(newSize);
                    }
                });
                document.getElementById('increaseText').addEventListener('click', () => {
                    const newSize = getTextSize() + 2;
                    if (newSize <= 24) {
                        setTextSize(newSize);
                    }
                });
            }).catch(() => {
                setupAuthButtons();
            });
    } else {
        setupAuthButtons();
    }

    function setupAuthButtons() {
        const currentSize = getTextSize();
        document.querySelector('header').innerHTML = `
            <div class="header-content">
                <div class="header-left">
                    <a href="/" class="home-link" style="font-size: ${currentSize}px">Главная</a>
                    <a href="/author" class="home-link" style="font-size: ${currentSize}px">Об авторе</a>
                </div>
                <div class="header-right">
                    <div class="auth-buttons">
                        <button id="loginButton" style="font-size: ${currentSize}px">Вход</button>
                        <button id="signupButton" style="font-size: ${currentSize}px">Регистрация</button>
                    </div>
                    <div class="text-controls">
                        <button id="decreaseText" style="font-size: ${currentSize}px">A-</button>
                        <button id="increaseText" style="font-size: ${currentSize}px">A+</button>
                    </div>
                </div>
            </div>`;

        document.getElementById('signupButton').addEventListener('click', showSignUpForm);
        document.getElementById('loginButton').addEventListener('click', showLoginForm);
        document.getElementById('decreaseText').addEventListener('click', () => {
            const newSize = getTextSize() - 2;
            if (newSize >= 12) {
                setTextSize(newSize);
            }
        });
        document.getElementById('increaseText').addEventListener('click', () => {
            const newSize = getTextSize() + 2;
            if (newSize <= 24) {
                setTextSize(newSize);
            }
        });
    }
    if (document.getElementById('runScript')) {
        document.getElementById('runScript').addEventListener('click', addPost);
        loadPosts();
    }

    const currentSize = getTextSize();
    setTextSize(currentSize);

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        const savedText = getMessageDraft();
        if (savedText) {
            messageInput.value = savedText;
        }

        let timeout;
        messageInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                saveMessageDraft(messageInput.value);
            }, 500);
        });
        document.getElementById('messageInput').placeholder = 'Напишите сообщение';
    }
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

function setTextSize(size) {
    document.cookie = `textSize=${size}; path=/;`;

    const baseSize = size;

    const h1Size = baseSize + 8;
    const h2Size = baseSize + 6;
    const h3Size = baseSize + 4;
    const h4Size = baseSize + 3;
    const h5Size = baseSize + 2;
    const h6Size = baseSize + 1;

    const elements = document.querySelectorAll('.message, .message-others, button, input, label, strong, span, p, textarea, .home-link, .user-info, .auth-buttons button, .text-controls button, .author-text, .contact-item, .contact-link, .contact-text');
    elements.forEach(element => {
        element.style.fontSize = `${baseSize}px`;
    });

    document.querySelectorAll('h1, .author-title').forEach(h1 => h1.style.fontSize = `${h1Size}px`);
    document.querySelectorAll('h2, .contact-title').forEach(h2 => h2.style.fontSize = `${h2Size}px`);
    document.querySelectorAll('h3').forEach(h3 => h3.style.fontSize = `${h3Size}px`);
    document.querySelectorAll('h4').forEach(h4 => h4.style.fontSize = `${h4Size}px`);
    document.querySelectorAll('h5').forEach(h5 => h5.style.fontSize = `${h5Size}px`);
    document.querySelectorAll('h6').forEach(h6 => h6.style.fontSize = `${h6Size}px`);

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.style.fontSize = `${baseSize}px`;
    });

    const modalElements = document.querySelectorAll('.modal *');
    modalElements.forEach(element => {
        if (element.tagName !== 'DIV') {
            if (element.tagName === 'H1') element.style.fontSize = `${h1Size}px`;
            else if (element.tagName === 'H2') element.style.fontSize = `${h2Size}px`;
            else if (element.tagName === 'H3') element.style.fontSize = `${h3Size}px`;
            else if (element.tagName === 'H4') element.style.fontSize = `${h4Size}px`;
            else if (element.tagName === 'H5') element.style.fontSize = `${h5Size}px`;
            else if (element.tagName === 'H6') element.style.fontSize = `${h6Size}px`;
            else element.style.fontSize = `${baseSize}px`;
        }
    });

    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.style.fontSize = `${baseSize}px`;
    }
}

function getTextSize() {
    const textSize = getCookie('textSize');
    return textSize ? parseInt(textSize) : 16;
}

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const particlesCount = 50;

    for (let i = 0; i < particlesCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;

        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        const rotate = Math.random() * 360;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--r', `${rotate}deg`);

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const red = Math.floor(Math.random() * 128 + 128);
        particle.style.backgroundColor = `rgb(${red}, ${red * 0.3}, ${red * 0.3})`;

        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        element.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

function saveMessageDraft(text) {
    document.cookie = `messageDraft=${encodeURIComponent(text)}; path=/; max-age=3600`;
}

function getMessageDraft() {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('messageDraft='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}