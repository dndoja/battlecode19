import {SPECS} from 'battlecode'
import RobotController from "./RobotController.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import {getDistanceBetweenPoints,getSymmetricNode} from "./utils.js";

const ATTACK_RANGE = 16;
const VISION_RADIUS = 36;

export default class Crusader extends RobotController{
    constructor(robot){
        super(robot);
        super.getClosestCastle();
        this.enemyCastles = [];

        let closestEnemyCastles = super.getClosestCastle();
        this.enemyCastles.push(getSymmetricNode(closestEnemyCastles.x,closestEnemyCastles.y,this.robot.map,this.symmetry));

        let coords = super.getCoordinatesFromCastle();
        for (let i = 0; i < coords.length; i++){
            this.enemyCastles.push(getSymmetricNode(coords[i].x,coords[i].y,this.robot.map,this.symmetry));
        }

        for (let i = 0; i < this.enemyCastles.length; i++){
            this.robot.log("x: " + this.enemyCastles[i].x + " y: " + this.enemyCastles[i].y)
        }
        this.updateEnemyCastlesMap();
       // this.updateResourcesMap();
    }

    run(){
        return this.runRush()
    }

    runRush(){
        let nearbyEnemies = super.getNearbyEnemies();
        this.checkIfReachedEnemyCastles();

        if (nearbyEnemies.length > 0 && this.robot.me.turn > 1){
            let closestEnemy = super.getClosestEnemy(nearbyEnemies);

            let dX = closestEnemy.man.x - this.robot.me.x;
            let dY = closestEnemy.man.y - this.robot.me.y;
            if (closestEnemy.distance <= ATTACK_RANGE){
                //this.robot.log("dX: " + closestEnemy.man.x + " dY: " + dY +" dist: " + closestEnemy.distance);
                return this.robot.attack(dX, dY)
            }else{
                super.setDijkstraMap(super.getEnemiesMap(nearbyEnemies,6));
                return this.moveAccordingToMap();
            }
        }else{
            super.setDijkstraMap(this.enemyCastlesMap);
            return this.moveAccordingToMap();

            /*if (this.robot.me.turn === 1 || this.robot.karbonite === 0) {
                let friendlyRobots = [];
                let myVal = this.enemyCastlesMap[this.robot.me.y][this.robot.me.x];

                for (let i = 0; i < friendlyRobots.length; i++){
                    if (this.enemyCastlesMap[friendlyRobots[i].y][friendlyRobots[i].x] < myVal - 1){
                        let generator = new DijkstraMapGenerator(this.robot);
                        let observableArea = this.getOffsetsFromRadius(Math.sqrt(VISION_RADIUS));
                        generator.setLimits(observableArea.left,observableArea.bottom,observableArea.right,observableArea.top);
                        generator.addGoal({x:friendlyRobots[i].x,y: friendlyRobots[i].y});
                        super.setDijkstraMap(generator.generateMap());
                        generator.printMap();
                        return this.moveAccordingToMap()
                    }
                }

            }*/
        }
    }

    checkIfReachedEnemyCastles(){
        let unexploredCastles = [];
        for (let i = 0; i < this.enemyCastles.length; i++){
            let distanceSquared = getDistanceBetweenPoints(this.robot.me.x,this.enemyCastles[i].x,this.robot.me.y,this.enemyCastles[i].y);
            //this.robot.log("turn: " + this.robot.me.turn + " x1: " + this.robot.me.x + " y1: " + this.robot.me.y + " x2: " + this.enemyCastles[i].x + " y2: " + this.enemyCastles[i].y + " dist: " + distanceSquared);
            if (distanceSquared > 2){
                unexploredCastles.push(this.enemyCastles[i])
            }else{
                //this.robot.log("EXPLORED CASTLE! " + "turn: " + this.robot.me.turn + " x1: " + this.robot.me.x + " y1: " + this.robot.me.y + " x2: " + this.enemyCastles[i].x + " y2: " + this.enemyCastles[i].y + " dist: " + distanceSquared);
            }
        }
        if (unexploredCastles.length !== this.enemyCastles.length){
            this.enemyCastles = unexploredCastles;
            this.updateEnemyCastlesMap()
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot);
    }

    moveAccordingToMap(){
        super.setDijkstraMap(this.enemyCastlesMap);
        let delta = super.moveAlongDijkstraMap(1);
        if (delta) {
            //this.robot.log("dX: " + delta.dX + " dY: " + delta.dY);
            return this.robot.move(delta.dX, delta.dY);
        }else{
            return this.robot
        }
    }

    updateEnemyCastlesMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        let goals = [];
        for  (let i = 0; i < this.enemyCastles.length; i++){
            goals.push({x:this.enemyCastles[i].x,y:this.enemyCastles[i].y});
        }
        generator.addGoals(goals);
        this.enemyCastlesMap = generator.generateMap();
        if (print) {
            generator.printMap();
        }
    }


    getPriorityEnemy(enemies){
        let closestEnemy = enemies[0];
        let mostDamagedEnemy = enemies[0];

        let lowestHealth = enemies[0].health;
        let closestDistance = this.enemiesMap[enemies[0].y][enemies[0].x];

        for (let i = 1; i < enemies.length; i++){
            let enemy = enemies[i];
            if (enemy.health < lowestHealth.health){
                lowestHealth = enemy.health;
                mostDamagedEnemy = enemy;
            }

            if (this.enemiesMap[enemy.y][enemy.x] < closestDistance){
                closestDistance = this.enemiesMap[enemy.y][enemy.x];
                closestEnemy = enemy;
            }
        }
        return closestEnemy
    }
}