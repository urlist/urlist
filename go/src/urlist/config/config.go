// Config package contains types and helpers function to handle Urlist configuration files.
//
// Configuration files should live in the 'etc' folder and every app server should know it's location
// using the '--config' command line flag.
package config

import (
    "flag"
    "io/ioutil"
    "encoding/json"
)

// A ServerConfig is an example struct you can use when 
// creating a new app server.
type ServerConfig struct {
    Port          int
    TemplatePath  string
    // Assets are static files like js, images, css, etc
    AssetPath     string
}

// A ConfigFile is parsed by knowing it's fullpath and which interface to
// use during unmarshaling.
type ConfigFile struct {
    Filename string
    Config interface{}
}

// Load read the command line searching for the config flag, and
// unmarshal it's json data into the struct var v.
// Error is returned if Config.Parse fail
func Load(v interface{}) error {
    var configFname = flag.String("config", "config.json", "configuration file")

    flag.Parse()

    return LoadFromFile(*configFname, v)
}

func LoadFromFile(filename string, v interface{}) error {
    var cfg = ConfigFile{filename, v}

    if err := cfg.Parse(); err != nil {
        return err
    }

    return nil
}

// MustLoad is a helper that wraps a call to a function returning (error),
// and panics if error is non-nil.
func MustLoad(v interface{}) {
    if err := Load(v); err != nil {
        panic(err)
    }
}

func MustLoadFromFile(filename string, v interface{}) {
    if err := LoadFromFile(filename, v); err != nil {
        panic(err)
    }
}

// Parse content of the current configuration file using the interface
// specified in the 'Config' field.
// Return error if file does not exist or if umarshaling fail.
func (cfg *ConfigFile) Parse() error {
    f, err := ioutil.ReadFile(cfg.Filename)

    if err != nil {
        return err
    }

    if err := json.Unmarshal(f, &cfg.Config); err != nil {
        return err
    }

    return nil
}
