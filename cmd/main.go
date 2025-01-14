package main

import (
	"fmt"
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

// func webSocketHandl2er(w http.ResponseWriter, req *http.Request) {
// 	conn, err := upgrader.Upgrade(w, req, nil)
// 	if err != nil {
// 		log.Println("Error with connection")
// 	}
// 	defer conn.Close()
// 	for {
// 		_, message, err := conn.ReadMessage()
// 		if err != nil {
// 			log.Println(err, "golang")
// 			return
// 		}
// 		log.Printf("Message received: %s", message)
// 		dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai"
// 		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
// 		if err != nil {
// 			log.Println("error with data base connection")
// 		}
// 		posts := fetchPosts(*db)
// 		// Send new posts to WebSocket clients
// 		for _, post := range posts {
// 			err = conn.WriteJSON(post)
// 			if err != nil {
// 				log.Println("Error writing post:", err)
// 				return
// 			}
// 		}
// 	}
// 	// dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai"
// 	// db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
// 	// if err != nil {
// 	// 	log.Println("error with data base connection")
// 	// }
// 	// var posts []Post
// 	// result := db.Find(&posts)
// 	// if result == nil {
// 	// 	log.Printf("Failed to fetch posts: %v", result.Error)
// 	// 	http.Error(w, "Internal Server Error", http.StatusInternalServerError)
// 	// 	return
// 	// }
// 	// w.Header().Set("Content-Type", "application/json")
// 	// json.NewEncoder(w).Encode(posts)
// }

func fetchPosts(db gorm.DB) []Post {
	var posts []Post
	db.Find(&posts)
	return posts
}
func runScriptHandler(w http.ResponseWriter, r *http.Request) {
	dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	// dsn := "host=localhost user=postgres password=1234 dbname=posts port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Println("error with data base connection")
	}
	log.Println("Connected to the database successfully!")
	err = db.AutoMigrate(&Post{})
	if err != nil {
		log.Fatalf("Failed to migrate the database: %v", err)
	}
	post := Post{User_id: 0, Text: "Test"}
	result := db.Create(&post)

	if result.Error != nil {
		log.Println("Failed to create user:", result.Error)
	} else {
		log.Println("User created successfully!")
	}

}

func main() {

	fs := http.FileServer(http.Dir("./web"))
	http.Handle("/", fs)
	http.HandleFunc("/run-script", runScriptHandler)
	http.HandleFunc("/ws", webSocketHandler)

	fmt.Println("Server is running on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}

}
