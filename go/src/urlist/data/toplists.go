package data


import (
    "labix.org/v2/mgo"
)

type TopLists struct {
    Edition string `json:"edition"`
    Lists []rankedList `json:"lists"`
    Source string `json:"source"`
}

func (t *TopLists) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return t.FetchByEdition(key, dbs)
}

func (t *TopLists) FetchByEdition(edition string, dbs *mgo.Session) (error) {
    data := discoveryEntries(edition, "Top Lists", dbs)

    t.Edition = data.Edition
    t.Source = data.Hash
    t.Lists = data.Lists

    return nil
}

func (t *TopLists) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return t.Render(context, dbs)
}

func (t *TopLists) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (t *TopLists) Authorize(userId string) bool {
    return true
}
