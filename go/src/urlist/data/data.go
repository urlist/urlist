// Data package contains Data Types, Methods and Interfaces to deal with Urlist data through mongo db.
// Each collection is represented by a structs implementing methods for Render the optional dynamic fields.
// A dynamic field does not exists on it's own but it's created using data from other fields and data
// from a context (for example the Current User requesting the data).
//
// Dynamic field are contextual because their representation is different for each distinct observer.
package data

import (
    "labix.org/v2/mgo"
    "net/url"
    "strings"
)

// Fetcher interface define the core method which make a data
// entity fetchable by the Urlist Fetch Server.
type Fetcher interface {
    Authorize(string) bool
    FetchByKey(string, *QueryOpts, *mgo.Session) error
    Render(map[string] interface{}, *mgo.Session) error
    RenderWithCache(map[string] interface{}, *mgo.Session) error
}

type Stringer interface {
    String() string
}

type QueryOpts struct {
    Sort    []string
    UserId  string
    Network bool
    Fields  []string
    Scope   string
}

func QueryOptsFromUrl(u url.URL) *QueryOpts {
    qOpts := QueryOpts{}

    q := u.Query()

    qOpts.UserId = q.Get("user_id")
    qOpts.Scope = q.Get("scope")

    if s, hasSort := q["sort"]; hasSort {
        for _, x := range s {
            if x != "" && x != "popularity" {
                qOpts.Sort = append(qOpts.Sort, x)
            } else if x == "popularity" {
                qOpts.Sort = append(qOpts.Sort, "-popularity")
            }
        }
    }

    if s, hasNetwork := q["network"]; hasNetwork {
        networkValue := s[0]

        enableWhen := []string{"true", "1", "yes", "on"}

        for _, x := range enableWhen {
            if strings.Contains(strings.ToLower(networkValue), x) {
                qOpts.Network = true
                break
            }
        }
    }

    return &qOpts
}
