package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"cmd/main.go/internal/database"
	"cmd/main.go/internal/models"
)

func LoginUser(w http.ResponseWriter, req *http.Request) {

	requestUserLogin := models.RequestUserLogin{}
	if err := json.NewDecoder(req.Body).Decode(&requestUserLogin); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	var user models.User
	if !identification(requestUserLogin, &user, w) {
		return
	}
	authorization(user, requestUserLogin, w)
}

func SignUpUser(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}
	var requestUser models.RequestUser
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

	user := models.User{Name: requestUser.Login, Email: requestUser.Email, Password: requestUser.Password}
	db := database.ConnectDB()

	result := db.Create(&user)
	if result.Error != nil {
		log.Print("Error creating user:", result.Error)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User signed up successfully"})
}
