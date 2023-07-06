void (function() {
    /**
     * A Web Worker that handles all the physics in a separate thread so that the main thread can focus on rendering.
     * @type {Worker}
     */
    const worker = new Worker("./worker.js");

    /**
     * The canvas element.
     * @type {HTMLCanvasElement}
     */
    const canvas = document.querySelector("canvas");

    /**
     * The canvas context.
     * @type {CanvasRenderingContext2D}
     */
    const ctx = canvas.getContext("2d");

    /**
     * A function that resizes the canvas and worker scene so that it fits the screen.
     */
    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;

        worker.postMessage([canvas.width, canvas.height]);
    }

    /**
     * Interpolates between two values.
     * @param {number} from The starting value.
     * @param {number} to The ending value.
     * @param {number} strength The strength of the interpolation.
     * @returns {number} The interpolated value.
     */
    function lerp(from, to, strength) {
        return from + (to - from) * strength;
    }

    // Rendering object
    class RenderObject {
        /**
         * A collection of all the render objects.
         * @type {Map<number, RenderObject>}
         */
        static collection = new Map();

        /**
         * Converts an ID to a color.
         * @param {number} id The ID to convert.
         * @returns {string} The color.
         * @static
         */
        static IDToColor(id) {
            const H = id % 361;
            const S = 50 + Math.floor(id / 26) % 51;
            const L = 40 + Math.floor(id / 26 / 51) % 51;

            return `hsl(${H}, ${S}%, ${L}%)`;
        }

        /**
         * Creates a new render object when receiving data from the worker.
         * @param {number} id The ID of the render object.
         * @param {number} x The starting X position.
         * @param {number} y The starting Y position.
         * @constructor
         */
        constructor(id, x, y) {
            this.id = id;
            this.x = x;
            this.y = y;

            this.rx = x;
            this.ry = y;

            this.size = 5;
            this.isFirework = false;

            this.color = RenderObject.IDToColor(id);

            RenderObject.collection.set(this.id, this);
        }

        /**
         * Updates the render object with new data from the worker.
         * @param {number} x The new X position.
         * @param {number} y The new Y position.
         */
        update(x, y) {
            this.rx = x;
            this.ry = y;
        }

        /**
         * Draws the render object. It lerps the position so that it looks smooth.
         * @returns {void}
         */
        draw() {
            this.x = lerp(this.x, this.rx, .1);
            this.y = lerp(this.y, this.ry, .1);

            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Receive data from the worker. Everything is sent as a number array so that it's easier to parse and faster to send.
    worker.onmessage = function(event) {
        /*
         * Packet structure:
         * [fireworkSize, shardSize, fireworkID, fireworkX, fireworkY, ..., shardID, shardX, shardY, ...]
         * We parse it like this because it's faster to send numbers than strings.
         * It's also better to send less data and interpolate it here.
         * I could do this in one thread using golang with WASM but this had to be in HTML/CSS/JS :(.
         * Golang is so much more fun to work with. WASM is also really cool. It's around 2.5x faster than JS with math.
         */
        const data = event.data;

        const fireworkSize = data.shift();
        const shardSize = data.shift();

        const fireworkIDs = [];
        const shardIDs = [];

        for (let i = 0; i < fireworkSize; i ++) {
            const id = data.shift();
            const x = data.shift();
            const y = data.shift();

            fireworkIDs.push(id);

            if (RenderObject.collection.has(id)) {
                RenderObject.collection.get(id).update(x, y);
            } else {
                const object = new RenderObject(id, x, y);
                object.size = 10;
                object.isFirework = true;
            }
        }

        for (let i = 0; i < shardSize; i ++) {
            const id = data.shift();
            const x = data.shift();
            const y = data.shift();

            shardIDs.push(id);

            if (RenderObject.collection.has(id)) {
                const object = RenderObject.collection.get(id);
                object.update(x, y);
                RenderObject.collection.set(id, object);
            } else {
                const object = new RenderObject(id, x, y);
                object.size = 5;
            }
        }

        RenderObject.collection.forEach(object => {
            if (object.isFirework) {
                if (!fireworkIDs.includes(object.id)) {
                    RenderObject.collection.delete(object.id);
                }
            } else {
                if (!shardIDs.includes(object.id)) {
                    RenderObject.collection.delete(object.id);
                }
            }
        });

        console.log(RenderObject.collection.size);
    }

    /**
     * The render loop.
     */
    function renderLoop() {
        requestAnimationFrame(renderLoop);

        // Background "fading" effect
        ctx.fillStyle = "rgba(0, 0, 0, .1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        RenderObject.collection.forEach(object => {
            object.draw();
        });
    }

    // Start the render loop
    window.onload = function() {
        resize();
        renderLoop();
    }

    // Resize the canvas when the window is resized
    window.onresize = resize;
})();