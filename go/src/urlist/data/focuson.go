package data


import (
    "labix.org/v2/mgo"
)

// FocusOn represent a FocusOn edition, where edition is 'YEAR-WEEK_OF_THE_YEAR'
// For every edition a list with the name 'D[EDITION] Focus On TOPIC' 
// should exist.
// Every link in the source list should be a link to an urlist list.
type FocusOn struct {
    // Parsed from the source list title
    Topic string `json:"topic"`

    // Parsed from the source list title, set to the last edition
    // is no edition is specified.
    Edition string `json:"edition"`

    // Parsed from the source list description
    Description string `json:"description"`

    // The hash of the lists pointed by the links in the list.
    Lists []rankedList `json:"lists"`

    // The list we use to take the data
    Source string `json:"source"`
}

func (f *FocusOn) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return f.FetchByEdition(key, dbs)
}

func (f *FocusOn) FetchByEdition(edition string, dbs *mgo.Session) (error) {
    data := discoveryEntries(edition, "Focus On", dbs)

    f.Edition = data.Edition
    f.Topic = data.Title
    f.Description = data.Description
    f.Source = data.Hash
    f.Lists = data.Lists

    return nil
}

func (f *FocusOn) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return f.Render(context, dbs)
}

func (f *FocusOn) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (f *FocusOn) Authorize(userId string) bool {
    return true
}
