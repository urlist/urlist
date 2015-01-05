package main

import (
        "fmt"
        "time"
        "log"
        "bytes"
        "net/http"
        "net/url"
        "html/template"
        "urlist/config"
        "urlist"
        "strings"
        "labix.org/v2/mgo"
        "labix.org/v2/mgo/bson"
        "urlist/data"
        "urlist/webauth/session"
)

//
// START - Configuration
//
var CONFIG = Config{}
var DBS *mgo.Session

var funcMap template.FuncMap = template.FuncMap{"Domain": data.DomainFromUrl}

type Config struct {
    Server  config.ServerConfig

    Static struct {
        Path string
        Url string
    }

    BaseUrl string
    AppMountPoint string

    Session session.Config
}

func init() {
    log.SetPrefix("WIDGET ")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()
}

//
// END - Configuration
//

//
// START - App Server
//

type TemplateContext struct {
    BaseUrl string
    AppMountPoint string
    List data.List
    Author data.User
    UrlsBySection map[string] []data.Url
    RefererHost string
}

type ParsedTemplate struct {
    Hash string `json:"hash"`
    UpdateTime time.Time `bson:"update_time" json:"update_time"`
    Template string `json:"template"`
}

type ResponseError struct {
    Code int
    Msg string
}

func getReferer(referer string) (refererHost string) {
    if v, err := url.Parse(referer); err == nil {
        hostParts := strings.Split(v.Host, ":")
        refererHost = hostParts[0]
    }

    if refererHost == "" {
        refererHost = "undefined"
    }

    return
}

func CachePurge(hash string, dbs *mgo.Session) error {
    c := dbs.DB("").C("widget_list_cache")

    if err := c.Remove(bson.M{"hash": hash}); err != nil {
        log.Print("CACHE Error: Cannot purge --- %s", err)
        return err
    }

    log.Print("CACHE Purge")

    return nil
}

func CacheGet(list data.List, referer string, dbs *mgo.Session) (string, error) {
    parsedTemplate := ParsedTemplate{}

    c := dbs.DB("").C("widget_list_cache")

    q := bson.M{"hash": list.Hash,
                "referer": referer,
                "update_time": bson.M{"$gte": list.UpdateTime}}

    if err := c.Find(q).One(&parsedTemplate); err != nil {
        return "", err
    }

    if parsedTemplate.Template == "" {
        CachePurge(list.Hash, dbs)

        return "", fmt.Errorf("CACHE GET Error --- Cache is empty")
    }

    return parsedTemplate.Template, nil
}

func trackReferer(userId, hash, referer string, dbs *mgo.Session) error {
    c := dbs.DB("").C("tracker")

    now := time.Now()
    year, weekOfTheYear := now.ISOWeek()

    cohortId := fmt.Sprintf("%v-%v", year, weekOfTheYear)

    ref := struct {
        Model string
        UserId string
        Target string
        ActionCohortId string
        Source string
        Tracker string
        Ts time.Time
    } {"list", userId, hash, cohortId, referer, "list_widget", now}

    if err := c.Insert(ref); err != nil {
        return err
    }

    return nil
}

func RootHandler(w http.ResponseWriter, r *http.Request) {
    refreshCache := false

    url := r.URL
    query := url.Query()

    if query.Get("refreshCache") != "" {
        refreshCache = true
    }

    urlLevels := strings.Split(url.Path, "/")

    key := urlLevels[len(urlLevels) -1]

    if key == "favicon.ico" {
        return
    }

    dbs := DBS.Clone()
    defer dbs.Close()

    httpSession := session.Session(w, r, CONFIG.Session, dbs)

    if err := trackReferer(httpSession.UserId, key, r.Referer(), dbs); err != nil {
        log.Print("Cannot Track Request: %s", err)
    }

    refererHost := getReferer(r.Referer())

    list := data.List{}

    if err := list.FetchByKey(key, nil, dbs); err != nil || list.IsSecret {
        http.Error(w, "List Not found", 404)
        return
    }

    var cacheGet func(data.List, string, *mgo.Session) (string, error)

    if refreshCache {
        cacheGet = func(list data.List, referer string, dbs *mgo.Session) (string, error) {
            return "", fmt.Errorf("CACHE Is Disabled")
        }
    } else {
        cacheGet = CacheGet
    }

    cachePut := func(hash string, data string) {
        c := dbs.DB("").C("widget_list_cache")

        log.Print("CACHE PUT")

        set := bson.M{"template": data,
                      "hash": hash,
                      "referer": refererHost,
                      "update_time": time.Now()}

        if _, err := c.Upsert(bson.M{"hash": hash}, bson.M{"$set": set}); err != nil {
            log.Printf("CACHE PUT Error: %s", err)
        }
    }

    parseTemplate := func() (string, error) {
        author := data.User{}

        if err := author.FetchByKey(list.UserId, nil, dbs); err != nil {
            return "", err
        }

        tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/list.html")

        t :=  template.New("list")
        t.Funcs(funcMap)

        if _, err := t.ParseFiles(tname); err != nil {
            log.Print(err)
            return "", err
        }

        c := TemplateContext{CONFIG.BaseUrl,
                             CONFIG.AppMountPoint,
                             list, author,
                             list.GroupUrlsBySection(),
                             refererHost}

        var doc bytes.Buffer

        if err := t.Execute(&doc, c); err != nil {
            return "", err
        }

        return doc.String(), nil
    }

    var responseBody string

    if parsedTemplate, err := cacheGet(list, refererHost, dbs); err != nil {
        log.Printf("CACHE MISS: %v", err)
        newResponseBody, parseErr := parseTemplate()

        if parseErr != nil {
            http.Error(w, fmt.Sprint(parseErr), 500)
            return
        }

        cachePut(list.Hash, newResponseBody)

        responseBody = newResponseBody
    } else {
        log.Print("CACHE HIT")
        responseBody = parsedTemplate
    }

    fmt.Fprint(w, responseBody)
}

func main() {
    defer DBS.Close()

    log.Print("Listening on port ", CONFIG.Server.Port)

    serverAddr := fmt.Sprint(":", CONFIG.Server.Port)

    assets := []string{"assets", "styles", "app", "libs"}
    assetPath := strings.TrimRight(CONFIG.Server.AssetPath, "/")

    for _, dirName := range assets {
        urlPattern := fmt.Sprint("/", dirName, "/")
        dirPath := fmt.Sprint(assetPath, "/", dirName)

        http.Handle(urlPattern, http.StripPrefix(urlPattern, http.FileServer(http.Dir(dirPath))))
    }

    http.HandleFunc("/", RootHandler)

    log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))
}
//
// END - App Server
//
