# MessageWall
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/RenatDW/messageWall)

MessageWall is a real-time web application that functions as a public message board. It features user authentication, a live-updating message feed, and the ability for users to manage their own posts. The backend is built with Go, and it leverages PostgreSQL's `NOTIFY`/`LISTEN` mechanism combined with WebSockets for efficient, real-time communication with the vanilla JavaScript frontend.

## Features

*   **User Authentication**: Secure user sign-up and login system using JSON Web Tokens (JWT).
*   **Real-Time Messaging**: New posts, edits, and deletions appear instantly for all connected users without needing to refresh the page.
*   **CRUD Operations**: Users can create, read, edit, and delete messages.
*   **Ownership Control**: Users can only edit or delete the posts they have created.
*   **Persistent Storage**: All user and post data is stored in a PostgreSQL database.

## How It Works

The application consists of a Go backend, a PostgreSQL database, and a vanilla HTML/CSS/JS frontend.

### Backend (Go)

The Go server handles API requests, manages WebSocket connections, and interacts with the database.

*   **API**: A set of RESTful endpoints for user authentication and post management.
*   **WebSockets**: The backend uses the `gorilla/websocket` library to maintain persistent connections with clients.
*   **Database Interaction**: GORM is used as the ORM to interact with the PostgreSQL database.
*   **Real-Time Notifications**: The backend uses `lib/pq` to `LISTEN` for notifications from the PostgreSQL database. When a post is created, updated, or deleted, a database trigger sends a `NOTIFY` payload. The Go server receives this notification and broadcasts the relevant data to all connected WebSocket clients, who then update their UI in real-time.

### Database (PostgreSQL)

PostgreSQL is used not only for data storage but also as a message broker for real-time updates. This is achieved through a combination of a PL/pgSQL function and triggers on the `posts` table.

*   **Triggers**: `AFTER INSERT`, `AFTER UPDATE`, and `AFTER DELETE` triggers on the `posts` table execute a function.
*   **Notify Function**: This function constructs a JSON payload containing the action type (`insert`, `update`, `delete`) and post data, and then sends it to a specific channel (`data_update_insert`, `data_update_update`, or `data_update_delete`) using the `pg_notify` command.

### Frontend (JavaScript)

The client-side is built with vanilla JavaScript, HTML, and CSS.

*   **WebSocket Client**: On page load, the client establishes a WebSocket connection with the server. It listens for messages from the server and dynamically updates the DOM to show new posts, edits, or deletions.
*   **Authentication**: The client manages a JWT stored in browser cookies. This token is sent with authenticated requests to create, edit, or delete posts. The UI changes based on the user's authentication status, showing either login/signup buttons or user information and an exit button.

## Getting Started

### Prerequisites

*   Go (version 1.23 or later)
*   PostgreSQL

### 1. Database Setup

1.  Make sure your PostgreSQL server is running.
2.  Create a database. The default name used in the application is `go_fp`.

    ```sql
    CREATE DATABASE go_fp;
    ```

3.  Connect to your new database and run the following SQL script. This will create the necessary function and triggers for the real-time notification system. The Go application will automatically migrate the tables (`users`, `posts`) on its first run, but the triggers must be created manually.

    ```sql
    -- Create the function that will be called by the triggers
    CREATE OR REPLACE FUNCTION notify_post_change()
    RETURNS TRIGGER AS $$
    DECLARE
      payload JSON;
    BEGIN
      -- Handle INSERT
      IF (TG_OP = 'INSERT') THEN
        payload = json_build_object(
          'action', 'insert',
          'id', NEW.id,
          'user_id', NEW.user_id,
          'text', NEW.text
        );
        PERFORM pg_notify('data_update_insert', payload::text);

      -- Handle UPDATE
      ELSIF (TG_OP = 'UPDATE') THEN
        payload = json_build_object(
          'action', 'update',
          'id', NEW.id,
          'user_id', NEW.user_id,
          'text', NEW.text
        );
        PERFORM pg_notify('data_update_update', payload::text);

      -- Handle DELETE
      ELSIF (TG_OP = 'DELETE') THEN
        payload = json_build_object(
          'action', 'delete',
          'id', OLD.id
        );
        PERFORM pg_notify('data_update_delete', payload::text);
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Create triggers after the 'posts' table is created by the application.
    -- You may need to run the application once for the table to exist,
    -- then apply these triggers.
    CREATE TRIGGER posts_insert_trigger
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION notify_post_change();

    CREATE TRIGGER posts_update_trigger
    AFTER UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION notify_post_change();

    CREATE TRIGGER posts_delete_trigger
    AFTER DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION notify_post_change();
    ```

4.  Update the database connection string in `internal/database/database.go` and `internal/handlers/websocket.go` to match your PostgreSQL configuration.

    ```go
    // from internal/database/database.go
    dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable"
    ```

### 2. Backend Installation & Run

1.  Clone the repository:
    ```sh
    git clone https://github.com/RenatDW/messageWall.git
    cd messageWall
    ```

2.  Install the dependencies:
    ```sh
    go mod tidy
    ```

3.  Run the server:
    ```sh
    go run cmd/main.go
    ```
    The server will start on `http://localhost:8080`.

### 3. Access the Application

Open your web browser and navigate to `http://localhost:8080`. You can now sign up, log in, and start posting messages.

## Project Structure

```
.
├── cmd/main.go            # Application entry point
├── go.mod                 # Go module dependencies
├── internal/
│   ├── database/          # Database connection and helpers
│   ├── handlers/          # HTTP and WebSocket request handlers
│   └── models/            # Data structures for users, posts, etc.
└── web/
    ├── index.html         # Main HTML file
    ├── styles.css         # CSS for styling
    └── buttonHandler.js   # Client-side JavaScript for all frontend logic
```

## API Endpoints

*   `POST /signup`: Register a new user.
*   `POST /login`: Authenticate a user and receive a JWT.
*   `GET /api/posts`: Retrieve all posts to populate the message board on initial load.
*   `POST /add-post`: Create a new post (requires JWT).
*   `POST /edit-message`: Update an existing post (requires JWT).
*   `POST /delete-message`: Delete a post (requires JWT).
*   `POST /validate`: Validate a user's JWT.
*   `GET /ws`: Upgrade the HTTP connection to a WebSocket connection for real-time communication.
