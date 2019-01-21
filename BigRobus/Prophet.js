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
        this.createDefensiveMap();
        this.moveNigga = 0;
    }

    getBehind(){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            if (this.home.x < this.robot.map.length / 2){
                return {x:this.robot.me.x - 1,y:this.robot.me.y};
            }else{
                return {x:this.robot.me.x + 1,y:this.robot.me.y};
            }
        }else if (this.symmetry === constants.SYMMETRY_VERTICAL){
            if (this.home.y < this.robot.map.length / 2){
                return {x:this.robot.me.x,y:this.robot.me.y - 1};
            }else{
                return {x:this.robot.me.x,y:this.robot.me.y + 1};
            }
        }
    }

    getAhead(){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            if (this.home.x < this.robot.map.length / 2){
                return {x:this.robot.me.x + 1,y:this.robot.me.y};
            }else{
                return {x:this.robot.me.x - 1,y:this.robot.me.y};
            }
        }else if (this.symmetry === constants.SYMMETRY_VERTICAL){
            if (this.home.y < this.robot.map.length / 2){
                return {x:this.robot.me.x,y:this.robot.me.y + 1};
            }else{
                return {x:this.robot.me.x,y:this.robot.me.y - 1};
            }
        }
    }

    isPointAheadOrBehind(point){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            if (this.home.x < this.robot.map.length / 2){
                if (point.x > this.robot.me.x){
                    return 1;
                }else if (point.x < this.robot.me.x){
                    return -1
                }
            }else{
                if (point.x > this.robot.me.x){
                    return -1;
                }else if (point.x < this.robot.me.x){
                    return 1
                }
            }
        }else if (this.symmetry === constants.SYMMETRY_VERTICAL){
            if (this.home.y < this.robot.map.length / 2){
                if (point.y > this.robot.me.y){
                    return 1;
                }else if (point.y < this.robot.me.y){
                    return -1
                }
            }else{
                if (point.y > this.robot.me.y){
                    return -1;
                }else if (point.y < this.robot.me.y){
                    return 1
                }
            }
        }
        return 0;
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

    checkBehind(){
        const behind = this.getBehind();

        for (let i =0; i < this.nearbyFriendlies.length;i++){
            if (this.nearbyFriendlies[i].x === behind.x && this.nearbyFriendlies[i].y === behind.y){
                this.moveNigga++;
                return
            }
        }
        this.moveNigga = 0;
    }

    run(){
        let robots = this.getNearbyRobotsSplitInTeams();
        this.nearbyEnemies = robots.enemies;
        this.nearbyFriendlies = robots.friendlies;
        this.checkBehind();
        const robotmap = this.robot.getVisibleRobotMap();

        if (this.isOnDefensiveSpot()){
            this.robot.castleTalk(1)
        }
        if (this.hasNearbyEnemies() === true){
            return this.attackPriorityEnemy()
        }else if (this.isOnDefensiveSpot() === false && !this.offensiveMap){
            let moved = this.moveToDefensiveSpot();

            return moved

        }else if (this.shouldMoveMyAss() === true){
            if (!this.offensiveMap){this.createOffensiveMap(); this.killem = true}
            return this.moveToOffensiveSpot()
        }
    }

    moveToOffensiveSpot(){
        super.setDijkstraMap(this.offensiveMap);
        let movement;

        if (this.offensiveMap[this.robot.me.y][this.robot.me.x] === 1) {
            movement = super.moveAlongDijkstraMap(1);
        }else {
            movement = super.moveAlongDijkstraMap(1);
        }

        if (movement) {
            return this.robot.move(movement.dX,movement.dY)
        }
    }

    moveToDefensiveSpot() {
        super.setDijkstraMap(this.defensiveMap);
        let movement;

        if (this.defensiveMap[this.robot.me.y][this.robot.me.x] === 1) {
            movement = super.moveAlongDijkstraMap(1, true);
        }else {
            movement = super.moveAlongDijkstraMap(1);
        }

        if (movement) {
            return this.robot.move(movement.dX,movement.dY)
        }
    }

    haveAlliesAdvanced(){
        for (let i =0; i < this.nearbyFriendlies.length;i++){
            if (this.isPointAheadOrBehind(this.nearbyFriendlies[i]) === 1){
                return true;
            }
        }
        return false
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
        return this.moveNigga > 1 || this.haveAlliesAdvanced() === true;
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