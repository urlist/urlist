package main

import (
    "os"
    "fmt"
    "log"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "urlist"
    "urlist/config"
    "html/template"
    "strings"
)

const ItemsPerPage uint = 100

//
// START - Configuration
//

var CONFIG = Config{}
var DBS *mgo.Session

type Config struct {
    Destination string
    UrlistHttpAddress string
    HttpAddress string
    Blacklist []string
}

func init() {
    log.SetPrefix("DIR ")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()
}

//
// END - Configuration
//



//
// END - Configuration
//

type List struct {
    Title string
    Hash  string
    Slug  string
}

func (list *List) IsBlacklisted() bool {
    blacklistEnabled := len(CONFIG.Blacklist) > 0

    if !blacklistEnabled {
        return false
    }

    lTitle := strings.ToLower(list.Title)

    for _, x := range CONFIG.Blacklist {
        if strings.Index(lTitle, strings.ToLower(x)) != -1 {
            return true
        }
    }

    return false
}

type Index struct {
    Id int
    FirstEntry, LastEntry List
}

func IndexWorker(incoming chan Index, control chan bool) {
    templateFilename := "templates/directory/list_index.html"
    t, err  := template.ParseFiles(templateFilename);

    if err != nil {
        log.Fatal(err)
    }

    indexes := []Index{}

    log.Println("IndexWorker Waiting for Jobs")

    for {
        select {
            case <-control:
                log.Printf("Writing list index")

                tfile, err := os.Create(fmt.Sprintf("%v/lists/index.html", CONFIG.Destination))

                if err != nil {
                    log.Fatal(err)
                }

                context := struct {
                    Indexes []Index
                    HttpAddress string
                }{indexes, CONFIG.HttpAddress}

                t.Execute(tfile, context)
                tfile.Close()

                control <-true

            case index := <-incoming:
                indexes = append(indexes, index)

                control <- true
        }
    }
}

func Worker(incoming chan [ItemsPerPage]List, makeIndex chan bool) {
    indexChan := make(chan Index)
    indexWorkerCtrl := make(chan bool)

    go IndexWorker(indexChan, indexWorkerCtrl)

    templateFilename := "templates/directory/list.html"
    t, err  := template.ParseFiles(templateFilename);

    if err != nil {
        log.Fatal(err)
    }

    currentIndex := Index{}
    currentIndex.Id = 0

    for {
        select {
            case batch := <-incoming:

            indexFilename := fmt.Sprintf("%v/lists/%v.html", CONFIG.Destination, currentIndex.Id)
            indexFile, err := os.Create(indexFilename)

            if err != nil {
                log.Print(err)
                continue
            }

            currentIndex.FirstEntry = batch[0]
            currentIndex.LastEntry = batch[len(batch) - 1]

            context := struct {
                UrlistHttpAddress string
                Lists [ItemsPerPage]List
                Index Index
            }{CONFIG.UrlistHttpAddress, batch, currentIndex}

            t.Execute(indexFile, context)

            indexFile.Close()

            indexChan <-currentIndex
            <-indexWorkerCtrl

            currentIndex.Id++

            case <-makeIndex:
                indexWorkerCtrl <-true
                <-indexWorkerCtrl
                makeIndex <-true
        }
    }
}

func getBatches() {
    workerChan := make(chan [ItemsPerPage]List)
    makeIndexes := make(chan bool)

    go Worker(workerChan, makeIndexes)

    session := DBS.Clone()
    defer session.Close()

    c := session.DB("").C("urlists")

    list := List{}
    query := c.Find(bson.M{"is_secret": false, "title": bson.M{"$ne": ""}})

    var batchRealSize uint

    if count, err := query.Count(); err != nil {
        log.Fatal(err)
    } else {
        batchRealSize = uint(count)
    }

    iter := query.Sort("title").Iter()

    var batch [ItemsPerPage]List
    var batchCounter uint = 0

    for iter.Next(&list) {
        if list.IsBlacklisted() {
            continue
        }

        batch[batchCounter] = list

        batchCounter++

        if batchCounter == ItemsPerPage || batchCounter >= uint(batchRealSize) {
            batchCounter = 0

            workerChan <-batch
        }
    }

    log.Println("List Batch processing completed")

    makeIndexes <- true
    <-makeIndexes
}

func main() {
    defer DBS.Close()

    getBatches()
}
//
// END - App Server
//
