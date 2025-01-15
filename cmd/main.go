package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID       uint   `gorm:"primaryKey"`
	Name     string `gorm:"unique"`
	Email    string `gorm:"unique"`
	Password string
}

type Post struct {
	ID      uint `gorm:"primaryKey"`
	User_id int
	Text    string
}

type requestBody struct {
	UserID int    `json:"user_id"`
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

func webSocketHandler(w http.ResponseWriter, req *http.Request) {
	c, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	for {
		mt, message, err := c.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
		log.Printf("recv: %s", message)
		err = c.WriteMessage(mt, message)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}
func fetchPosts(db gorm.DB) []Post {
	var posts []Post
	db.Find(&posts)
	return posts
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
	post := Post{User_id: requestBody.UserID, Text: requestBody.Text}
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
	posts := fetchPosts(*db)
	err := json.NewEncoder(w).Encode(posts)
	if err != nil {
		log.Println("Failed to encode json")
	}
}

// todo переделать
func loginUser(w http.ResponseWriter, req *http.Request) {
	requestUserLogin := requestUserLogin{}
	json.NewDecoder(req.Body).Decode(&requestUserLogin)
	var user User
	db := connectDB()
	db.Where("name = ?", requestUserLogin.Login).First(&user)
	if user.Password == requestUserLogin.Password {
		w.WriteHeader(http.StatusAccepted)
	}
}

func signUpUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Decode the incoming JSON payload
	var requestUser requestUser
	err := json.NewDecoder(req.Body).Decode(&requestUser)
	if err != nil {
		log.Print("Error decoding JSON:", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Validate the incoming data (e.g., check for empty fields)
	if requestUser.Login == "" || requestUser.Email == "" || requestUser.Password == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	// Create a new user object
	user := User{Name: requestUser.Login, Email: requestUser.Email, Password: requestUser.Password}

	// Connect to the database
	db := connectDB()

	// Save the user to the database
	result := db.Create(&user)
	if result.Error != nil {
		log.Print("Error creating user:", result.Error)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Send a success response
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
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Printf("Error starting server: %v\n", err)
	}

}
