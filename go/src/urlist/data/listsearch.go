package data


import (
    "fmt"
    "log"
    "strings"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
)

type UrlSearchResult struct {
    ListHash string `bson:"list_hash" json:"list_hash"`
    UrlHash string `bson:"hash" json:"url_hash"`
    FromListHash string `bson:"from_list_hash" json:"from_list_hash"`
    FromUrlHash string `bson:"from_url_hash" json:"from_url_hash"`
    UrlTitle string `bson:"title" json:"url_title"`
    UrlDescription string `bson:"description" json:"url_description"`
    Favicon string `json:"favicon"`
    Url string `json:"url"`
}

type MongoSearchResult struct {
    QueryDebugString string `bson:"queryDebugString"`

    Results []struct {
        Obj ListSearchResult
    }
}

type ListSearchResult struct {
    ListHash  string `bson:"hash" json:"list_hash"`
    ListTitle string `bson:"title" json:"list_title"`
    ListOwner string `bson:"user_id" json:"list_owner"`

    Urls []UrlSearchResult `json:"urls"`
}

type ListSearchWrapper struct {
    ListHits int `json:"list_hits"`
    UrlsHits int `json:"urls_hits"`
    Query string `json:"query"`
    StemmedQuery string `json:"stemmed_query"`

    Results []ListSearchResult `json:"results"`

    Scope string
}

type GlobalListSearchWrapper struct {
    ListSearchWrapper
}

func (s *ListSearchWrapper) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    s.Scope = q.Scope

    return s.FetchByQuery(key, dbs)
}

func (s *ListSearchWrapper) FetchByQuery(query string, dbs *mgo.Session) error {
    s.Query = query

    return nil
}

func (s *ListSearchWrapper) Authorize(userId string) bool {
    return true
}

func (s *ListSearchWrapper) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return s.Render(context, dbs)
}

func (s *MongoSearchResult) Fetch(query string, limitToUser string, dbs *mgo.Session) error {
    db := dbs.DB("")

    var isOwner bson.M

    if limitToUser != "" {
        isOwner = bson.M{"user_id": limitToUser}
    } else {
        isOwner = bson.M{"is_secret": false}
    }

    projectedFields := bson.M{"hash": 1, "_id": 0, "title": 1, "user_id": 1,
                              "urls.hash": 1, "urls.list_hash": 1, "urls.title": 1,
                              "urls.description": 1, "urls.favicon": 1, "urls.url": 1}

    if err := db.Run(bson.D{{"text", "urlists"},
                            {"search", query},
                            {"filter", isOwner},
                            {"project", projectedFields}}, &s); err != nil {
        return err
    }

    return nil
}

func (s *ListSearchWrapper) Render(context map[string] interface{}, dbs *mgo.Session) error {
    currentUserId := context["CurrentUserId"].(string)

    session := dbs.Clone()
    defer session.Close()

    results := MongoSearchResult{}

    if err := results.Fetch(s.Query, currentUserId, session); err != nil {
        return err
    }

    s.StemmedQuery = strings.Replace(results.QueryDebugString, "|", "", -1)

    for _, x := range results.Results {
        urls := []UrlSearchResult{}

        for _, y := range x.Obj.Urls {
            textToMatch := strings.ToLower(fmt.Sprint(y.UrlTitle, " ", y.UrlDescription))

            if strings.Index(textToMatch, s.StemmedQuery) != -1 {
                urls = append(urls, y)
                s.UrlsHits += 1
            }
        }

        x.Obj.Urls = urls

        s.Results = append(s.Results, x.Obj)

        s.ListHits += 1
    }

    return nil
}

func (s *GlobalListSearchWrapper) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return s.Render(context, dbs)
}

func (s *GlobalListSearchWrapper) Render(context map[string] interface{}, dbs *mgo.Session) error {
    var (
            currentUserId = context["CurrentUserId"].(string)
            searchUserId string
            currentUser = Profile{}
    )

    if err := currentUser.FetchByKey(currentUserId, nil, dbs); err != nil {
        return err
    }

    if s.Scope == "me" {
        searchUserId = currentUserId
    }

    session := dbs.Clone()
    defer session.Close()

    results := MongoSearchResult{}

    if err := results.Fetch(s.Query, searchUserId, session); err != nil {
        return err
    }

    s.StemmedQuery = strings.TrimRight(results.QueryDebugString, "|")
    s.StemmedQuery = strings.Replace(s.StemmedQuery, "|", " ", -1)

    var skip func(*ListSearchResult) bool

    switch s.Scope {
    case "network":
        log.Print("Search Scope: NETWORK")

        networkLists := userNetworkMap(&currentUser, dbs)

        skip = func(r *ListSearchResult) bool {
            _, match := networkLists[r.ListHash]

            return !match
        }
    case "me":
        log.Print("Search Scope: ME")

        skip = func(r *ListSearchResult) bool {
            return r.ListOwner != currentUserId
        }
    default:
        log.Print("Search Scope: GLOBAL")

        skip = func(_ *ListSearchResult) bool {
            return false
        }
    }

    for _, x := range results.Results {
        if skip(&x.Obj) {
            continue
        }

        urls := []UrlSearchResult{}

        for _, y := range x.Obj.Urls {
            textToMatch := strings.ToLower(fmt.Sprint(y.UrlTitle, " ", y.UrlDescription))
            terms := strings.Split(s.StemmedQuery, " ")

            for _, z := range terms {
                if strings.Index(textToMatch, z) != -1 {
                    urls = append(urls, y)
                    s.UrlsHits += 1

                    break
                }
            }
        }

        x.Obj.Urls = urls
        s.Results = append(s.Results, x.Obj)
        s.ListHits += 1
    }

    return nil
}
