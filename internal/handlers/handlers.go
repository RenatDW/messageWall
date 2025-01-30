package handlers

import (
	"log"
	"net/http"
)

func StartServer() {
	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/signup", SignUpUser)
	http.HandleFunc("/validate", Validate)
	http.HandleFunc("/add-post", CreatePost)
	http.HandleFunc("/ws", WebSocketHandler)
	http.HandleFunc("/api/posts", GetPosts)
	http.HandleFunc("/login", LoginUser)
	http.HandleFunc("/delete-message", DeletePost)
	http.HandleFunc("/edit-message", EditPost)
	log.Println("Server is running on http://localhost:8080")

	go startWebhookListener()

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Printf("Error starting server: %v\n", err)
	}
}
