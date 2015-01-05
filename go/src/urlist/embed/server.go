package main

import (
        "fmt"
        "log"
        "net/http"
        "net/url"
        "strconv"
        "regexp"
        "time"

        "labix.org/v2/mgo"

        "urlist"
        "urlist/config"

        "urlist/embed/amazon"
        "urlist/embed/youtube"
        "urlist/embed/vimeo"
        "urlist/embed/soundcloud"
        "urlist/embed/github"
)

//
// START - Configuration
//
var CONFIG = Config{}
var DBS *mgo.Session

type Config struct {
    Server      config.ServerConfig
    Amazon      amazon.Config
    Youtube     youtube.Config
    Vimeo       vimeo.Config
    Soundcloud  soundcloud.Config
    Github      github.Config
}

func init() {
    log.SetPrefix("EMBED ")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()
}

type Embeddable interface {
    Fetch() string
}

var engines = map[string] func(requestUr *url.URL, itemId string) Embeddable {
    "amazon": func(requestUrl *url.URL, itemId string) Embeddable {
        return &amazon.Amazon{
            Config: CONFIG.Amazon,
            RequestUrl: requestUrl,
            ItemId: itemId,
            Timestamp: time.Now(),
        }
    },

    "youtube": func(requestUrl *url.URL, itemId string) Embeddable {
        return &youtube.Youtube{
            Config: CONFIG.Youtube,
            RequestUrl: requestUrl,
            ItemId: itemId,
            Timestamp: time.Now(),
        }
    },

    "vimeo": func(requestUrl *url.URL, itemId string) Embeddable {
        return &vimeo.Vimeo{
            Config: CONFIG.Vimeo,
            RequestUrl: requestUrl,
            ItemId: itemId,
            Timestamp: time.Now(),
        }
    },

    "soundcloud": func(requestUrl *url.URL, itemId string) Embeddable {
        return &soundcloud.Soundcloud{
            Config: CONFIG.Soundcloud,
            RequestUrl: requestUrl,
            ItemId: itemId,
            Timestamp: time.Now(),
        }
    },

    "github": func(requestUrl *url.URL, itemId string) Embeddable {
        return &github.Github{
            Config: CONFIG.Github,
            RequestUrl: requestUrl,
            ItemId: itemId,
            Timestamp: time.Now(),
        }
    },
}

type EngineTest struct {
    Regexp *regexp.Regexp
    Id    string
}

func GuessEngine(u string) (string, string) {
    tests := []EngineTest {
        EngineTest{youtube.Regexp, "youtube"},
        EngineTest{amazon.Regexp, "amazon"},
        EngineTest{vimeo.Regexp, "vimeo"},
        EngineTest{soundcloud.Regexp, "soundcloud"},
        EngineTest{github.Regexp, "github"},
    }

    for _, test := range tests {
        m := test.Regexp.FindStringSubmatch(u)

        log.Printf("%v --- %v", u, m)

        if len(m) > 1 {
            return test.Id, m[len(m) - 1]
        }
    }

    return "", ""
}

//
// END - Configuration
//

//
// START - App Server
//
func EmbedHandler(w http.ResponseWriter, r *http.Request) {
    if r.URL.String() == "/favicon.ico" {
        return
    }

    corsHeaders := map[string] string {"Access-Control-Allow-Credentials": "true",
                                       "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
                                       "Access-Control-Allow-Methods": "GET, POST, PUT, HEAD, OPTIONS",
                                       "Access-Control-Allow-Origin":  "http://localhost:9999"}

    if r.Method == "OPTIONS" {
        w.Write([]byte(""))
        return
    }

    for k, v := range corsHeaders {
        w.Header().Set(k, v)
    }

    qs := r.URL.Query()

    embedUrl := qs.Get("url")

    var parsedUrl *url.URL

    if pUrl, err := url.Parse(embedUrl); err != nil {
        return
    } else {
        parsedUrl = pUrl
    }

    engName, resourceId := GuessEngine(embedUrl)
    makeEngine, isSupported := engines[engName]

    if !isSupported {
        log.Panicf("Resource is not embeddable")
    }

    eng := makeEngine(parsedUrl, resourceId)

    responsePayload := eng.Fetch()

    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Content-Length", strconv.Itoa(len(responsePayload)))

    fmt.Fprint(w, responsePayload)
}

func main() {
    defer DBS.Close()

    log.Print("Listening on port ", CONFIG.Server.Port)

    serverAddr := fmt.Sprint(":", CONFIG.Server.Port)

    http.HandleFunc("/", EmbedHandler)

    log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))
}
//
// END - App Server
//
