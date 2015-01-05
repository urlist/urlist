package data


import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "sort"
    "time"
    "fmt"
    "log"
)

// PopularList represent the first 100 lists with the highest Rank.
// Rank is calculated by list.DiscoveryRank method.
// Since all the list in the database need to be iterated, we use an
// aggressive cache strategy. The cache is refreshed every 3 hours.
type PopularList struct {
    Lists []rankedList `json:"lists"`
}

func (p *PopularList) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return nil
}

type PopularListCache struct {
    Lists []rankedList `json:"lists"`
    Timestamp time.Time
}

func (p *PopularList) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    now := time.Now()

    cacheGet := func() error {

        c := dbs.DB("").C("discovery_cache")

        cache := PopularListCache{}

        q := bson.M{"key": "popular_lists"}

        if err := c.Find(q).One(&cache); err != nil {
            return err
        }

        cacheAge := time.Since(cache.Timestamp)

        log.Printf("POPULAR CACHE --- AGE %v", cacheAge)

        if cacheAge >= time.Duration(3 * time.Hour) {
            return fmt.Errorf("Cache Expired")
        }

        p.Lists = cache.Lists

        return nil
    }

    cachePut := func() {
        c := dbs.DB("").C("discovery_cache")

        q := bson.M{"key": "popular_lists"}
        set := bson.M{"lists": p.Lists, "timestamp": now}

        if _, err := c.Upsert(q, bson.M{"$set": set}); err != nil {
            log.Print(err)
        }
    }

    cacheErr := cacheGet()

    if cacheErr != nil {
        log.Printf("POPULAR CACHE --- MISS %s", cacheErr)

        if renderErr := p.Render(context, dbs); renderErr != nil {
            return renderErr
        }

        log.Print("POPULAR CACHE --- PUT")

        cachePut()
    } else {
        log.Print("POPULAR CACHE --- HIT")
    }

    return nil
}

func (p *PopularList) Render(context map[string] interface{}, dbs *mgo.Session) error {
    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("urlists")

    iter := c.Find(bson.M{"is_secret": false,
                          "__unpopular": nil}).Sort("-last_action_time").Iter()

    lists := []rankedList{}
    list := List{}

    for iter.Next(&list) {
        lists = append(lists, rankedList{list.Hash, list.Rank, false, list.Slug, list.Title, list.UpdateTime})
    }

    sort.Sort(ListByRank{lists})

    if len(lists) > 0 {
        p.Lists = lists[:100]
    }

    return nil
}

func (p *PopularList) Authorize(userId string) bool {
    return true
}
