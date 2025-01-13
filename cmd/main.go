package main

import (
	"fmt"
	"net/http"
)

func runScriptHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Print("Кнопка нажата")
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
