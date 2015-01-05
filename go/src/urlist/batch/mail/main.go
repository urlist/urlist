package main

import (

    "time"
    "log"
    "fmt"
    "flag"
    "net/http"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "github.com/mattbaird/gochimp"
    "urlist/config"
    "encoding/json"
    "bufio"
    "io"
    "os"
    "path"
    "urlist"
)

var Config = UrlistConfig{}
var DBS *mgo.Session

var templateName, inputPath string
var canSend, startServer bool
var days, backlog int


type MailQueue struct {
    Email string `bson:"email" json:"email"`
    Template string `bson:"template" json:"template"`
}

type MailAddress struct {
    Email, Name string
}

type MandrillMessage struct {
    State string
    Email string
    Ts int
    Template string `json:"template"`
}

type MandrillEvent struct {
    Event string
    Message MandrillMessage `json:"msg"`
}

type UrlistConfig struct {
    Database struct {
        Hostname string
        Port     int
    }

    Mandrill struct {
        Key, TemplatePath string
        HookPort int
    }
}

type User struct {
    Email string
    ScreenName string `bson:"screen_name"`
    Username string
    CreationTime time.Time `bson:"creation_time"`
}

type MailJob struct {
    Template string
    RefTime time.Time
    Query string
    Results []User
    Count uint32
}

func init() {
    log.SetPrefix("MAIL ")

    flag.StringVar(&templateName, "template", "", "Template specify both the logic and the mandrill template to use")
    flag.StringVar(&inputPath, "input",  "", "Must point to an input json file")

    flag.BoolVar(&canSend, "send", false, "Set this flag to canSend, require input from stdin, or --input flag")
    flag.BoolVar(&startServer, "server", false, "Set this flag to start the Mandrill Hook Server")

    flag.IntVar(&days, "days",  7, "")
    flag.IntVar(&backlog, "backlog", 0, "")

    if  err := config.Load(&Config); err != nil {
        log.Panic(err)
    }
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

func getRcpts(job *MailJob) []gochimp.Recipient {
    dbs := DBS.New()
    defer dbs.Close()

    c := dbs.DB("urlist").C("mail_queue")

    idx := mgo.Index{
        Key: []string{"email", "template"},
        Unique: true,
        DropDups: false,
        Background: false,
        Sparse: true,
    }

    if err := c.EnsureIndex(idx); err != nil {
        log.Panic(fmt.Sprintf("Cannot build index: %s", err))
    }

    rcpts := []gochimp.Recipient{}

    var rcptsCount uint

    for _, x := range job.Results {
        if err := c.Insert(MailQueue{x.Email, job.Template}); err != nil {
            continue
        }

        name := x.ScreenName

        if name == "" {
            name = x.Username
        }

        rcpts = append(rcpts, gochimp.Recipient{x.Email, name})

        rcptsCount++
    }

    log.Printf("Got %v recipients of %v to send", rcptsCount, job.Count)

    return rcpts
}

func makeMessage(job *MailJob) gochimp.Message {
    tmplPath := path.Join(
        Config.Mandrill.TemplatePath,
        fmt.Sprintf("%s.json", job.Template),
    )

    msg := gochimp.Message{}

    f, err := os.Open(tmplPath)

    if err != nil {
        log.Printf("Cannot read message template: %s --- %s", tmplPath, err)
        return msg
    }

    r := bufio.NewReader(f)
    dec := json.NewDecoder(r)

    if err := dec.Decode(&msg); err != nil {
        log.Print("Cannot read message template: %s --- %s", tmplPath, err)
        return msg
    }

    return msg
}

func doPrepare(dbs *mgo.Session, templateName string) {
    c := dbs.DB("urlist").C("users")

    now := time.Now()

    fullIntvEnd := now.AddDate(0, 0, -days)

    intvStart := time.Date(fullIntvEnd.Year(),
                           fullIntvEnd.Month(),
                           fullIntvEnd.Day(),
                           0, 0, 0, 0, now.Location())

    var intvEnd time.Time

    if backlog == 0 {
        intvEnd = time.Date(fullIntvEnd.Year(),
                            fullIntvEnd.Month(),
                            fullIntvEnd.Day(),
                            23, 59, 59, 0, now.Location())
    } else {
        d := now.AddDate(0, 0, -backlog)
        intvEnd = time.Date(d.Year(), d.Month(), d.Day(),
                            23, 59, 59, 0, now.Location())
    }

    q := bson.M{"creation_time": bson.M{"$gte": intvStart, "$lte": intvEnd},
                "is_anonymous": nil,
                "email": bson.M{"$ne": nil},
                "mailing": bson.M{"$ne": templateName}} // We write this field when a sent notify is received from Mandrill

    iter := c.Find(q).Iter()

    output := MailJob{templateName, intvEnd, fmt.Sprint(q), []User{}, 0}
    user := User{}

    for iter.Next(&user) {
        mailColl := dbs.DB("urlist").C("mail_queue")
        q := bson.M{"email": user.Email, "template": templateName}

        if count, _ := mailColl.Find(q).Count(); count != 0 {
            log.Printf("Skip %s, already sent", user.Username)
            continue
        }

        output.Results = append(output.Results, user)
        output.Count++
    }

    if data, err := json.Marshal(&output); err != nil {
        log.Print(err)
    } else {
        fmt.Print(string(data))
    }
}

func saveAndQuit(job *MailJob) {
    v, err := json.Marshal(job)

    if err != nil {
        log.Panic(err)
    }

    fname := fmt.Sprintf("%v.unsent", job.RefTime.Unix())

    if f, err := os.Create(fname); err != nil {
        log.Panic(err)
    } else {
        defer f.Close()

        if _, err := f.Write(v); err != nil {
            log.Panic(err)
        }
    }
}

func doSend(dbs *mgo.Session, r io.Reader) {
    abort := func(job *MailJob) {
        saveAndQuit(job)

        log.Panic("Cannot send messages! A backup of your data has been made.")
    }

    dec := json.NewDecoder(r)

    job := MailJob{}

    if err := dec.Decode(&job); err != nil {
        log.Fatal(err)
    }

    api, err := gochimp.NewMandrill(Config.Mandrill.Key)

    if err != nil {
        abort(&job)
    }

    if _, err := api.Ping(); err != nil {
        abort(&job)
    }

    msg := makeMessage(&job)

    if len(msg.To) == 0 {
        msg.To = getRcpts(&job)
    }

    send := func() ([]gochimp.SendResponse, error) {
        return api.MessageSendTemplate(
            job.Template,
            []gochimp.Var{},
            msg,
            true,
        )
    }

    if rs, err := send(); err != nil {
        abort(&job)
    } else {
        log.Print(rs)
    }
}

func Process(es []MandrillEvent) {
    dbs := DBS.New()
    defer dbs.Close()

    c := dbs.DB("urlist").C("mail_queue")

    for _, e := range es {
        log.Print(e)

        if e.Message.Template == "" {
            log.Printf("Discard send notification for %s, missing template name", e.Message.Email)
            continue
        }

        q := bson.M{"email": e.Message.Email, "template": e.Message.Template}

        if _, err := c.Upsert(q, bson.M{"$set": bson.M{"sent_at": time.Now()}}); err != nil {
            log.Printf("Discard send notification for %s, %s", e.Message.Email, err)
        }
    }
}

func HookHandler(w http.ResponseWriter, r *http.Request) {
    if err := r.ParseForm(); err != nil {
        log.Print(err)
    }

    evts, ok := r.PostForm["mandrill_events"]

    if !ok {
        http.Error(w, "Missing mandrill_events field", 400)
        return
    }

    events := []MandrillEvent{}

    if err := json.Unmarshal([]byte(evts[0]), &events); err != nil {
        http.Error(w, "Don't know what's happening", 500)
        log.Print(err)
    }

    Process(events)

    fmt.Fprint(w, "Got It, thanks")
}

func main() {
    if err := InitMongo(); err != nil {
        panic(err)
    } else {
        defer DBS.Close()
    }

    flag.Parse()

    if startServer {
        log.Print("Listening on port ", Config.Mandrill.HookPort)
        serverAddr := fmt.Sprint(":", Config.Mandrill.HookPort)

        http.HandleFunc("/", HookHandler)
        log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))

        return
    }

    if canSend {
        var r io.Reader

        if inputPath == "" {
            r = os.Stdin
        } else if inputPath != "" {
            if file, err := os.Open(inputPath); err != nil {
                log.Fatal(err)
            } else {
                r = bufio.NewReader(file)
            }
        } else {
            log.Fatal("Cannot send without input! Use stdin or --input flag")
        }

        doSend(DBS, r)
    } else {
        doPrepare(DBS, templateName)
    }
}
