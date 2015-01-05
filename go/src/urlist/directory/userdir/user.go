package main

import (
    "log"
    "fmt"
    "os"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "urlist"
    "urlist/config"
    "html/template"
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
}

func init() {
    log.SetPrefix("DIR ")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()
}

//
// END - Configuration
//


type User struct {
    Username   string
    ScreenName string `bson:"screen_name"`
}

type Index struct {
    Id int
    FirstEntry, LastEntry User
}

func IndexWorker(incoming chan Index, control chan bool) {
    templateFilename := "templates/directory/user_index.html"
    t, err  := template.ParseFiles(templateFilename);

    if err != nil {
        log.Fatal(err)
    }

    indexes := []Index{}

    log.Println("IndexWorker Waiting for Jobs")

    for {
        select {
            case <-control:
                log.Printf("Writing user index")

                tfile, err := os.Create(fmt.Sprintf("%v/users/index.html", CONFIG.Destination))

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

func Worker(incoming chan [ItemsPerPage]User, makeIndex chan bool) {
    indexChan := make(chan Index)
    indexWorkerCtrl := make(chan bool)

    go IndexWorker(indexChan, indexWorkerCtrl)

    templateFilename := "templates/directory/user.html"
    t, err  := template.ParseFiles(templateFilename);

    if err != nil {
        log.Fatal(err)
    }

    currentIndex := Index{}
    currentIndex.Id = 0

    for {
        select {
            case batch := <-incoming:
            indexFilename := fmt.Sprintf("%v/users/%v.html", CONFIG.Destination, currentIndex.Id)
            indexFile, err := os.Create(indexFilename)

            if err != nil {
                log.Print(err)
                continue
            }

            currentIndex.FirstEntry = batch[0]
            currentIndex.LastEntry = batch[len(batch) - 1]

            context := struct {
                UrlistHttpAddress string
                Users [ItemsPerPage]User
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
    workerChan := make(chan [ItemsPerPage]User)
    makeIndexes := make(chan bool)

    go Worker(workerChan, makeIndexes)

    session := DBS.Clone()
    defer session.Close()

    c := session.DB("").C("users")

    user := User{}
    query := c.Find(bson.M{"is_anonymous": nil})

    var batchRealSize uint

    if count, err := query.Count(); err != nil {
        log.Fatal(err)
    } else {
        batchRealSize = uint(count)
    }

    iter := query.Sort("username").Iter()

    var batch [ItemsPerPage]User
    var batchCounter uint = 0

    for iter.Next(&user) {
        batch[batchCounter] = user

        batchCounter++

        if batchCounter == ItemsPerPage || batchCounter >= uint(batchRealSize) {
            batchCounter = 0

            workerChan <-batch
        }
    }

    log.Println("User Batch processing completed")

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
