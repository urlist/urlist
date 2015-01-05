// Copyright 2013 Urlist. All rights reserved.
//
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
//
// Author: Andrea Di Persio <andrea@urli.st>

package lib

import (
    "log"
    "fmt"
    "os/exec"
    "strings"
)

type Cloudsync struct {
    Action,
    Bucket,
    Name,

    BucketPrefix,
    CmdPath string
}



func (n *Cloudsync) BucketName() string {
    clean := func(x string) string {
        return strings.TrimRight(x, "/")
    }

    if n.BucketPrefix == "" {
        return clean(n.Bucket)
    }

    return clean(fmt.Sprintf("%s-%s", n.BucketPrefix, n.Bucket))
}

func (n *Cloudsync) BucketPath() string {
    return fmt.Sprintf("gs://%v", n.BucketName())
}

func (n *Cloudsync) LinkAddress() string {
    nameParts := strings.Split(n.Name, "/")
    filename := nameParts[len(nameParts) - 1]

    return fmt.Sprintf(
        "http://commondatastorage.googleapis.com/%v/%v",
        n.BucketName(),
        filename,
    )
}

func (n *Cloudsync) CloudPut() error {
    cmd := exec.Command(n.CmdPath, "cp", n.Name, n.BucketPath())

    if output, err := cmd.CombinedOutput(); err != nil {
        log.Print(string(output))
        return err
    }

    return nil
}

func (n *Cloudsync) CloudDel() error {
    filename := fmt.Sprintf("%s/%s", strings.TrimRight(n.BucketPath(), "/"),
                                     strings.TrimLeft(n.Name, "/"))

    cmd := exec.Command(n.CmdPath, "rm", filename)

    if output, err := cmd.CombinedOutput(); err != nil {
        log.Print(string(output))
        return err
    }

    return nil
}

func (n *Cloudsync) Exec() error {
    var err error

    log.Printf("EXEC: %s %s => %s", n.Action, n.BucketPath(), n.Name)

    switch n.Action {
        case "put":
            err = n.CloudPut()

        case "delete":
            err = n.CloudDel()
    }

    return err
}

func NewCloudsync(cmdPath, bucketPrefix, action, bucket, filename string) *Cloudsync {
    return &Cloudsync{
        Action: action,
        Bucket: bucket,
        Name: filename,
        CmdPath: cmdPath,
        BucketPrefix: bucketPrefix,
    }
}
