class Ogre {

    constructor(game, x, y) {
        Object.assign(this, { game, x, y });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/ogre/ogre.png");
        this.facing = [0, randomInt(2)]; // down, up, right, left
                                         // 0, 1, 0, 1 
        this.state = 0; // idle, walking, attacking, damaged, dead
                        // 0, 1, 2, 3, 4
        this.maxHp = 1000;
        this.hp = this.maxHp;
        this.minProximity = 2;
        this.visionDistance = 400;
        this.attackDistance = 75;
        this.shotsTaken = [];
        this.shootTimer = 0;
        this.shootFlag = false;
        this.damagedTimer = 0;
        this.deadTimer = 0;
        this.velocityConstant = randomInt(2) + 2;
        this.walkSpeed = 0.15 * (4 / this.velocityConstant);
        this.velocity = { x: 0, y: 0 };
        this.animations = [];
        this.updateBB();
        this.loadAnimations();
    };

    loadAnimations() {
        this.animations.push(new AnimationGroup(this.spritesheet, 0, 0, 32, 32, 16, 0.3, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 64 * 32, 0, 32, 32, 6, this.walkSpeed, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 88 * 32, 0, 32, 32, 4, 0.12, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 104 * 32, 0, 32, 32, 4, 0.15, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 120 * 32, 0, 32, 32, 14, 0.15, false, true));
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        this.hitBB = new BoundingBox(this.x + 10 * PARAMS.SCALE, this.y + 8 * PARAMS.SCALE, 11 * PARAMS.SCALE, 12 * PARAMS.SCALE);
        this.collisionBB = new BoundingBox(this.hitBB.x, this.hitBB.y + 6 * PARAMS.SCALE, 11 * PARAMS.SCALE, 6 * PARAMS.SCALE);
    };

    update() {

        let prevState = this.state;
        this.facing[0] = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;

        this.shootTimer = Math.max(0, this.shootTimer - this.game.clockTick);
        this.damagedTimer = Math.max(0, this.damagedTimer - this.game.clockTick);
        this.deadTimer = Math.max(0, this.deadTimer - this.game.clockTick);

        if (this.state !== 4) {
            this.game.entities.forEach(entity => {
                if (entity.friendlyProjectile === true && this.hitBB.collide(entity.hitBB) && !(this.shotsTaken.includes(entity.id)) && this.state !== 4) {
                    this.shotsTaken.push(entity.id);
                    this.damagedTimer = 0.6 - this.game.clockTick;
                    this.state = 3;
                    let vector = { x: entity.sourcePoint.x - this.hitBB.center.x, y: entity.sourcePoint.y - this.hitBB.center.y };
                    this.facing[0] = vector.y >= 0 ? 0 : 1;
                    this.facing[1] = vector.x >= 0 ? 0 : 1;
                    this.hp -= entity.damage;
                    if (this.deadTimer === 0 && this.hp <= 0) {
                        this.deadTimer = 14 * 0.15 - this.game.clockTick;
                        this.state = 4;
                        this.facing = [0, 0];
                    }
                }
            });
        }

        if (this.state !== 4) {
            let center = this.BB.center;
            this.game.entities.forEach(entity => {
                if (entity instanceof Barbarian) {
                    let heroCenter = entity.BB.center;
                    let dist = distance(center, heroCenter);
                    if (dist <= this.visionDistance) {
                        let vector = { x : heroCenter.x - center.x, y : heroCenter.y - center.y };
                        let directionUnitVector = unitVector(vector);

                        if (dist <= this.attackDistance) {
                            if (this.damagedTimer === 0) {
                                this.state = 2;
                            }
                            if (this.shootTimer === 0 && this.state === 2) {
                                this.shootTimer = 0.12 * 4 - this.game.clockTick;
                                let projectileCenter = { x: this.BB.center.x + 4 * PARAMS.SCALE * directionUnitVector.x,
                                                         y: this.BB.center.y + 4 * PARAMS.SCALE * directionUnitVector.y };
                                if (this.shootFlag) {
                                    this.game.addEntity(new DamageRegion(this.game, 
                                                                         projectileCenter.x - 4 * PARAMS.SCALE, 
                                                                         projectileCenter.y - 4 * PARAMS.SCALE, 
                                                                         8 * PARAMS.SCALE, 
                                                                         8 * PARAMS.SCALE, 
                                                                         false, 75, 0.1));
                                }
                            }
                        } else if (this.damagedTimer === 0) {
                            this.state = 1;
                        }
                        if (dist > this.minProximity && this.damagedTimer === 0) {
                            this.velocity.x = directionUnitVector.x * this.velocityConstant;
                            this.velocity.y = directionUnitVector.y * this.velocityConstant;
                            this.facing[0] = this.velocity.y >= 0 ? 0 : 1;
                            this.facing[1] = this.velocity.x >= 0 ? 0 : 1;
                        }
                    } else if (this.damagedTimer === 0) {
                        this.state = 0;
                    }   
                }
            });
        } else {
            if (this.deadTimer === 0) {
                this.removeFromWorld = true;
            }
        }

        this.shootFlag = this.state === 2;

        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.updateBB();

        if (this.state !== prevState) {
            this.animations[prevState].reset();
        }
    };

    draw(ctx) {
        this.animations[this.state].drawFrame(
            this.game.clockTick, ctx, this.x - this.game.camera.x, this.y - this.game.camera.y, PARAMS.SCALE, this.facing[0], this.facing[1]);

        if (this.hp > 0) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = "Black";
            let percentage = this.hp / this.maxHp;
            if (percentage * 100 <= 25) {
                ctx.fillStyle = PARAMS.LOW_HP_COLOR;
            } else if (percentage * 100 >= 75) {
                ctx.fillStyle = PARAMS.HIGH_HP_COLOR;
            } else {
                ctx.fillStyle = PARAMS.MED_HP_COLOR;
            }
            ctx.fillRect(this.BB.center.x - 4 * PARAMS.SCALE - this.game.camera.x, 
                            this.hitBB.bottom - this.game.camera.y, 8 * PARAMS.SCALE * percentage, 1 * PARAMS.SCALE);
            ctx.strokeRect(this.BB.center.x - 4 * PARAMS.SCALE - this.game.camera.x, 
                            this.hitBB.bottom - this.game.camera.y, 8 * PARAMS.SCALE, 1 * PARAMS.SCALE);
        }

        if (PARAMS.DEBUG) {
            ctx.lineWidth = PARAMS.DEBUG_WIDTH;
            ctx.strokeStyle = PARAMS.DEBUG_COLOR;
            ctx.strokeRect(this.BB.x - this.game.camera.x, this.BB.y - this.game.camera.y, this.BB.width, this.BB.height);
            ctx.strokeRect(this.hitBB.x - this.game.camera.x, this.hitBB.y - this.game.camera.y, this.hitBB.width, this.hitBB.height);
            ctx.strokeRect(this.collisionBB.x - this.game.camera.x, this.collisionBB.y - this.game.camera.y, this.collisionBB.width, this.collisionBB.height);
        }
    };
};