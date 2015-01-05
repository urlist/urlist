package main

import (
        "fmt"
        "log"
        "strings"
        "net/http"
        "labix.org/v2/mgo"
        "labix.org/v2/mgo/bson"
        "urlist"
        "urlist/data"
        "urlist/config"
        "time"
        "strconv"
        "encoding/json"
        "flag"
)

//
// START - Configuration
//
var CONFIG = Config{}
var DBS *mgo.Session
var Admins = make(map[string] string)

type Config struct {
    Server  config.ServerConfig

    Static struct {
        Path string
        Url string
    }
}

func init() {
    port := flag.Int("port", -1, "")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()

    if *port != -1 {
        CONFIG.Server.Port = *port
    }

    log.SetPrefix(fmt.Sprintf("FETCH:%v ", CONFIG.Server.Port))
}

func InitAdmins(dbs *mgo.Session) {
    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("users")

    var admins []struct {Id bson.ObjectId `bson:"_id"`
                         Username string}

    c.Find(bson.M{"__admin": true}).All(&admins)

    for _, x := range admins {
        adminId := string(x.Id.Hex())
        adminUsername := x.Username

        log.Printf("Registering admin: %s %s", adminId, adminUsername)
        Admins[adminId] = adminUsername
    }
}



//
// END - Configuration
//

func WriteJSON(w http.ResponseWriter, v interface{}) {
    var responseStr string

    if jsonB, err := json.Marshal(v); err != nil {
        responseStr = `"{}"`
    } else {
        responseStr = string(jsonB)
    }

    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Content-Length", strconv.Itoa(len(responseStr)))

    fmt.Fprint(w, responseStr)
}

func Fail(w http.ResponseWriter, requestId, currentUserId string, err error) {
    type Response struct {
        RequestId    string
        UserId       string
        RequestTime time.Time
        ResponseCode string
        Payload      string
    }

    response := Response{requestId, currentUserId, time.Now(), "OperationalError", err.Error()}

    log.Print(err.Error())

    WriteJSON(w, response)
}

//
// START - App Server
//
func FetchHandler(w http.ResponseWriter, r *http.Request) {
    url := r.URL
    qs := r.URL.Query()

    urlLevels := strings.Split(url.Path, "/")

    keyName := urlLevels[len(urlLevels) -2]
    keyValue := urlLevels[len(urlLevels) - 1]

    currentUserId := qs.Get("user_id")
    requestId := qs.Get("request_id")

    q := data.QueryOptsFromUrl(*url)

    var object data.Fetcher

    switch keyName {
        case "profile":
            object = &data.Profile{}
        case "user":
            object = &data.User{}
        case "list":
            object = &data.List{}
        case "popular":
            object = &data.PopularList{}
        case "facebookfriends":
            object = &data.FacebookFriends{}
        case "facebooklinks":
            object = &data.FacebookLinks{}
        case "toplists":
            object = &data.TopLists{}
        case "topusers":
            object = &data.TopUsers{}
        case "focuson":
            object = &data.FocusOn{}
        case "landing":
            object = &data.Landing{}
        case "contrib-notifications":
            object = &data.ContribNotifications{}
        case "notifications":
            object = &data.Notifications{}
        case "search-results":
            object = &data.ListSearchWrapper{}
        case "global-search-results":
            object = &data.GlobalListSearchWrapper{}
        case "network":
            mode := qs.Get("mode")
            object = &data.Network{}

            switch mode {
                case "url", "urls":
                    object.(*data.Network).RenderUrls = true
            }
        case "hashtags":
            object = &data.HashtagCollection{}
        case "hashtag":
            object = &data.HashtagItem{}
        case "categories":
            object = &data.CategoryCollection{}
        case "category":
            object = &data.CategoryItem{}
        case "followmore":
            object = &data.Followmore{}
    }

    if object == nil {
        http.Error(w, fmt.Sprintf("Unsupported Operation: %s", keyName), 501)
        return
    }

    if err := object.FetchByKey(keyValue, q, DBS); err != nil {
        Fail(w, requestId, currentUserId, err)

        log.Printf("%s %s does not exist", keyName, keyValue)

        return
    }

    currentUserIsAdmin := Admins[currentUserId] != ""

    if !object.Authorize(currentUserId) && !currentUserIsAdmin {
        err := fmt.Errorf("AuthorizationDenied")
        Fail(w, requestId, currentUserId, err)

        log.Printf("User %s cannot see %s %s", currentUserId, keyName, keyValue)

        return
    }

    context := map[string] interface{}{"CurrentUserId": currentUserId,
                                       "BasePath": CONFIG.Static.Path,
                                       "BaseUrl": CONFIG.Static.Url}

    if err := object.RenderWithCache(context, DBS); err != nil {
        log.Print(err)
    }

    type Response struct {
        RequestId string
        UserId    string
        RequestTime time.Time
        Payload   data.Fetcher
    }

    response := Response{requestId, currentUserId, time.Now(), object}

    WriteJSON(w, response)
}

func main() {
    defer DBS.Close()

    log.Print("Listening on port ", CONFIG.Server.Port)

    serverAddr := fmt.Sprint(":", CONFIG.Server.Port)

    http.HandleFunc("/", FetchHandler)

    InitAdmins(DBS)

    log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))
}
//
// END - App Server
//
