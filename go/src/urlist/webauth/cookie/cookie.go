package cookie

import (
    "fmt"
    "bytes"
    "time"
    "crypto/sha1"
    "crypto/hmac"
    "encoding/hex"
    "encoding/base64"
    "strconv"
    "log"
    "strings"
)


func cookieIsExpired (cookieTime time.Time) bool {
    return cookieTime.Before(time.Now().AddDate(0, 0, -31))
}

func cookieIsFromFuture(cookieTime time.Time) bool {
    return cookieTime.After(time.Now().AddDate(0, 0, 31))
}

func cookieIsTampered(timestamp []byte) bool {
    return bytes.HasPrefix(timestamp, []byte("0"))
}

func checkTimestamp(bTimestamp []byte) error {
    var timestamp int64

    if t, err := strconv.ParseInt(string(bTimestamp), 0, 64); err != nil {
        return fmt.Errorf("Invalid timestamp: %v, got error: %s",
                          bTimestamp, err)
    } else {
        timestamp = t
    }

    cookieTime := time.Unix(timestamp, 0)

    if cookieIsExpired(cookieTime) {
        return fmt.Errorf("Expired Cookie")
    }

    if cookieIsFromFuture(cookieTime) {
        return fmt.Errorf("Cookie timestamp is in the future," +
                          "possible tampering")
    }

    if cookieIsTampered(bTimestamp) {
        return fmt.Errorf("Tampered cookie")
    }

    return nil
}


func DecodeSignedValue(secret, name, signedValue string) (decodedValue string) {
    if signedValue == "" {
        return
    }

    parts := bytes.Split([]byte(signedValue),[]byte("|"))

    if len(parts) != 3 {
        return
    }

    value := parts[0]
    timestamp := parts[1]
    signature := parts[2]

    newSignature := createSignature(secret, []byte(name), value, timestamp)

    if hmac.Equal(signature, newSignature) {
        fmt.Errorf("Invalid cookie signature ", signedValue)
        return
    }

    if err := checkTimestamp(timestamp); err != nil {
        log.Print(err)
        return
    }

    if data, err := base64.URLEncoding.DecodeString(string(value)); err == nil {
        decodedValue = string(data)
    }

    return
}

func createSignature(secret string, parts ...[]byte) []byte {
    h := hmac.New(sha1.New, []byte(secret))

    for _, x := range parts {
        h.Write(x)
    }

    hexDigest := make([]byte, 64)
    hex.Encode(hexDigest, h.Sum(nil))

    return hexDigest
}

func CreateSignedValue(secret, name, value string, createdAt time.Time) string {
    ts := fmt.Sprint(createdAt.Unix())

    b64Value := base64.URLEncoding.EncodeToString([]byte(value))

    signature := createSignature(secret,
                                 []byte(name),
                                 []byte(b64Value),
                                 []byte(ts))

    signedValue := strings.Join([]string{b64Value, ts, fmt.Sprintf("%s", signature)}, "|")

    if len(signedValue) < 64 {
        return ""
    }

    return signedValue[:64]
}
