package main

import (
    "flag"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "urlist/data"
    "urlist"
    "log"
)

var DBS *mgo.Session
var hash string

var actions = map[string] func([]data.UrlistEntity, *mgo.Session) {
    "Unpopular Lists": markListAsUnpopular,
    "Beta Users": addUserToBeta,
}

func addUserToBeta(ls []data.UrlistEntity, dbs *mgo.Session) {
    c := dbs.DB("").C("users")

    count := len(ls)
    ids := make([]bson.ObjectId, count, count)

    removeFromBeta := func() {
        q := bson.M{"__beta": true, "_id": bson.M{"$nin": ids}}
        set := bson.M{"__beta": nil}

        if err := c.Update(q, bson.M{"$set": set}); err != nil {
            log.Printf("Cannot undone: %s", err)
        }
    }

    for _, ent := range ls {
        user := ent.Data.(data.Profile)

        ids = append(ids, user.UserId)

        if !user.UserId.Valid() {
            continue
        }

        set := bson.M{"__beta": true}

        if err := c.UpdateId(user.UserId, bson.M{"$set": set}); err != nil {
            log.Print(err)
            continue
        }

        log.Printf("User %s --- %s is now a beta user", user.Username, user.ScreenName)
    }

    removeFromBeta()
}

func markListAsUnpopular(ls []data.UrlistEntity, dbs *mgo.Session) {
    c := dbs.DB("").C("urlists")

    count := len(ls)
    hashes := make([]string, count, count)

    unmark := func() {
        q := bson.M{"__unpopular": true, "hash": bson.M{"$nin": hashes}}
        set := bson.M{"__unpopular": nil}

        if err := c.Update(q, bson.M{"$set": set}); err != nil {
            log.Printf("Cannot undone: %s", err)
        }
    }

    for _, ent := range ls {
        list := ent.Data.(data.List)

        hashes = append(hashes, list.Hash)

        if list.Hash == "" {
            continue
        }

        set := bson.M{"__unpopular": true}

        if err := c.Update(bson.M{"hash": list.Hash}, bson.M{"$set": set}); err != nil {
            log.Print(err)
            continue
        }

        log.Printf("List %s --- %s is now unpopular", list.Hash, list.Title)
    }

    unmark()
}

func init() {
    log.SetPrefix("MOD ")

    flag.StringVar(&hash, "hash", "", "Administrative List To Process")

    DBS = urlist.Database()
}

func InitMongo() error {
    if session, err := mgo.Dial("localhost"); err != nil {
        return err
    } else {
        DBS = session
        return nil
    }

    return nil
}

func main() {
    defer DBS.Close()

    flag.Parse()

    list := data.ListOfEntities{}
    list.FetchByHash(hash, DBS)

    action, actionExist := actions[list.Title]

    if !actionExist {
        log.Printf("No actions for %s", list.Title)
    }

    log.Printf("Processing: %s --- %s\n", list.Hash, list.Title)

    action(list.Entities, DBS)
}
