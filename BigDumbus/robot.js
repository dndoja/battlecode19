import {BCAbstractRobot,SPECS} from 'battlecode';

let step = -1;
let generatedMap = false;
const dostuff = true;

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;
        if (dostuff) {
            if (this.me.unit === SPECS.CRUSADER) {

                let visible = this.getVisibleRobots();

                // this sucks I'm sorry...
                let self = this; // 'this' fails to properly identify MyRobot when used inside of anonymous function below :(

                // get attackable robots
                let attackable = visible.filter(function (r) {
                    if (!self.isVisible(r)) {
                        return false
                    }
                    let dist = (r.x - self.me.x) ** 2 + (r.y - self.me.y) ** 2;
                    return r.team !== self.me.team
                        && SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[0] <= dist
                        && dist <= SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[1];

                });

                if (attackable.length > 0) {
                    // attack first robot
                    let r = attackable[0];
                    return this.attack(r.x - this.me.x, r.y - this.me.y)
                }

                // this.log("Crusader health: " + this.me.health);
                const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
                const choice = choices[Math.floor(Math.random() * choices.length)];
                return this.move(...choice);
            }

            else if (this.me.unit === SPECS.CASTLE) {
                if (step % 10 === 0) {
                    //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                    return this.buildUnit(SPECS.CRUSADER, 1, 1);
                } else {
                    return // this.log("Castle health: " + this.me.health);
                }
            }
        }
    }
}

