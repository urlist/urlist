// Copyright 2013 Urlist. All rights reserved.
//
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
//
// Author: Andrea Di Persio <andrea@urli.st>

package main

import (
    "os"
    "io"

    "log"

    "flag"

    "image"

    "net/http"

    avatar "urlist/avatar/lib"
)

var (
    addr  string
    file  string
    out   string
)

const (
    MinSize = 180

    ErrSize = "Minimun size not reached. Should be at least %vx%v, is %vx%v"
)

func init() {
    flag.StringVar(&addr, "url", "", "Image web address")
    flag.StringVar(&file, "file", "", "Image file path")
    flag.StringVar(&out, "out", "out.jpg", "Output image file path")

    flag.Parse()
}

func fromUrl(addr string) io.Reader {
    resp, err := http.Get(addr)

    if err != nil {
        log.Panicf("%v", err)
    }

    return resp.Body
}

func fromFile(path string) io.Reader {
    f, err := os.Open(path)

    if err != nil {
        log.Panicf("%v", err)
    }

    return f
}

func getWriter() (w io.Writer) {
    var fileErr error

    switch out {
    case ":bin":
        w = os.Stdout

    default:
        if w, fileErr = os.Create(out); fileErr != nil {
            log.Panicf("%v", fileErr)
        }
    }

    return w
}

func main() {
    var (
        r io.Reader
        w io.Writer
    )

    if addr != "" {
        r = fromUrl(addr)
    } else if file != "" {
        r = fromFile(file)
    }

    if im, _, err := image.Decode(r); err != nil {
        log.Printf("%v", err)
        os.Exit(3)
    } else {
        pi, imErr := avatar.MakeProfileImage(im, MinSize)

        if imErr != nil {
            log.Print(imErr)
            os.Exit(-1)
        }

        w = getWriter()

        if saveErr := pi.Save(w); saveErr != nil {
            log.Panicf("%v", saveErr)
        }
    }
}
