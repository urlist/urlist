// Copyright 2013 Urlist. All rights reserved.
//
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.
//
// Author: Andrea Di Persio <andrea@urli.st>

package lib

import (
    "image"
    "image/color"
)

func Crop(m image.Image, r image.Rectangle, w, h int) image.Image {
    if w < 0 || h < 0 {
        return nil
    }
    if w == 0 || h == 0 || r.Dx() <= 0 || r.Dy() <= 0 {
        return image.NewRGBA64(image.Rect(0, 0, w, h))
    }
    curw, curh := r.Min.X, r.Min.Y

    img := image.NewRGBA(image.Rect(0, 0, w, h))

    for y := 0; y < h; y++ {
        for x := 0; x < w; x++ {
            // Get a source pixel.
            subx := curw + x
            suby := curh + y

            r32, g32, b32, a32 := m.At(subx, suby).RGBA()
            r := uint8(r32 >> 8)
            g := uint8(g32 >> 8)
            b := uint8(b32 >> 8)
            a := uint8(a32 >> 8)

            img.SetRGBA(x, y, color.RGBA{r, g, b, a})
        }
    }

    return img
}
