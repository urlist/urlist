package data

import (
    "fmt"
    "net/http"
    "labix.org/v2/mgo"
    "encoding/json"
    "log"
)

type FacebookLinksData struct {
    Id, Link, Name, Description string
    CreatedTime string `json:"created_time"`
}

type FacebookLinksWrapper struct {
    Data []FacebookLinksData
    Paging struct {
        Next string
    }
}

type FacebookLinks struct {
    Links FacebookLinksWrapper
}

func (f *FacebookLinks) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return f.FetchByEdition(key, dbs)
}

func (f *FacebookLinks) FetchByEdition(edition string, dbs *mgo.Session) (error) {
    return nil
}

func (f *FacebookLinks) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return f.Render(context, dbs)
}

func (f *FacebookLinks) Render(context map[string] interface{}, dbs *mgo.Session) error {
    userId := context["CurrentUserId"].(string)

    facebookToken, err := FacebookToken(userId, dbs)

    if err != nil {
        return err
    }

    initialUrl := fmt.Sprintf("https://graph.facebook.com/me/links?access_token=%v&method=GET", facebookToken)

    pushLinks := func(xs *FacebookLinksWrapper) {
        for _, x := range xs.Data {
            f.Links.Data = append(f.Links.Data, x)
        }

        f.Links.Paging.Next = xs.Paging.Next

        log.Print(f.Links.Paging.Next)
    }

    fetch := func(url string) error {
        resp, err := http.Get(url)

        if err != nil {
            return err
        }

        links := FacebookLinksWrapper{}

        defer resp.Body.Close()

        decoder := json.NewDecoder(resp.Body)

        if err := decoder.Decode(&links); err != nil {
            return fmt.Errorf("Cannot decode facebook data: %v", err)
        }

        pushLinks(&links)

        return nil
    }

    for {
        if f.Links.Paging.Next == "" {
            f.Links.Paging.Next = initialUrl
        }

        if err := fetch(f.Links.Paging.Next); err != nil {
            continue
        }

        if f.Links.Paging.Next == "" {
            break
        }
    }

    return nil
}

func (f *FacebookLinks) Authorize(userId string) bool {
    return true
}
