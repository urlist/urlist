// Urlist helpers
package urlist

import (
    "net/http"
    "log"
    "time"
)

// LoggedHandler is a helper that wraps a call to a function taking
// (http.ResponseWriter, *http.Request) and log the start and the end 
// of that call
func LoggedHandler(handler http.Handler) http.Handler {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        timerStart := time.Now()

        log.Printf("REQ %s --- %s %s", r.RemoteAddr,
                                        r.Method, r.URL)

        handler.ServeHTTP(w, r)

        log.Printf("REP %s --- %s %s - %s", r.RemoteAddr,
                                        r.Method, r.URL,
                                        time.Since(timerStart))
    })
}

func ServeMux() http.Handler {
    return LoggedHandler(http.DefaultServeMux)
}
