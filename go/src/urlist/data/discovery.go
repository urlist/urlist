package data

import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "fmt"
    "log"
    "regexp"
    "time"
    "strings"
    "strconv"
)

type DiscoveryContainer struct {
    Title, Description, Hash, Edition string
    Lists []rankedList
    Users []rankedUser
}

func getLastEdition(label string, contentManagerUsers []string, dbs *mgo.Session) string {
    today := time.Now()
    thisYear, thisWeek := today.ISOWeek()

    c := dbs.DB("urlist").C("urlists")

    titleRegex := fmt.Sprintf(`^D\[\d{4}-\d{2}]\s*%s\s*(.*)$`, label)

    q := bson.M{"user_id": bson.M{"$in": contentManagerUsers},
                "title": bson.RegEx{titleRegex, "i"}}

    iter := c.Find(q).Sort("-title").Iter()

    list := struct {
        Title string
    }{}

    fallbacks := []string{}

    for iter.Next(&list) {
        edition, _ := editionFromTitle(label, list.Title)
        editionParts := strings.Split(edition, "-")

        strYear := editionParts[0]
        strWeek := editionParts[1]

        year, yearErr := strconv.Atoi(strYear)
        week, weekErr := strconv.Atoi(strWeek)

        if yearErr != nil || weekErr != nil {
            continue
        }

        if year > thisYear || week > thisWeek {
            fallbacks = append(fallbacks, edition)

            continue
        }

        return edition
    }

    if len(fallbacks) > 0 {
        return fallbacks[len(fallbacks) - 1]
    }

    return ""
}

func discoveryEntries(edition, label string, dbs *mgo.Session) DiscoveryContainer {
    session := dbs.Clone()
    defer session.Close()

    contentManagerUsers := GetContentManagerUsersIds(session)

    if edition == "" {
        edition = getLastEdition(label, contentManagerUsers, dbs)
    }

    type Url struct {
        Position float64
        Url, Description string
    }

    c := session.DB("urlist").C("urlists")

    listByTitle := func() DiscoveryContainer {
        titleRegex := fmt.Sprintf(`^D\[%s\]\s*%s\s*(.*)$`, edition, label)
        srcList := List{}

        q := bson.M{"user_id": bson.M{"$in": contentManagerUsers},
                    "title": bson.RegEx{titleRegex, "i"}}

        if err := c.Find(q).Sort("-creation_time").One(&srcList); err != nil {
            log.Print(err)
            return DiscoveryContainer{"", "", "", "", []rankedList{}, []rankedUser{}}
        }

        entities := srcList.GetEntities(session)

        lists := []rankedList{}
        users := []rankedUser{}

        for _, ent := range entities.Entities {
            isFeatured := ent.Flags["featured"]

            switch ent.Type {
                case "list":
                    d := ent.Data.(List)
                    lists = append(lists, rankedList{ent.Key, 1 / float64(ent.Metadata.Position), isFeatured, d.Slug, d.Title, d.LastActionTime})

                case "user":
                    users = append(users, rankedUser{ent.Key, 1 / float64(ent.Metadata.Position), isFeatured})
            }

        }

        newEdition, title := editionFromTitle(label, srcList.Title)

        return DiscoveryContainer{title, srcList.Description, srcList.Hash, newEdition, lists, users}
    }

    return listByTitle()
}

func editionFromTitle(label, srcTitle string) (string, string) {
    // D[2013-22] Focus On Foobar
    re := regexp.MustCompile(fmt.Sprintf(`^D\[(\d{4}\-\d{2})\]\s*%s\s*(.*)$`, label))
    matches := re.FindAllStringSubmatch(srcTitle, -1)

    if len(matches) < 1 {
        return "", ""
    }

    subMatch := matches[0]

    switch len(subMatch) {
        case 0, 1:
            return "", ""

        case 2:
            return subMatch[1], ""

        case 3:
            return subMatch[1], subMatch[2]
    }

    return "", ""
}

func userNetworkIterator(user *Profile, lastActionTime bson.M, dbs *mgo.Session) *mgo.Iter {
    c := dbs.DB("urlist").C("urlists")

    q := bson.M{"is_secret": false,
                "$or": []bson.M{bson.M{"user_id": bson.M{"$in": user.followedStr()}},
                                bson.M{"followers": user.UserId.Hex()}}}

    if lastActionTime != nil {
        q["last_action_time"] = lastActionTime
    }

    return c.Find(q).Sort("-last_action_time").Iter()
}

func userLists(user *Profile, dbs *mgo.Session) []rankedList {
    lists := []rankedList{}
    list := List{}

    oneWeek := time.Now().AddDate(0, 0, -21)
    lastActionTime := bson.M{"$gte": oneWeek}

    iter := userNetworkIterator(user, lastActionTime, dbs)

    for iter.Next(&list) {
        if len(list.Urls) < 1 {
            continue
        }

        lists = append(lists,
            rankedList{
                list.Hash,
                float64(list.LastActionTime.Unix()),
                false,
                list.Slug,
                list.Title,
                list.LastActionTime,
            })
    }

    return lists
}

func userNetworkMap(user *Profile, dbs *mgo.Session) map[string] bool {
    userNetwork := make(map[string] bool)

    iter := userNetworkIterator(user, nil, dbs)
    list := List{}

    for iter.Next(&list) {
        userNetwork[list.Hash] = true
    }

    return userNetwork
}
