package handlers

import (
	"cmd/main.go/internal/database"
	"cmd/main.go/internal/models"
	"encoding/json"
	"fmt"
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
	db.Preload("User").Order("updated_at DESC").Find(&posts)

	err := json.NewEncoder(w).Encode(posts)
	if err != nil {
		log.Println("Failed to encode json")
	}
}

func DeletePost(w http.ResponseWriter, r *http.Request) {
	post := models.DeletePost{}
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		log.Println("DeletePost: Failed to decode json")
	}
	data, err := unparseToken(post.Token)
	if err != nil {
		log.Print(err)
	}

	userIDfloat, userIDOk := data["userID"].(float64)
	if !userIDOk {
		log.Println("error with decode userID")
	}
	userID := uint(userIDfloat)
	db := database.ConnectDB()
	if err := db.Where("id = ?", post.ID).Where("user_id = ?", userID).Error; err != nil {
		log.Println("error: post not found")
	}

	result := db.Delete(&models.Post{}, post.ID)

	if result.Error != nil {
		log.Fatalf("Failed to delete post: %v", result.Error)
	}

}

func EditPost(w http.ResponseWriter, r *http.Request) {
	post := models.EditPost{}
	err := json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		log.Println("EditPost: Failed to decode json")
	}
	data, err := unparseToken(post.Token)
	if err != nil {
		log.Print(err)
	}

	userIDfloat, userIDOk := data["userID"].(float64)
	if !userIDOk {
		log.Println("error with decode userID")
	}
	userID := uint(userIDfloat)
	db := database.ConnectDB()
	if err := db.Where("id = ?", post.ID).Where("user_id = ?", userID).Error; err != nil {
		log.Println("error: post not found")
	}

	var editedPost models.Post

	// Find the post first
	if err := db.First(&editedPost, post.ID).Error; err != nil {
		log.Fatalf("Post not found: %v", err)
	}

	// Update the fields
	editedPost.Text = post.Text

	// Save changes to the database
	if err := db.Save(&editedPost).Error; err != nil {
		log.Fatalf("Failed to update post: %v", err)
	}

	fmt.Println("Post updated successfully!")

}
