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

func main() {

	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/run-script", runScriptHandler)
	http.HandleFunc("/ws", webSocketHandler)
	http.HandleFunc("/api/posts", getPosts)

	log.Println("Server is running on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Printf("Error starting server: %v\n", err)
	}

}
