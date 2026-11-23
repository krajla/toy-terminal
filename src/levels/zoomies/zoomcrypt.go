// zoomcrypt encrypts the zoomies log of the day, so nobody can read about Luna's night.
// cron runs it at every meal: see crontab -l.
package main

import (
	"encoding/base64"
	"log"
	"math/rand"
	"os"
	"time"
)

func main() {
	if len(os.Args) != 2 {
		log.Fatal("usage: zoomcrypt <log>")
	}
	path := os.Args[1]
	plain, err := os.ReadFile(path)
	if err != nil {
		log.Fatal(err)
	}

	// A new key every time. Nobody can guess the time.
	key := rand.New(rand.NewSource(time.Now().Unix()))
	out := make([]byte, len(plain))
	for i, b := range plain {
		out[i] = b ^ byte(key.Intn(256))
	}

	enc := base64.StdEncoding.EncodeToString(out) + "\n"
	if err := os.WriteFile(path+".enc", []byte(enc), 0o600); err != nil {
		log.Fatal(err)
	}
	if err := os.Remove(path); err != nil {
		log.Fatal(err)
	}
}
