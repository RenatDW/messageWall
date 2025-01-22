package handlers

import (
	"cmd/main.go/internal/database"
	"cmd/main.go/internal/models"
	"encoding/json"
	"log"
	"net/http"
)

func CreatePost(w http.ResponseWriter, r *http.Request) {
	// requestBody := models.RequestBody{}
	// err := json.NewDecoder(r.Body).Decode(&requestBody)
	// if err != nil {
	// 	http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
	// 	return
	// }

	tokenAndText := models.RequestTokenAndText{}
	err := json.NewDecoder(r.Body).Decode(&tokenAndText)
	if err != nil {
		log.Print("error with decode")
	}
	data, err := CollectData(tokenAndText.Token)
	if err != nil {
		log.Print("error with parse")
	}
	db := database.ConnectDB()
	err = db.AutoMigrate(&models.Post{})

	if err != nil {
		log.Fatalf("Failed to migrate the database: %v", err)
	}
	post := models.Post{UserID: data.UserID, Text: tokenAndText.Text}
	result := db.Create(&post)

	if result.Error != nil {
		log.Println("Failed to create post:", result.Error)
	}

}

func GetPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-type", "application/json")

	db := database.ConnectDB()
	var posts []models.Post
	db.Preload("User").Find(&posts)

	err := json.NewEncoder(w).Encode(posts)
	if err != nil {
		log.Println("Failed to encode json")
	}
}
