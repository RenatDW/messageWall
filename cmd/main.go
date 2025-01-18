package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type WebhookPayload struct {
	ID     uint   `json:"id"`
	UserID int    `json:"user_id"`
	Text   string `json:"text"`
	Action string `json:"action"`
}

type User struct {
	ID       uint   `gorm:"primaryKey"`
	Name     string `gorm:"unique"`
	Email    string `gorm:"unique"`
	Password string
}

type Post struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint `gorm:"index"` // Foreign key with index for optimization
	Text   string
	User   User `gorm:"foreignKey:UserID"` // Establish relationship
}

type requestBody struct {
	UserID uint   `json:"user_id"`
	Text   string `json:"text"`
}

type requestUser struct {
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type requestUserLogin struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

var upgrader = websocket.Upgrader{}
var clients = make(map[*websocket.Conn]bool)

func notifyClients(message WebhookPayload) {
	for client := range clients {
		err := client.WriteJSON(message)
		if err != nil {
			log.Println("Error sending message:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

func runScriptHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Println("Invalid request method", http.StatusMethodNotAllowed)
		return
	}
	requestBody := requestBody{}
	err := json.NewDecoder(r.Body).Decode(&requestBody)
	if err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	db := connectDB()
	err = db.AutoMigrate(&Post{})
	if err != nil {
		log.Fatalf("Failed to migrate the database: %v", err)
	}
	post := Post{UserID: requestBody.UserID, Text: requestBody.Text}
	result := db.Create(&post)

	if result.Error != nil {
		log.Println("Failed to create post:", result.Error)
	}

}

func connectDB() *gorm.DB {
	dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Println("error with data base connection")
	}
	return db
}

func getPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-type", "application/json")

	db := connectDB()
	var posts []Post
	db.Preload("User").Find(&posts)

	err := json.NewEncoder(w).Encode(posts)
	if err != nil {
		log.Println("Failed to encode json")
	}
}

func loginUser(w http.ResponseWriter, req *http.Request) {
	requestUserLogin := requestUserLogin{}
	json.NewDecoder(req.Body).Decode(&requestUserLogin)
	var user User
	db := connectDB()
	err := db.Where("name = ?", requestUserLogin.Login).Or("email = ?", requestUserLogin.Login).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
		} else {
			log.Printf("Database error: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}
	if user.Password == requestUserLogin.Password {
		w.WriteHeader(http.StatusAccepted)
	} else {
		http.Error(w, "Wrong pass", http.StatusBadGateway)
		log.Print("Wrong pass")
	}

}

func signUpUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}
	var requestUser requestUser
	err := json.NewDecoder(req.Body).Decode(&requestUser)
	if err != nil {
		log.Print("Error decoding JSON:", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	if requestUser.Login == "" || requestUser.Email == "" || requestUser.Password == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	user := User{Name: requestUser.Login, Email: requestUser.Email, Password: requestUser.Password}
	db := connectDB()

	result := db.Create(&user)
	if result.Error != nil {
		log.Print("Error creating user:", result.Error)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User signed up successfully"})
}

func main() {

	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/signup", signUpUser)

	http.HandleFunc("/run-script", runScriptHandler)
	http.HandleFunc("/ws", webSocketHandler)
	http.HandleFunc("/api/posts", getPosts)
	http.HandleFunc("/login", loginUser)
	log.Println("Server is running on http://localhost:8080")

	go startWebhookListener()

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Printf("Error starting server: %v\n", err)
	}
}

func webSocketHandler(w http.ResponseWriter, req *http.Request) {
	c, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	clients[c] = true

	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Error reading message:", err)
			}
			delete(clients, c)
			break
		}
	}
}

func startWebhookListener() {
	db := connectDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	listener := pq.NewListener(
		"host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		10*time.Second,
		time.Minute,
		func(event pq.ListenerEventType, err error) {
			if err != nil {
				log.Fatalf("Listener error: %v", err)
			}
		},
	)
	defer listener.Close()

	err = listener.Listen("data_update")
	if err != nil {
		log.Fatalf("Failed to listen on 'data_update': %v", err)
	}

	log.Println("Listening for data_update notifications...")

	for {
		select {
		case notification := <-listener.Notify:
			if notification != nil {
				log.Printf("Received notification: %s", notification.Extra)

				var payload WebhookPayload
				err := json.Unmarshal([]byte(notification.Extra), &payload)
				if err != nil {
					log.Printf("Error parsing notification: %v", err)
					continue
				}

				notifyClients(payload)

			}
		case <-time.After(90 * time.Second):
			log.Println("No notifications received for 90 seconds, pinging PostgreSQL")
			go listener.Ping()
		}
	}
}
