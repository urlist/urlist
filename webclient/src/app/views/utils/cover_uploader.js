(function (w) {

    var CanvasImage = function (canvas, loader, img, callbacks) {
        // XXX: not so clean
        if (!canvas) {
            console.error("missing canvas...");
            return;
        }

        this.canvas  = canvas;
        this.loader  = loader;
        this.ctx     = canvas.getContext("2d");
        this.img     = img || new Image();

        this.callbacks = callbacks;

        this.img.addEventListener("load", this.imageChange.bind(this));

        this.reset();
        this.generateCallbacks();
        this.bindToCanvas();
        this.bindToLoader();
        this.clear();
    };

    CanvasImage.prototype.clear = function () {
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };

    CanvasImage.prototype.reset = function () {
        this.x     = 0;
        this.y     = 0;
        this.lastX = null;
        this.lastY = null;
        this.clear();
    };

    CanvasImage.prototype.redraw = function () {
        this.clear();
        this.ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
    };

    CanvasImage.prototype.checkRatio = function (ratio) {
        return true;
    };

    CanvasImage.prototype.imageChange = function () {
        this.ratio = Math.max(this.canvas.height / this.img.height,
                              this.canvas.width  / this.img.width);

        if (!this.checkRatio(this.ratio))
            return;

        this.reset();

        this.w = this.img.width * this.ratio;
        this.h = this.img.height * this.ratio;
        this.x = -(this.w - this.canvas.width) / 2;
        this.y = -(this.h - this.canvas.height) / 2;

        this.redraw();
    };

    CanvasImage.prototype.setNewCover = function (src){
        this.img.src = src;
    };

    CanvasImage.prototype.fileChange = function (evt) {
        var that   = this,
            file   = evt.target.files[0],
            reader = new FileReader();

        reader.onload = function (e) {
          that.setNewCover(e.target.result);
        };

        reader.readAsDataURL(file);
    };

    CanvasImage.prototype.generateCallbacks = function () {
        this.mouseDownBinded  = this.mouseDownCallback.bind(this);
        this.mouseMoveBinded  = this.mouseMoveCallback.bind(this);
        this.mouseUpBinded    = this.mouseUpCallback.bind(this);

        this.touchMoveBinded  = this.touchMoveCallback.bind(this);
    };

    CanvasImage.prototype.bindToCanvas = function () {
        if (this.binded) return;

        this.canvas.addEventListener("touchstart", this.mouseDownBinded, false);
        this.canvas.addEventListener("mousedown", this.mouseDownBinded, false);
        this.binded = true;
    };

    CanvasImage.prototype.unbindToCanvas = function () {
        if (!this.binded) return;

        this.canvas.removeEventListener("touchstart", this.mouseDownBinded, false);
        this.canvas.removeEventListener("mousedown", this.mouseDownBinded, false);
        this.binded = false;
    };

    CanvasImage.prototype.bindMoveToCanvas= function () {
        document.addEventListener("touchend",   this.mouseUpBinded, false);
        document.addEventListener("touchmove",  this.touchMoveBinded, false);

        document.addEventListener("mouseup",      this.mouseUpBinded,   false);
        document.addEventListener("mousemove",    this.mouseMoveBinded, false);
    };

    CanvasImage.prototype.unbindMoveToCanvas= function () {
        document.removeEventListener("touchend",   this.mouseUpBinded, false);
        document.removeEventListener("touchmove",  this.touchMoveBinded, false);

        document.removeEventListener("mouseup",      this.mouseUpBinded,   false);
        document.removeEventListener("mousemove",    this.mouseMoveBinded, false);
    };

    CanvasImage.prototype.bindToLoader= function () {
        if (!this.loader)
            return;

        this.loader.addEventListener("change", this.fileChange.bind(this), false);
    };

    CanvasImage.prototype.mouseDownCallback = function (evt) {
        this.drag = true;
        this.bindMoveToCanvas();

        evt.preventDefault();
    };

    CanvasImage.prototype.mouseUpCallback = function () {
        this.drag = false;
        this.lastX = null;
        this.lastY = null;
        this.unbindMoveToCanvas();
    };

    CanvasImage.prototype.mouseMoveCallback = function (evt) {
        var mx = evt.pageX,
            my = evt.pageY;

        if (!this.drag)
            return;

        this.move(mx, my);
    };

    CanvasImage.prototype.touchMoveCallback = function (evt) {
        var touch = evt.touches[0],
            mx    = touch.pageX,
            my    = touch.pageY;

        evt.preventDefault();

        if (!this.drag)
            return;

        this.move(mx, my);
    };

    CanvasImage.prototype.move = function (mx, my) {
        var offsetX, offsetY;

        if (this.lastX === null || this.lastY === null) {
            this.lastX = mx;
            this.lastY = my;
            return;
        }

        offsetX = mx - this.lastX;
        offsetY = my - this.lastY;

        this.lastX = mx;
        this.lastY = my;

        this.x += offsetX;
        this.y += offsetY;

        if (this.x > 0)
            this.x = 0;

        if (this.x + this.w < this.canvas.width)
            this.x = this.canvas.width - this.w;

        if (this.y > 0)
            this.y = 0;

        if (this.y + this.h < this.canvas.height)
            this.y = this.canvas.height - this.h;

        this.redraw();
    };

    CanvasImage.prototype.toDataURL = function () {
        return this.canvas.toDataURL();
    };

    w.CanvasImage = CanvasImage;

}) (window);
