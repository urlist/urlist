package urlist 

import (
    "os"
    ospath "path"
    "time"
    "urlist/config"
    "labix.org/v2/mgo"
    "path/filepath"
)

var path string = ospath.Join(os.Getenv("GOPATH"), "etc")

// DatabaseConfig represent the minimum amount of parameters
// needed to return a database session.
type DatabaseConfig struct {
    // A slice of strings, each string should be a valid address:
    // Example: 127.0.0.1:27017
    Addrs []string

    // A database name which will be used by the mgo.DB call when 
    // the argument has zero value.
    // Example: session.DB("") // Return a session to DatabaseConfig.Name database
    Name string
}

// Database load configuration data from database.json file,
// and return a session to mongodb.
// Timeout is hardcoded to 5 minute and by default it ask the seed server
// about other servers. No authentication information are sent.
// Use IPTables to secure your installation.
func Database() *mgo.Session {
    dbConf := DatabaseConfig{}

    confPath := filepath.Join(path, "database.json")
    config.MustLoadFromFile(confPath, &dbConf)

    dialInfo := mgo.DialInfo{
        Addrs: dbConf.Addrs,
        Direct: false,
        Timeout: time.Duration(5 * time.Minute),
        Database: dbConf.Name,
    }

    dbs, err := mgo.DialWithInfo(&dialInfo)

    if err != nil {
        panic(err)
    }

    return dbs
}
