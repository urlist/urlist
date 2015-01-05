package data

import (
    "time"
)

type rankedList struct {
    Hash       string  `bson:"hash" json:"hash"`
    Rank       float64 `bson:"rank" json:"rank"`
    IsFeatured bool    `bson:"is_featured" json:"is_featured"`
    Slug       string
    Title      string
    UpdateTime time.Time `bson:"update_time" json:"update_time"`
}

type rankedUser struct {
    UserId     string  `bson:"user_id" json:"user_id"`
    Rank       float64 `bson:"rank" json:"rank"`
    IsFeatured bool    `bson:"is_featured" json:"is_featured"`
}

type rankedUrl struct {
    Url

    UrlHash    string  `bson:"hash" json:"url_hash"`
    UrlTitle   string  `bson:"title" json:"url_title"`
    ListHash   string  `bson:"list_hash" json:"list_hash"`
    ListTitle  string   `bson:"list_title" json:"list_title"`
    ListLinksAmount int `bson:"list_links_amount" json:"list_links_amount"`
    Rank       float64 `bson:"rank" json:"rank"`
    IsFeatured bool    `bson:"is_featured" json:"is_featured"`
}

type rankedLists []rankedList

func (s rankedLists) Len() int      { return len(s) }
func (s rankedLists) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type ListByRank struct{ rankedLists }
func (s ListByRank) Less(i, j int) bool { return s.rankedLists[i].Rank > s.rankedLists[j].Rank }

type ListByUpdateTime struct{ rankedLists }
func (s ListByUpdateTime) Less(i, j int) bool { return s.rankedLists[i].UpdateTime.After(s.rankedLists[j].UpdateTime) }


type rankedUsers []rankedUser

func (s rankedUsers) Len() int      { return len(s) }
func (s rankedUsers) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type UserByRank struct{ rankedUsers }
func (s UserByRank) Less(i, j int) bool { return s.rankedUsers[i].Rank > s.rankedUsers[j].Rank }


type rankedUrls []rankedUrl

func (s rankedUrls) Len() int      { return len(s) }
func (s rankedUrls) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type UrlByCreationTime struct{ rankedUrls }
func (s UrlByCreationTime) Less(i, j int) bool { return s.rankedUrls[i].CreationTime.After(s.rankedUrls[j].CreationTime) }
