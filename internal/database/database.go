package database

import (
	"log"

	"cmd/main.go/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectDB() *gorm.DB {
	dsn := "host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Println("error with data base connection")
	}
	return db
}

func GetUserName(id uint) string {
	db := ConnectDB()
	user := models.User{}
	db.Where("id = ?", id).First(&user)

	return user.Name
}
