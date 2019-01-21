import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {calculateDiagonalDistance,getDeltaBetweenPoints,getMapSymmetryType,getSymmetricNode} from "./utils.js";
import constants from "./constants.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";

export default class Prophet extends RobotController{

    constructor(robot) {
        super(robot);
        this.symmetry = getMapSymmetryType(this.robot.map);
        this.defensivePosition = this.getRadioedPosition();
        this.home = this.getClosestStructure(this.robot.me.team);
        this.killem = false;
        this.oppositeCastle = getSymmetricNode(this.home.x,this.home.y,this.robot.map,this.symmetry);
        this.createDefensiveMap()
    }

    createOffensiveMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.addGoal(this.oppositeCastle);
        let distance = Math.floor(Math.max(Math.abs(this.oppositeCastle.x - this.robot.me.x), Math.abs(this.oppositeCastle.y - this.robot.me.y))) + 10;
        generator.setLimits(this.robot.me.x - distance, this.robot.me.y - distance, this.oppositeCastle.x + distance, this.oppositeCastle.y + distance);
        this.offensiveMap = generator.generateMap()
    }

    createDefensiveMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.addGoal(this.defensivePosition);
        //this.robot.log("Decoded: " + this.defensivePosition.x + " " + this.defensivePosition.y);
        generator.setLimits(this.robot.me.x - 11, this.robot.me.y - 11, this.robot.me.x + 11, this.robot.me.y + 11);
        this.defensiveMap = generator.generateMap();
        //generator.printMap()
    }

    getNearbyRobotsSplitInTeams(){
        let robots = this.robot.getVisibleRobots();
        let friendlies = [];
        let enemies = [];
        let myteam = this.robot.me.team;

        for (let i = 0; i < robots.length; i++){
            if (robots[i].team === myteam){
                friendlies.push(robots[i])
            }else{
                enemies.push(robots[i])
            }
        }

        return {friendlies:friendlies,enemies:enemies}
    }

    run(){
        let robots = this.getNearbyRobotsSplitInTeams();
        this.nearbyEnemies = robots.enemies;
        this.nearbyFriendlies = robots.friendlies;
        const robotmap = this.robot.getVisibleRobotMap();

        if (this.isOnDefensiveSpot()){
            this.robot.castleTalk(1)
        }
        if (this.hasNearbyEnemies() === true){
            return this.attackPriorityEnemy()
        }else if (this.isOnDefensiveSpot() === false && !this.offensiveMap){
            let moved = this.moveToDefensiveSpot();
            if (this.defensiveMap[this.robot.me.y][this.robot.me.x] === 1 && robotmap[this.defensivePosition.y][this.defensivePosition.x] > 0){
                this.robot.signal(this.encodeCoordinates(this.defensivePosition),2)
            }else {
                return moved
            }
        }else if (this.shouldMoveMyAss() === true || this.killem === true){
            if (!this.offensiveMap){this.createOffensiveMap(); this.killem = true}
            return this.moveToOffensiveSpot()
        }
    }

    moveToOffensiveSpot(){
        super.setDijkstraMap(this.offensiveMap);
        let movement = super.moveAlongDijkstraMap(1);
        if (movement) {
            return this.robot.move(movement.dX,movement.dY)
        }
    }

    moveToDefensiveSpot() {
        super.setDijkstraMap(this.defensiveMap);
        let movement = super.moveAlongDijkstraMap(1);
        if (movement) {
            return this.robot.move(movement.dX,movement.dY)
        }
    }

    isOnDefensiveSpot(){
        return this.defensiveMap[this.robot.me.y][this.robot.me.x] === 0
    }

    attackPriorityEnemy() {
        let priorityEnemy = this.getPriorityEnemy();
        if (priorityEnemy) {
            let delta = getDeltaBetweenPoints(this.robot.me, priorityEnemy);
            return this.robot.attack(delta.dX, delta.dY)
        }
    }

    getPriorityEnemy(){
        let closestDistance = 10000;
        let closestEnemy;

        for (let i = 0; i < this.nearbyEnemies.length;i++){
            let enemy = this.nearbyEnemies[i];
            for (let a = 0; a < this.nearbyFriendlies.length;a++){
                let friendly = this.nearbyFriendlies[a];

                let dist = calculateDiagonalDistance(enemy,friendly);
                let distFromMe = calculateDiagonalDistance(enemy,this.robot.me);
                if (dist < closestDistance && distFromMe > 4){
                    closestDistance = dist;
                    closestEnemy = enemy;
                }
            }
        }

        return closestEnemy
    }

    hasNearbyEnemies(){
        return this.nearbyEnemies.length > 0
    }

    decodeCoords(encoded){
        let x = encoded % 100;
        let y = Math.floor(encoded / 100);
        return {x:x,y:y}
    }

    shouldMoveMyAss(){
        for (let i = 0; i < this.nearbyFriendlies.length; i++){
            let decoded = this.decodeCoords(this.nearbyFriendlies[i].signal);
            if (decoded.x === this.robot.me.x && decoded.y === this.robot.me.y){
                return true
            }
        }
        return false;
    }

    getRadioedPosition(){
        let castle = super.getClosestCastle();
        let robotmap = this.robot.getVisibleRobotMap();
        let id = robotmap[castle.y][castle.x];
        let signal = this.robot.getRobot(id).signal;
        return this.decodeCoords(signal)
    }

    updateRobotObject(robot) {
        super.updateRobotObject(robot);
    }
}