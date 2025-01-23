package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"cmd/main.go/internal/database"
	"cmd/main.go/internal/models"

	"github.com/gorilla/websocket"
	"github.com/lib/pq"
)

var upgrader = websocket.Upgrader{}
var clients = make(map[*websocket.Conn]bool)

func notifyClients(message models.WebhookPayload) {
	for client := range clients {
		err := client.WriteJSON(message)
		if err != nil {
			log.Println("Error sending message:", err)
			client.Close()
			delete(clients, client)
		}
	}
}

func WebSocketHandler(w http.ResponseWriter, req *http.Request) {
	c, err := upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	clients[c] = true

	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Error reading message:", err)
			}
			delete(clients, c)
			break
		}
	}
}

func startWebhookListener() {
	db := database.ConnectDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	listener := pq.NewListener(
		"host=localhost user=postgres password=1234 dbname=go_fp port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		10*time.Second,
		time.Minute,
		func(event pq.ListenerEventType, err error) {
			if err != nil {
				log.Fatalf("Listener error: %v", err)
			}
		},
	)
	defer listener.Close()

	err = listener.Listen("data_update")
	if err != nil {
		log.Fatalf("Failed to listen on 'data_update': %v", err)
	}

	log.Println("Listening for data_update notifications...")

	for {
		select {
		case notification := <-listener.Notify:
			if notification != nil {
				log.Printf("Received notification: %s", notification.Extra)

				var payload models.WebhookPayload
				err := json.Unmarshal([]byte(notification.Extra), &payload)
				if err != nil {
					log.Printf("Error parsing notification: %v", err)
					continue
				}
				payload.Login = database.GetUserName(payload.UserID)
				notifyClients(payload)

			}
		case <-time.After(90 * time.Second):
			log.Println("No notifications received for 90 seconds, pinging PostgreSQL")
			go listener.Ping()
		}
	}
}
