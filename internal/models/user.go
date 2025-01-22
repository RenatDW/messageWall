package models

type User struct {
	ID       uint   `gorm:"primaryKey"`
	Name     string `gorm:"unique"`
	Email    string `gorm:"unique"`
	Password string
}

type RequestBody struct {
	UserID uint   `json:"user_id"`
	Text   string `json:"text"`
}

type RequestUser struct {
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RequestUserLogin struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type RequestToken struct {
	Token string `json:"token"`
}
type RequestTokenAndText struct {
	Token string `json:"token"`
	Text  string `json:"text"`
}

type TokenAllData struct {
	Token  string `json:"token"`
	Email  string `json:"email"`
	UserID uint   `json:"userID"`
	Login  string `json:"login"`
}

type WebhookPayload struct {
	ID     uint   `json:"id"`
	UserID int    `json:"user_id"`
	Text   string `json:"text"`
	Action string `json:"action"`
}

type Post struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint `gorm:"index"` // Foreign key with index for optimization
	Text   string
	User   User `gorm:"foreignKey:UserID"` // Establish relationship
}
