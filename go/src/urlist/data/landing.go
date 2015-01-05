package data


import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "fmt"
    "sort"
    "strings"
    "log"
    "time"
)


type Landing struct {
    Key string `bson:"key" json:"key"`
    Lists []rankedList `bson:"lists" json:"lists"`
}

func (l *Landing) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    l.Key = key

    return nil
}

func (l *Landing) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    session := dbs.Clone()
    defer session.Close()

    getCMUsers := func() []string {
        cmUsers := []struct { Id bson.ObjectId `bson:"_id"`}{}

        c := session.DB("").C("users")
        c.Find(bson.M{"__content_manager": true}).All(&cmUsers)

        cmUsersIds := []string{}

        for _, x := range cmUsers {
            cmUsersIds = append(cmUsersIds, x.Id.Hex())
        }

        return cmUsersIds
    }

    cmUsers := getCMUsers()

    listByTitle := func(label string) []rankedList {
        c := session.DB("").C("urlists")

        var titleRe string

        if label == "" {
            titleRe = `^\s*LANDING|L\s*$`
        } else {
            titleRe = fmt.Sprintf(`^L\s*\[%s\]\s*$`, label)
        }

        type Url struct {
            Position float64
            Url, Description string
        }

        type ListOfList struct {
            Slug, Title, Description string
            LastActionTime time.Time `bson:"last_action_time"`
            Urls []Url
        }

        srcList := ListOfList{}
        dstList := []rankedList{}

        q := bson.M{"title": bson.RegEx{titleRe, "i"},
                    "user_id": bson.M{"$in": cmUsers}}

        if err := c.Find(q).One(&srcList); err != nil {
            log.Print(err)
            return []rankedList{}
        }

        for _, x := range srcList.Urls {
            listUrlParts := strings.Split(x.Url, "/")
            listHash := listUrlParts[len(listUrlParts) - 1]
            isFeatured := strings.Index(x.Description, "#featured") != -1

            dstList = append(dstList, rankedList{listHash, 1 / x.Position, isFeatured, srcList.Slug, srcList.Title, srcList.LastActionTime})
        }

        sort.Sort(ListByRank{dstList})

        return dstList
    }

    l.Lists = listByTitle(l.Key)

    return nil
}

func (l *Landing) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (l *Landing) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (l *Landing) Authorize(userId string) bool {
    return true
}
