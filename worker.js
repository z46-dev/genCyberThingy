// The size of the canvas, gets updated by the main thread.
let width = 1024;
let height = 768;

// The firework class, which contains the shards.
// It does math and stuff
class Firework {
    static Shard = class Shard {
        static collection = new Map();

        constructor(x, y) {
            this.id = Firework.id++;
            this.x = x;
            this.y = y;

            this.vx = 0;
            this.vy = 0;
            
            this.speedFactor = .25 + Math.random() * 1.75;
            this.range = 30 + Math.random() * 16;

            Shard.collection.set(this.id, this);
        }

        update() {
            this.x += this.vx * this.speedFactor;
            this.y += this.vy * this.speedFactor;

            this.vy += .5 * this.speedFactor;

            this.range -= this.speedFactor;

            if (this.range < 0) {
                Shard.collection.delete(this.id);
            }
        }
    }

    static id = 0;
    static collection = new Map();

    constructor(x, y, angle) {
        this.id = Firework.id++;
        this.x = x;
        this.y = y;

        this.angle = angle;
        this.speed = 25 + Math.random() * 25;

        this.frictionFactor = .9 + Math.random() * .05;

        Firework.collection.set(this.id, this);
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        this.speed *= this.frictionFactor;

        if (this.speed < 1) {
            Firework.collection.delete(this.id);

            for (let i = 0; i < 15; i++) {
                const shard = new Firework.Shard(this.x, this.y);
                const angle = Math.random() * Math.PI * 2;
                const speed = 5 + Math.random() * 5;
                shard.vx = Math.cos(angle) * speed;
                shard.vy = Math.sin(angle) * speed;
            }
        }
    }
}

// The physics loop.
function physicsLoop() {
    if (Firework.collection.size < 5 + Math.sin(performance.now() / 5000) * 5) {
        new Firework(Math.random() * width, height, -Math.PI / 2);
    }

    Firework.collection.forEach(firework => {
        firework.update();
    });

    Firework.Shard.collection.forEach(shard => {
        shard.update();
    });
}

// The update loop.
function updateLoop() {
    const output = [Firework.collection.size, Firework.Shard.collection.size];
    
    Firework.collection.forEach(firework => {
        output.push(firework.id, firework.x, firework.y);
    });

    Firework.Shard.collection.forEach(shard => {
        output.push(shard.id, shard.x, shard.y);
    });

    postMessage(output);
}

setInterval(physicsLoop, 1000 / 30);
setInterval(updateLoop, 1000 / 15);

// The message handler.
self.onmessage = function(event) {
    const data = event.data;

    width = data.shift();
    height = data.shift();
}