package main

import (
	"fmt"
	"log"
	"net/http"

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

func runScriptHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Print("Кнопка нажата")
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

	fmt.Println("Server is running on http://localhost:8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}

}
