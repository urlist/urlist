// Copyright 2013 Urlist. All rights reserved.
//
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
//
// Author: Andrea Di Persio <andrea@urli.st>

// avatar/lib is a simple library you can use to make images squared and of
// fixed size.
package lib

import (
    "io"

    "fmt"

    "math"

    "image"
     "image/jpeg"
     _ "image/gif"
     _ "image/png"
)

var (
    MinSize int
)

const (
    ErrSize = "Minimun size not reached. Should be at least %vx%v, is %vx%v"
)

type ProfileImage struct {
    im image.Image

    Width,
    Height int

    ErrorMsg string
}

func NewProfileImage(im image.Image) *ProfileImage {
    p := im.Bounds().Size()

    return &ProfileImage{
        im: im,
        Width: p.X,
        Height: p.Y,
    }
}

func (pi *ProfileImage) NewImage(im image.Image) {
    pi.im = im
    p := im.Bounds().Size()

    pi.Width, pi.Height = p.X, p.Y
}

type ImageValidation struct {
    Condition func(int, int) bool
    F         func(*ProfileImage) (*image.Image, error)
    Id        func() string
}

func (iv *ImageValidation) Validate(pi *ProfileImage) error {
    if newIm, err := iv.F(pi); err != nil {
        return err
    } else {
        pi.NewImage(*newIm)
    }

    return nil
}

// If minimum size is not reached, bailout
var validateMinimumSize = ImageValidation{
    Condition: func(w, h int) bool{
        return w < MinSize || h < MinSize
    },

    F: func(im *ProfileImage) (*image.Image, error) {
        return nil, fmt.Errorf(ErrSize, MinSize, MinSize, im.Width, im.Height)
    },

    Id: func() string {
        return "Image has minimum size"
    },
}


// If image is a square we only have to resize it
var validateIsSquare= ImageValidation{
    Condition: func(w, h int) bool {
        return w == h
    },

    F: func (im *ProfileImage) (*image.Image, error) {
        // Image not need to be resized
        if im.Width == MinSize {
            return &im.im, nil
        }

        resizedIm := Resize(im.im, im.im.Bounds(), MinSize, MinSize)

        return &resizedIm, nil
    },

    Id: func() string {
        return "Image is a square"
    },
}

// Resize image according to a ratio
var validateResize = ImageValidation{
    Condition: func(w, h int) bool {
        return w != h
    },

    F: func (im *ProfileImage) (*image.Image, error) {
        getRatio := func(x int) float64 {
            return float64(MinSize) / float64(x)
        }

        ratio := math.Max(getRatio(im.Width), getRatio(im.Height))
        newWidth, newHeight := int(float64(im.Width) * ratio), int(float64(im.Height) * ratio)
        squareIm := Resize(im.im, im.im.Bounds(), newWidth, newHeight)

        return &squareIm, nil
    },

    Id: func() string {
        return "Resize with ratio"
    },
}

var validateCrop = ImageValidation{
    Condition: func(w, h int) bool {
        return w != h
    },

    F: func (im *ProfileImage) (*image.Image, error) {
        newWidth, newHeight := im.Width, im.Height

        getOffset := func(x int) int {
            return -(MinSize - x) / 2
        }

        leftOffset, topOffset := getOffset(newWidth), getOffset(newHeight)

        var (
            cropP1,
            cropP2 image.Point
        )

        cropP1 = image.Point{leftOffset, topOffset}

        if newWidth > newHeight {
            cropP2 = image.Point{newWidth - leftOffset, newHeight}
        } else {
            cropP2 = image.Point{newWidth, newHeight - leftOffset}
        }

        cropArea := image.Rectangle{cropP1, cropP2}

        cropIm := Crop(im.im, cropArea, MinSize, MinSize)

        return &cropIm, nil
    },

    Id: func() string {
        return "Crop"
    },
}

var validationPipe = []ImageValidation{
    validateMinimumSize,
    validateIsSquare,
    validateResize,
    validateCrop,
}

func MakeProfileImage(im image.Image, minSize int) (*ProfileImage, error) {
    MinSize = minSize

    pi := NewProfileImage(im)

    for _, v := range validationPipe{
        if v.Condition(pi.Width, pi.Height) {
            if err := v.Validate(pi); err != nil {
                return nil, err
            }
        }
    }

    return pi, nil
}

func (pi *ProfileImage) Save(w io.Writer) error {
    return jpeg.Encode(w, pi.im, &jpeg.Options{100})
}
