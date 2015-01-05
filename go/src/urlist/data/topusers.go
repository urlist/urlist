package data


import (
    "log"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "sort"
)

// TopUsers use the same concept of FocusOn, but instead of list
// it have a list of Users.
type TopUsers struct {
    CategoryId string `json:"category_id"`
    CategoryName string `json:"category_name"`
    Users []TopUser `json:"users"`
}

type TopUser struct {
    User
    CategoryListsAmount int `json:"category_lists_amount"`
    TopLists []string `json:"top_lists"`
}

type Category struct {
    Id bson.ObjectId `bson:"_id" json:"category_id"`
    Name string `bson:"name" json:"name"`
}

func (t *TopUsers) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return t.FetchByCategoryId(key, dbs)
}

func (t *TopUsers) FetchByCategoryId(id string, dbs *mgo.Session) error {
    c := dbs.DB("").C("categories")

    category := Category{}

    var q bson.M

    if bson.IsObjectIdHex(id) {
        q = bson.M{"_id": bson.ObjectIdHex(id)}
    } else {
        q = bson.M{"slug": id}
    }

    if err := c.Find(q).One(&category); err != nil {
        return err
    }

    t.CategoryId = category.Id.Hex()
    t.CategoryName = category.Name

    log.Printf("%v", category)

    return nil
}

func (t *TopUsers) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return t.Render(context, dbs)
}

func (t *TopUsers) Render(context map[string] interface{}, dbs *mgo.Session) error {
    var topLists = make(map[string] []string)

    usersIds := func() map[string] int {
        c := dbs.DB("").C("urlists")
        iter := c.Find(bson.M{"categories": t.CategoryId}).Iter()

        list := struct { 
            UserId string `bson:"user_id"` 
            Title string }{}
        users := map[string] int{}

        for iter.Next(&list) {
            users[list.UserId]++

            if len(topLists[list.UserId]) < 3 {
                topLists[list.UserId] = append(topLists[list.UserId], list.Title)
            }
        }

        return users
    }

    users := usersIds()

    for userId, listsAmount := range users {
        user := TopUser{}

        if err := user.FetchByKey(userId, nil, dbs); err != nil {
            log.Printf("Cannot fetch user with id: %v --- %v", userId, err)
            continue
        }

        user.CategoryListsAmount = listsAmount

        if user.CategoryListsAmount < 3 {
            continue
        }

        user.TopLists = topLists[userId]

        user.renderListsAmount(context, dbs)

        t.Users = append(t.Users, user)
    }

    sort.Sort(TopUserByListsAmount{t.Users})

    return nil
}

func (t *TopUsers) Authorize(userId string) bool {
    return true
}

type rankedTopUsers []TopUser

func (s rankedTopUsers) Len() int      { return len(s) }
func (s rankedTopUsers) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type TopUserByListsAmount struct{ rankedTopUsers }

func (s TopUserByListsAmount) Less(i, j int) bool { return s.rankedTopUsers[i].CategoryListsAmount > s.rankedTopUsers[j].CategoryListsAmount }
