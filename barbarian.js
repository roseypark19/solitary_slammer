class Barbarian {
    constructor(game, x, y) {
        Object.assign(this, { game, x, y });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/barbarian/barbarian.png");
        this.facing = [0, 0]; // down, up, right, left
                              // 0, 1, 0, 1 
        this.state = 0; // idle, walking, shooting, damaged, dead, battle cry, thunder strike
                        // 0, 1, 2, 3, 4, 5, 6
        this.id = ++PARAMS.LIFE_ID;
        this.maxHp = 1000;
        this.maxMp = 1000;
        this.mp = this.maxMp;
        this.hp = this.maxHp;
        this.ability1Cost = 100;
        this.ability2Cost = 250;
        this.dexterityConstant = 0.1;
        this.walkSpeed = 0.15;
        this.damagedTimer = 0;
        this.deadTimer = 0;
        this.shootTimer = 0;
        this.shootFlag = false;

        this.ability1Timer = 0;
        this.ability1Cooldown = 0;

        this.ability2Timer = 0;
        this.ability2Flag = false;
        this.ability2Cooldown = 0;

        this.abilitySpritesheet = ASSET_MANAGER.getAsset("./sprites/barbarian/abilities.png");
        this.abilityData = [{ x: 32, y: 0, button: "R"}, { x: 64, y: 0, button: "F"}];
        this.spriteCenter = 12.5;

        this.velocityConstant = 4;
        this.velocity = { x : 0, y : 0 };
        this.animations = [];
        this.updateBB();
        this.loadAnimations();
    };

    loadAnimations() {
        this.animations.push(new AnimationGroup(this.spritesheet, 0, 0, 32, 32, 16, 0.12, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 64 * 32, 0, 32, 32, 4, this.walkSpeed, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 80 * 32, 0, 32, 32, 6, this.dexterityConstant, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 104 * 32, 0, 32, 32, 4, 0.15, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 120 * 32, 0, 32, 32, 20, 0.09, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 140 * 32, 0, 32, 32, 11, 0.1, false, true));
        this.animations.push(new AnimationGroup(this.spritesheet, 184 * 32, 0, 32, 32, 17, 0.1, false, true));
    };
    
    update() {

        let prevState = this.state;

        if (this.state !== 4) {
            this.hp = Math.min(this.maxHp, this.hp + this.game.clockTick / 1 * 15);
            this.mp = Math.min(this.maxMp, this.mp + this.game.clockTick / 1 * 15);
        }

        this.originalCollisionBB = this.collisionBB;

        this.deadTimer = Math.max(0, this.deadTimer - this.game.clockTick);
        this.damagedTimer = Math.max(0, this.damagedTimer - this.game.clockTick);
        this.shootTimer = Math.max(0, this.shootTimer - this.game.clockTick);
    
        this.ability1Cooldown = Math.max(0, this.ability1Cooldown - this.game.clockTick);
        this.ability1Timer = Math.max(0, this.ability1Timer - this.game.clockTick);

        this.animations[1].setFrameDuration(this.ability1Cooldown > 0 && this.ability1Timer === 0 ? this.walkSpeed / 2 : this.walkSpeed);
        this.animations[2].setFrameDuration(this.ability1Cooldown === 0 ? this.dexterityConstant : this.dexterityConstant / 3);

        this.ability2Cooldown = Math.max(0, this.ability2Cooldown - this.game.clockTick);
        this.ability2Timer = Math.max(0, this.ability2Timer - this.game.clockTick);

        this.facing[0] = 0;

        this.velocityConstant =  0.15 / this.animations[1].frameDuration * 4;

        let newVelX = 0;
        let newVelY = 0;

        if (this.state !== 4) {
            this.game.projectileEntities.forEach(entity => {
                if (entity.friendlyProjectile === false && this.hitBB.collide(entity.hitBB) && this.state !== 4) {
                    if (this.ability1Timer === 0 && this.ability2Timer === 0 && this.state !== 2) {
                        this.damagedTimer = 0.6 - this.game.clockTick;
                        this.state = 3;
                    }
                    entity.removeFromWorld = true;
                    if (this.ability2Timer === 0 && this.ability1Timer === 0) {
                        this.hp -= entity.damage;
                        ASSET_MANAGER.playAsset("./audio/hero_hit.mp3");
                    }
                    if (this.deadTimer === 0 && this.hp <= 0) {
                        this.deadTimer = 17 * 0.1 - this.game.clockTick;
                        this.state = 4;
                        this.facing = [0, 0];
                        PARAMS.GAMEOVER = true;
                        ASSET_MANAGER.pauseBackgroundMusic();
                        ASSET_MANAGER.playAsset("./audio/hero_death.mp3");
                    }
                }
            });
        }

        if (this.state !== 4 && !this.game.camera.title && !PARAMS.GAMEOVER) {
            if (this.game.right) {
                newVelX += this.velocityConstant;
                this.facing[1] = 0;
            }
            if (this.game.left) {
                newVelX -= this.velocityConstant;
                this.facing[1] = 1;
            }
            if (this.game.up) {
                newVelY -= this.velocityConstant;
                this.facing[0] = 1;
            }
            if (this.game.down) {
                newVelY += this.velocityConstant;
                this.facing[0] = 0;
            }
    
            if (newVelX !== 0 && newVelY !== 0) {
                var diagonalVel = Math.sqrt(Math.pow(this.velocityConstant, 2) / 2);
            }
            if (diagonalVel) {
                newVelX = newVelX > 0 ? diagonalVel : -diagonalVel;
                newVelY = newVelY > 0 ? diagonalVel : -diagonalVel;
            } 
        }

        this.velocity.x = newVelX;
        this.velocity.y = newVelY;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.updateBB();

        if (this.state !== 4 && !this.game.camera.title && !PARAMS.GAMEOVER) {

            if (this.game.specialR && this.ability1Cooldown === 0 && this.ability1Timer === 0 && this.ability2Timer === 0 && this.mp >= this.ability1Cost) {
                this.state = 5;
                this.animations[1].setFrameDuration(this.walkSpeed / 2);
                this.animations[2].setFrameDuration(this.dexterityConstant / 3);
                this.ability1Timer = 1.1 - this.game.clockTick;
                this.ability1Cooldown = 5 - this.game.clockTick;
                this.mp -= this.ability1Cost;
            }

            if (this.game.specialF && this.ability2Cooldown === 0 && this.ability2Timer === 0 && this.ability1Timer === 0 && this.mp >= this.ability2Cost) {
                this.state = 6;
                this.ability2Flag = true;
                this.ability2Timer = 1.7 - this.game.clockTick;
                this.ability2Cooldown = 1.7 - this.game.clockTick;
                this.mp -= this.ability2Cost;
            }

            if (this.ability2Timer <= 0.1 && this.ability2Timer > 0 && this.ability2Flag) {
                this.ability2Flag = false;
                this.spawnBeams();
                ASSET_MANAGER.playAsset("./audio/lightning.mp3")
            }

            if (this.ability1Timer === 0 && this.ability2Timer === 0 && this.damagedTimer === 0) {
                this.state = magnitude(this.velocity) === 0 ? 0 : 1;
            }

            if (this.game.clicked) {
                let mousePoint = this.game.mouse ? this.game.mouse : this.game.click;
                this.facing[0] = mousePoint.y < this.BB.center.y - this.game.camera.y ? 1 : 0;
                this.facing[1] = mousePoint.x < this.BB.center.x - this.game.camera.x ? 1 : 0; 
                if (this.ability1Timer === 0 && this.ability2Timer === 0) {
                    this.state = 2;
                    if (this.shootTimer === 0) {
                        this.shootTimer = this.animations[2].frameDuration * 6 - this.game.clockTick;
                        let vector = { x : mousePoint.x + this.game.camera.x - this.BB.center.x, 
                                       y : mousePoint.y + this.game.camera.y - this.BB.center.y };
                        let directionUnitVector = unitVector(vector);
                        let projectileCenter = { x: this.BB.center.x + 8 * PARAMS.SCALE * directionUnitVector.x,
                                                 y: this.BB.center.y + 8 * PARAMS.SCALE * directionUnitVector.y };
                        if (this.shootFlag) {
                            ASSET_MANAGER.playAsset("./audio/sword.mp3");
                            this.game.addEntity(new DamageRegion(this.game, 
                                                                 projectileCenter.x - 8 * PARAMS.SCALE,
                                                                 projectileCenter.y - 8 * PARAMS.SCALE,
                                                                 this.BB.width / 2,
                                                                 this.BB.height / 2,
                                                                 true,
                                                                 15,
                                                                 0.1, this.BB.center));
                        }
                        
                    }
                }
            }
        } else if (PARAMS.GAMEOVER) {
            if (this.hp > 0) {
                this.state = 0;
                this.velocity.x = 0;
                this.velocity.y = 0;
            } else if (this.deadTimer === 0) {
                this.removeFromWorld = true;
            }
        }

        this.shootFlag = this.state === 2;

        // collision detection and resolve
        let collisionList = [];
        this.game.collideableEntities.forEach(entity => {
            if (entity.collideable && this.collisionBB.collide(entity.BB)) { 
                collisionList.push(entity);
            }
        });

        if (collisionList.length > 0) {
            collisionList.sort((boundary1, boundary2) => distance(this.collisionBB.center, boundary1.BB.center) -
                                                         distance(this.collisionBB.center, boundary2.BB.center));
            for (let i = 0; i < collisionList.length; i++) {
                if (this.collisionBB.collide(collisionList[i].BB)) {
                    Collision.resolveCollision(this, collisionList[i]);
                    this.updateBB();
                }
            }
        }

        if (this.state !== prevState) {
            this.animations[prevState].reset();
        }
    };

    spawnBeams() {
        let center = this.BB.center;
        for (let theta = 2 * Math.PI; theta > 0; theta -= Math.PI / 4) {             
            this.game.addEntity(new Beam(this.game, 
                                         center.x - 32 * PARAMS.SCALE / 2,
                                         center.y - 32 * PARAMS.SCALE / 2, 
                                         theta, this.BB.center));
        }
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        this.hitBB = new BoundingBox(this.x + 12 * PARAMS.SCALE, this.y + 8 * PARAMS.SCALE, 8 * PARAMS.SCALE, 12 * PARAMS.SCALE);
        this.collisionBB = new BoundingBox(this.hitBB.x, this.hitBB.y + 4 * PARAMS.SCALE, 8 * PARAMS.SCALE, 10 * PARAMS.SCALE);
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

    drawMmap(ctx) {
        ctx.fillStyle = "Blue";
        ctx.strokeStyle = "Blue";
        ctx.strokeRect(this.x / (PARAMS.SCALE / PARAMS.MMAP_SCALE) - this.game.camera.mmX + 8 * PARAMS.MMAP_SCALE, 
                       this.y / (PARAMS.SCALE / PARAMS.MMAP_SCALE) - this.game.camera.mmY + 8 * PARAMS.MMAP_SCALE, 
                       16 * PARAMS.MMAP_SCALE, 16 * PARAMS.MMAP_SCALE);
        ctx.fillRect(this.x / (PARAMS.SCALE / PARAMS.MMAP_SCALE) - this.game.camera.mmX + 8 * PARAMS.MMAP_SCALE, 
                     this.y / (PARAMS.SCALE / PARAMS.MMAP_SCALE) - this.game.camera.mmY + 8 * PARAMS.MMAP_SCALE, 
                     16 * PARAMS.MMAP_SCALE, 16 * PARAMS.MMAP_SCALE);
    };
};

class Beam {

    constructor(game, x, y, theta, sourcePoint) {
        Object.assign(this, { game, x, y, theta, sourcePoint });
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/barbarian/beams.png");
        this.friendlyProjectile = true;
        this.damage = 25;
        this.id = ++PARAMS.SHOT_ID;
        this.velocityConstant = 10;
        this.velocity = { x: Math.cos(theta) * this.velocityConstant,
                          y: Math.sin(theta) * this.velocityConstant };
        this.lifetime = 1;
        this.animation = new AnimationGroup(this.spritesheet, 32 * 4 * (this.theta / (Math.PI / 4) - 1), 0, 32, 32, 4, 0.08, false, true);
        this.updateBB();
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

        this.game.collideableEntities.forEach(entity => {
            if (entity.collideable && this.hitBB.collide(entity.BB)) { 
                this.removeFromWorld = true;
            }
        });
    };

    updateBB() {
        this.BB = new BoundingBox(this.x, this.y, 32 * PARAMS.SCALE, 32 * PARAMS.SCALE);
        this.hitBB = new BoundingBox(this.x + 12 * PARAMS.SCALE, this.y + 12 * PARAMS.SCALE, 8 * PARAMS.SCALE, 8 * PARAMS.SCALE);
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

