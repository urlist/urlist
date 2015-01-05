// Copyright 2013 Urlist. All rights reserved.
//
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
//
// Author: Andrea Di Persio <andrea@urli.st>

package main

import (
    "io"
    "os"
    "log"
    "fmt"
    "flag"

    "strings"

    "path"

    "os/exec"

    "net/http"

    "encoding/json"

    "urlist/cloudsync/lib"
)

var (
    config   = Config{}
    configFname = flag.String("config", "cloudsync.json", "Path to configuration file")
)

type Config struct {
    Port int

    GSUtilCommand string
    BucketPrefix string
}

func init() {
    log.SetPrefix("CLOUD ")

    flag.Parse()

    log.Printf("INFO --- Loading configuration from '%v'", *configFname)

    f, err := os.Open(*configFname)

    if err != nil {
        log.Panicf("Cannot read configuration file: %v", err)
    }

    defer f.Close()

    dec := json.NewDecoder(f)

    if err := dec.Decode(&config); err != nil {
        log.Panicf("Cannot decode configuration file: %v", err)
    }
}

func urlToFile(filename, addr string) string {
    var (
        err error
        resp *http.Response
        f *os.File
    )

    resp, err = http.Get(addr)

    if err != nil {
        panic(err)
    }

    defer resp.Body.Close()

    filepath := path.Join(os.TempDir(), filename)

    f, err = os.Create(filepath)

    if err != nil {
        panic(err)
    }

    defer f.Close()

    io.Copy(f, resp.Body)

    return filepath
}

func executePreHook(cmdName string, cs *lib.Cloudsync) error {
    cmd := exec.Command(cmdName, cs.Name)

    if output, err := cmd.CombinedOutput(); err != nil {
        log.Print(string(output))
        return err
    }

    return nil
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
    var (
        fileaddr,
        filename,
        fileid string
    )

    qs := r.URL.Query()

    fileaddr, fileid = qs.Get("filename"), qs.Get("fileid")

    log.Print(fileaddr)

    if fileaddr == "" {
        log.Print("Missing argument: filename")
        http.Error(w, "Missing argument", 400)
        return
    }

    if strings.HasPrefix(fileaddr, "http://") ||
       strings.HasPrefix(fileaddr, "https://") {

        if fileid == "" {
            log.Print("Missing argument: fileid")
            http.Error(w, "Missing argument", 400)
            return
        }

        filename = urlToFile(fileid, fileaddr)
    } else {
        filename = fileaddr
    }

    cloudsync := lib.NewCloudsync(
        config.GSUtilCommand, config.BucketPrefix,
        qs.Get("action"), qs.Get("bucket"), filename,
    )

    for _, x := range []string{cloudsync.Action, cloudsync.Bucket, cloudsync.Name} {
        if x == "" {
            log.Print("Missing argugments")
            http.Error(w, "Wrong arguments", 400)
            return
        }
    }

    if preHook, ok := qs["prehook"]; ok && preHook[0] != "" {
        if err := executePreHook(preHook[0], cloudsync); err != nil {
            errMsg := fmt.Sprintf("PreHook failure: %v", err)
            log.Print(errMsg)
            http.Error(w, errMsg, 500)
            return
        }
    }

    err := cloudsync.Exec()

    if err != nil {
        log.Printf("FAIL: %s", err)

        http.Error(w, fmt.Sprintf("%v", err), 500)
        return
    }

    remoteAddress := cloudsync.LinkAddress()

    log.Printf("OK --- %v", remoteAddress)
    fmt.Fprint(w, remoteAddress)
}

func main() {
    log.Print("Listening on port ", config.Port)
    serverAddr := fmt.Sprint(":", config.Port)

    http.HandleFunc("/", rootHandler)

    log.Fatal(http.ListenAndServe(serverAddr, nil))
}
