class SwordedMinion {
    constructor(game, x, y) {
        Object.assign(this, { game, x, y });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/trasgo/trasgo.png");
        this.facing = [0, 0]; // down, up, right, left
                              // 0, 1, 0, 1 
        this.state = 0; // idle, walking, attacking, charged, damaged, dead
                        // 0, 1, 2, 3, 4, 5
        this.maxHp = 350;
        this.hp = this.maxHp;
        this.minProximity = 2;
        this.visionDistance = 400;
        this.attackDistance = 75;
        this.shotsTaken = [];
        this.shootTimer = 0;
        this.shootFlag = false;
        this.chargeTimer = 0;
        this.damagedTimer = 0;
        this.deadTimer = 0;
        this.velocityConstant = randomInt(4) + 1;
        this.walkSpeed = 0.15 * (4 / this.velocityConstant);
        this.velocity = { x: 0, y: 0 };
        this.animations = [];
        this.updateBB();
        this.loadAnimations();
    };

    loadAnimations() {
        this.animations.push(new AnimationGroup(this.spritesheet, 0, 0, 32, 32, 16, 0.2, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 64 * 32, 0, 32, 32, 4, this.walkSpeed, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 80 * 32, 0, 32, 32, 4, 0.10, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 96 * 32, 0, 32, 32, 18, 0.10, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 114 * 32, 0, 32, 32, 4, 0.15, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 130 * 32, 0, 32, 32, 11, 0.15, false, true));
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        this.hitBB = new BoundingBox(this.x + 12 * PARAMS.SCALE, this.y + 12 * PARAMS.SCALE, 8 * PARAMS.SCALE, 8 * PARAMS.SCALE);
        this.collisionBB = new BoundingBox(this.hitBB.x, this.hitBB.y + 4 * PARAMS.SCALE, 8 * PARAMS.SCALE, 4 * PARAMS.SCALE);
    };

    update() {

        let prevState = this.state;
        this.facing[0] = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;

        this.shootTimer = Math.max(0, this.shootTimer - this.game.clockTick);
        this.damagedTimer = Math.max(0, this.damagedTimer - this.game.clockTick);
        this.deadTimer = Math.max(0, this.deadTimer - this.game.clockTick);
        this.chargeTimer = Math.max(0, this.chargeTimer - this.game.clockTick);

        if (this.state !== 5) {
            this.game.entities.forEach(entity => {
                if (entity.friendlyProjectile === true && this.hitBB.collide(entity.hitBB) && !(this.shotsTaken.includes(entity.id)) && this.state !== 5) {
                    this.shotsTaken.push(entity.id);
                    if (this.chargeTimer === 0) {
                        this.damagedTimer = 0.6 - this.game.clockTick;
                        this.state = 4;
                        let vector = { x: entity.sourcePoint.x - this.hitBB.center.x, y: entity.sourcePoint.y - this.hitBB.center.y };
                        this.facing[0] = vector.y >= 0 ? 0 : 1;
                        this.facing[1] = vector.x >= 0 ? 0 : 1;
                        this.hp -= entity.damage;
                    }
                    if (this.deadTimer === 0 && this.hp <= 0) {
                        this.deadTimer = 11 * 0.15 - this.game.clockTick;
                        this.state = 5;
                        this.facing = [0, 0];
                    }
                }
            });
        }

        if (this.state !== 5) {
            let center = this.BB.center;
            this.game.entities.forEach(entity => {
                if (entity instanceof Barbarian) {
                    let heroCenter = entity.BB.center;
                    let dist = distance(center, heroCenter);
                    if (dist <= this.visionDistance || this.chargeTimer > 0) {
                        let vector = { x : heroCenter.x - center.x, y : heroCenter.y - center.y };
                        let directionUnitVector = unitVector(vector);

                        if (dist <= this.attackDistance || this.chargeTimer > 0) {
                            if (this.damagedTimer === 0 && this.chargeTimer === 0) {
                                this.state = 2;
                            }
                            if ((this.shootTimer === 0 && this.state === 2) || this.chargeTimer > 0) {
                                let wasShooting = this.state === 2;
                                let chargeChance = randomInt(10);
                                if (this.chargeTimer === 0 && chargeChance === 0) {
                                    this.state = 3;
                                    this.chargeFlag = false;
                                    this.chargeTimer = 0.10 * 18 - this.game.clockTick;
                                }
                                if (this.state === 3) {
                                    this.velocity.x = 0;
                                    this.velocity.y = 0;
                                    this.facing = [0, 0];
                                    if (!this.chargeFlag && this.chargeTimer <= 6 * 0.10) {
                                        this.chargeFlag = true;
                                        this.game.addEntity(new DamageRegion(this.game, 
                                                                             this.x, 
                                                                             this.y, 
                                                                             32 * PARAMS.SCALE, 
                                                                             32 * PARAMS.SCALE, 
                                                                             false, 100, 0.10 * 6 - this.game.clockTick));
                                    }
                                }
                                if (wasShooting) {
                                    this.shootTimer = 0.10 * 4 - this.game.clockTick;
                                    let projectileCenter = { x: this.BB.center.x + 8 * PARAMS.SCALE * directionUnitVector.x,
                                                                y: this.BB.center.y + 8 * PARAMS.SCALE * directionUnitVector.y };
                                    if (this.shootFlag) {
                                        this.game.addEntity(new DamageRegion(this.game, 
                                                                                projectileCenter.x - 8 * PARAMS.SCALE, 
                                                                                projectileCenter.y - 8 * PARAMS.SCALE, 
                                                                                16 * PARAMS.SCALE, 
                                                                                16 * PARAMS.SCALE, 
                                                                                false, 50, 0.1));
                                    }
                                } else {
                                    this.shootTimer = 0;
                                }
                            }
                        } else if (this.damagedTimer === 0 && this.chargeTimer === 0) {
                            this.state = 1;
                        }
                        if (dist > this.minProximity && this.damagedTimer === 0 && this.chargeTimer === 0) {
                            this.velocity.x = directionUnitVector.x * this.velocityConstant;
                            this.velocity.y = directionUnitVector.y * this.velocityConstant;
                            this.facing[0] = this.velocity.y >= 0 ? 0 : 1;
                            this.facing[1] = this.velocity.x >= 0 ? 0 : 1;
                        }
                    } else if (this.damagedTimer === 0 && this.chargeTimer === 0) {
                        this.state = 0;
                        // this.facing = [0, 0];
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


class RangedMinion {
    constructor(game, x, y) {
        Object.assign(this, { game, x, y });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/orc/orc_bow.png");
        this.facing = [0, 0]; // down, up, right, left
                              // 0, 1, 0, 1 
        this.state = 0; // idle, walking, attacking, damaged, dead
                        // 0, 1, 2, 3, 4
        this.maxHp = 200;
        this.hp = this.maxHp;
        this.minProximity = 2;
        this.visionDistance = 400;
        this.attackDistance = 300;
        this.shotsTaken = [];
        this.shootTimer = 0;
        this.shootFlag = false;
        this.damagedTimer = 0;
        this.deadTimer = 0;
        this.velocityConstant = randomInt(3) + 1;
        this.walkSpeed = 0.15 * (4 / this.velocityConstant);
        this.velocity = { x: 0, y: 0 };
        this.animations = [];
        this.updateBB();
        this.loadAnimations();
    };

    loadAnimations() {
        this.animations.push(new AnimationGroup(this.spritesheet, 0, 0, 32, 32, 16, 0.2, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 64 * 32, 0, 32, 32, 4, this.walkSpeed, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 80 * 32, 0, 32, 32, 8, 0.06, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 112 * 32, 0, 32, 32, 4, 0.15, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 128 * 32, 0, 32, 32, 11, 0.15, false, true));
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        this.hitBB = new BoundingBox(this.x + 12 * PARAMS.SCALE, this.y + 12 * PARAMS.SCALE, 8 * PARAMS.SCALE, 8 * PARAMS.SCALE);
        this.collisionBB = new BoundingBox(this.hitBB.x, this.hitBB.y + 4 * PARAMS.SCALE, 8 * PARAMS.SCALE, 4 * PARAMS.SCALE);
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
                        this.deadTimer = 11 * 0.15 - this.game.clockTick;
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
                            let arrowVector = { x: entity.BB.center.x - this.BB.center.x, y: entity.BB.center.y - this.BB.center.y };
                            let arrowTheta = Math.atan2(arrowVector.y, arrowVector.x);
                            if (arrowTheta < 0) {
                                arrowTheta += 2 * Math.PI;
                            }
                            let degrees = nearest5thDegree(arrowTheta);
                            if (this.damagedTimer === 0) {
                                this.state = 2;
                                this.velocity.x = 0;
                                this.velocity.y = 0;
                                if (degrees <= 60 || degrees >= 300) {
                                    this.facing = [0, 0];
                                } else if (degrees > 60 && degrees < 120) {
                                    this.facing = [1, 0];
                                } else if (degrees <= 240 && degrees >= 120) {
                                    this.facing = [0, 1];
                                } else {
                                    this.facing = [1, 1];
                                }
                            }
                            if (this.shootTimer === 0 && this.state === 2) {
                                this.shootTimer = 0.06 * 8 - this.game.clockTick;
                                if (this.shootFlag) {
                                    let arrowUnitVector = unitVector(arrowVector);
                                    this.game.addEntity(new MinionProjectile(this.game, 
                                                                             this.x - 16 * PARAMS.SCALE * arrowUnitVector.x, 
                                                                             this.y - 16 * PARAMS.SCALE * arrowUnitVector.y, 
                                                                             degrees));
                                }
                            }
                        } else if (this.damagedTimer === 0) {
                            this.state = 1;
                        }
                        if (dist > this.minProximity && this.damagedTimer === 0 && this.state !== 2) {
                            this.velocity.x = directionUnitVector.x * this.velocityConstant;
                            this.velocity.y = directionUnitVector.y * this.velocityConstant;
                            this.facing[0] = this.velocity.y >= 0 ? 0 : 1;
                            this.facing[1] = this.velocity.x >= 0 ? 0 : 1;
                        }
                    } else if (this.damagedTimer === 0) {
                        this.state = 0;
                        this.facing = [0, 0];
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

class MinionProjectile {

    static rotationList = [];

    constructor(game, x, y, degrees) {
        Object.assign(this, { game, x, y, degrees });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/projectiles/arrow.png");
        this.friendlyProjectile = false;
        this.damage = 25;
        this.velocityConstant = 6;
        this.velocity = { x: Math.cos(this.degrees * Math.PI / 180) * this.velocityConstant,
                          y: Math.sin(this.degrees * Math.PI / 180) * this.velocityConstant };
        this.lifetime = 1;
        this.projectileType = 0; // 0 = arrow... to be added to later
        if (!(MinionProjectile.rotationList[this.projectileType])) {
            MinionProjectile.rotationList[this.projectileType] = [];
        }
        this.loadAnimations();
        this.updateBB();
    };

    loadAnimations() {
        if (!(MinionProjectile.rotationList[this.projectileType][this.degrees])) {
            MinionProjectile.rotationList[this.projectileType][this.degrees] = 
                rotateImage(this.spritesheet, 0, 0, 32, 32, this.degrees * Math.PI / 180);
        }
        this.animation = 
            new AnimationGroup(MinionProjectile.rotationList[this.projectileType][this.degrees], 0, 0, 32, 32, 1, 1, false, true);
    };

    update() {
        this.lifetime -= this.game.clockTick;
        if (this.lifetime <= 0) {
            this.removeFromWorld = true;
        } else {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.updateBB();
        }
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        let hitCenter = { x: this.BB.center.x + Math.cos(this.degrees * Math.PI / 180) * 16 * PARAMS.SCALE,
                          y: this.BB.center.y + Math.sin(this.degrees * Math.PI / 180) * 16 * PARAMS.SCALE };
        this.hitBB = new BoundingBox(hitCenter.x - 2 * PARAMS.SCALE, hitCenter.y - 2 * PARAMS.SCALE, 4 * PARAMS.SCALE, 4 * PARAMS.SCALE);
    };

    draw(ctx) {
        this.animation.drawFrame(this.game.clockTick, ctx, this.x - this.game.camera.x, this.y - this.game.camera.y, PARAMS.SCALE);

        if (PARAMS.DEBUG) {
            ctx.lineWidth = PARAMS.DEBUG_WIDTH;
            ctx.strokeStyle = PARAMS.DEBUG_COLOR;
            ctx.strokeRect(this.BB.x - this.game.camera.x, this.BB.y - this.game.camera.y, this.BB.width, this.BB.height);
            ctx.strokeRect(this.hitBB.x - this.game.camera.x, this.hitBB.y - this.game.camera.y, this.hitBB.width, this.hitBB.height);
        }
    };

};