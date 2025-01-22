package handlers

import (
	"cmd/main.go/internal/database"
	"cmd/main.go/internal/models"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"gorm.io/gorm"
)

// TODO change secret key and hide
var secretKey = []byte("op12")

func Validate(w http.ResponseWriter, r *http.Request) {
	token := models.RequestToken{}
	err := json.NewDecoder(r.Body).Decode(&token)
	if err != nil {
		log.Print("error with decode")
	}
	data, err := CollectData(token.Token)
	if err != nil {
		log.Print("error with parse")
	} else {
		json.NewEncoder(w).Encode(&data)
	}
}
func CollectData(token string) (models.TokenAllData, error) {
	data, err := unparseToken(token)
	if err != nil {
		log.Print(err)
	}

	email, emailOk := data["email"].(string)
	login, loginOk := data["login"].(string)
	userIDfloat, userIDOk := data["userID"].(float64)

	if !emailOk {
		return models.TokenAllData{}, fmt.Errorf("error with decode email")
	} else if !loginOk {
		return models.TokenAllData{}, fmt.Errorf("error with decode login")
	} else if !userIDOk {
		return models.TokenAllData{}, fmt.Errorf("error with decode userID")
	}
	return models.TokenAllData{Token: token, Email: email, Login: login, UserID: uint(userIDfloat)}, nil
}

func unparseToken(token string) (map[string]interface{}, error) {
	claims, err := validateJWT(token)
	if err != nil {
		return nil, fmt.Errorf("error with validation %w", err)
	}
	if tu, _ := claims.GetExpirationTime(); tu.Unix() <= time.Now().Unix() {
		return nil, fmt.Errorf("error token expired")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("error decoding payload: %w", err)
	}

	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, fmt.Errorf("error unmarshaling payload: %w", err)
	}
	return data, nil
}

func identification(requestUserLogin models.RequestUserLogin, user *models.User, w http.ResponseWriter) bool {
	db := database.ConnectDB()
	err := db.Where("name = ?", requestUserLogin.Login).Or("email = ?", requestUserLogin.Login).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			log.Println("User not found")

		} else {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			log.Println("Internal Server Error")

		}
		return false
	}
	return true
}

func authorization(user models.User, requestUserLogin models.RequestUserLogin, w http.ResponseWriter) {
	if user.Password == requestUserLogin.Password {
		token, err := generateJWT(user)
		if err != nil {
			log.Print("error with JWT token")
		}
		TokenAllData := models.TokenAllData{Token: token, Login: user.Name, Email: user.Email, UserID: user.ID}
		json.NewEncoder(w).Encode(&TokenAllData)

	} else {
		http.Error(w, "Wrong pass", http.StatusUnauthorized)
	}
}

func generateJWT(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"userID": user.ID,
		"login":  user.Name,
		"email":  user.Email,
		"exp":    time.Now().Add(time.Hour * 24).Unix(),
		"iat":    time.Now().Unix(),
	}
	log.Print(claims)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

func validateJWT(tokenString string) (*jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secretKey, nil
	})
	if err != nil {
		return nil, fmt.Errorf("error parsing token: %w", err)
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	return &claims, nil
}
