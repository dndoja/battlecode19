import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import PointClusterGenerator from "./PointClusterGenerator.js";
import {getDeltaBetweenPoints, getDistanceBetweenPoints, getSymmetricNode} from "./utils.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import {calculateDiagonalDistance, calculateManhattanDistance, getMapSymmetryType} from "./utils.js";
import constants from "./constants.js";

export default class Preacher extends RobotController{

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
        this.offensiveMap = generator.generateMap();
        //generator.printMap()
    }

    createDefensiveMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.addGoal(this.defensivePosition);
        let distance = Math.floor(Math.max(Math.abs(this.defensivePosition.x - this.robot.me.x), Math.abs(this.defensivePosition.y - this.robot.me.y))) + 10;
        generator.setLimits(this.robot.me.x - distance, this.robot.me.y - distance, this.defensivePosition.x + distance, this.defensivePosition.y + distance);
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

        for (let i=0; i < this.nearbyFriendlies.length;i++){
            if (this.nearbyFriendlies[i].x === behind.x && this.nearbyFriendlies[i].y === behind.y){
                this.moveNigga++;
                return
            }
        }
        this.moveNigga = 0;
    }

    updateIfDeadCastle(){
        for (let i = 0; i < this.nearbyFriendlies.length; i++){
            if (this.nearbyFriendlies.signal > 0 && this.nearbyFriendlies.signal <= 6464){
                this.oppositeCastle = this.decodeCoords(this.nearbyFriendlies.signal);
                this.createOffensiveMap();
                this.breakFormation = true;
            }
        }
    }

    run(){
        let robots = this.getNearbyRobotsSplitInTeams();
        this.nearbyEnemies = robots.enemies;
        this.nearbyFriendlies = robots.friendlies;
        this.checkBehind();
        this.robotmap = this.robot.getVisibleRobotMap();
        this.updateIfDeadCastle();
        if (this.isOnDefensiveSpot()){
            this.robot.castleTalk(255)
        }
        this.broadcastIfDeadCastle();

        if (this.hasNearbyEnemies() === true){
            this.generateEnemyClusters();
            return this.attackBestCluster();
        }else if (this.isOnDefensiveSpot() === false && !this.offensiveMap){
            let moved = this.moveToDefensiveSpot();
            return moved

        }else if (this.shouldMoveMyAss() === true){
            if (!this.offensiveMap){this.createOffensiveMap();}
            return this.moveToOffensiveSpot()
        }
    }

    attackBestCluster(){
        for (let i = 0; i < this.enemyClusters.length; i++){
            let cluster = this.enemyClusters[i];
            let bOnB = this.calculateBlueOnBlue(i);

            if (this.areCasualtiesWorthTaking(cluster,bOnB)){
                let delta = getDeltaBetweenPoints(this.robot.me,cluster.centroid);
                return this.robot.attack(delta.dX,delta.dY)
            }
        }
    }

    areCasualtiesWorthTaking(enemyCluster,friendlies){
        return enemyCluster.points.length / friendlies >= 3
    }

    calculateBlueOnBlue(clusterIndex){
        let robots = this.robot.getVisibleRobotMap();
        let casualties = 0;
        for (let offY = -1; offY <= 1; offY++){
            for (let offX = -1; offX <= 1; offX++){
                let x = this.enemyClusters[clusterIndex].centroid.x + offX;
                let y = this.enemyClusters[clusterIndex].centroid.y + offY;

                if (super.isPointOnMap({x:x,y:y}) && robots[y][x] > 0 && super.isRobotFriendly(robots[y][x])){
                    casualties++;
                }
            }
        }

        return casualties;
    }

    areEnemiesStacked(){
        return this.enemyClusters[0].points.length > 1
    }

    generateEnemyClusters(){
        let clusterGen = new PointClusterGenerator(this.nearbyEnemies,this.robot);
        clusterGen.setClusterRadius(2);
        this.enemyClusters = clusterGen.generateClusters();
        //clusterGen.printClusters()
    }

    moveAlongOffensiveMap(radius, disallowParallel){
        const oppositeCastle = this.oppositeCastle;

        function sortNodesNearThing(a,b){
            return calculateManhattanDistance(a,oppositeCastle) - calculateManhattanDistance(b,oppositeCastle)
        }

        if (this.djMap){
            if (this.djMap[this.position.y][this.position.x] !== 0) {
                //this.prioritizeStayingGrouped(this.getFriendlyCombatUnits(),radius);
                let surroundingNodes = this.getSurroundingNodes(radius);
                let smallestNodes = this.getSmallestNodes(surroundingNodes,disallowParallel);

                if (smallestNodes.length > 0 && smallestNodes[0][0] !== constants.UNPASSABLE_TERRAIN_VALUE) {
                    for (let i = 0; i < smallestNodes.length; i++) {
                        let currentNodes = smallestNodes[i];
                        currentNodes.sort(sortNodesNearThing);
                        /*currentNodes.sort(function () {
                            return Math.random() - 0.5;
                        });*/
                        //let randomPick = smallestNodes[Math.floor(Math.random() * smallestNodes.length)];
                        for (let i = 0; i < currentNodes.length; i++) {
                            let randomPick = currentNodes[i];
                            //this.robot.log(smallestNodes.length);
                            if ((this.position.x !== randomPick.x || this.position.y !== randomPick.y) && this.canMove(randomPick)) {
                                return this.getDeltaMovement(randomPick);
                            }
                        }
                    }
                }
            }
        }
    }

    broadcastIfDeadCastle(){
        if (this.robotmap[this.oppositeCastle.y][this.oppositeCastle.x] === 0){
            if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
                this.robot.castleTalk(this.oppositeCastle.y)
            }else{
                this.robot.castleTalk(this.oppositeCastle.x)
            }
        }
    }

    getLineInFront(){
        const front = this.getAhead();
        let robotsInFront = [];
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            for (let i = -2; i <= 2; i++){
                let y = front.y + i;
                if (this.isPointOnMap({x:front.x,y:y}) === true) {
                    if (this.robotmap[y][front.x] > 0) {
                        robotsInFront.push({x: front.x, y: y})
                    }
                }
            }
        }else{
            for (let i = -2; i <= 2; i++){
                let x = front.x + i;
                if (this.isPointOnMap({x:x,y:front.y}) === true) {
                    if (this.robotmap[front.y][x] > 0) {
                        robotsInFront.push({x: x, y: front.y})
                    }
                }
            }
        }

        return robotsInFront
    }

    moveToOffensiveSpot(){
        super.setDijkstraMap(this.offensiveMap);
        let movement = this.moveAlongOffensiveMap(1,true);

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
            if (this.isPointAheadOrBehind(this.nearbyFriendlies[i]) === 1 && (this.nearbyFriendlies[i].unit === SPECS.PROPHET || this.nearbyFriendlies[i].unit === SPECS.PREACHER)){
                return true;
            }
        }
        return false
    }

    isOnDefensiveSpot(){
        return this.defensiveMap[this.robot.me.y][this.robot.me.x] === 0
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
        let frontLine = this.getLineInFront();
        return this.moveNigga > 2 || (this.haveAlliesAdvanced() === true && frontLine.length <= 5) || this.breakFormation === true;
    }

    getRadioedPosition(){
        let castle = super.getClosestStructure(this.robot.me.team);
        let robotmap = this.robot.getVisibleRobotMap();
        let id = robotmap[castle.y][castle.x];
        let signal = this.robot.getRobot(id).signal;
        return this.decodeCoords(signal)
    }

    updateRobotObject(robot) {
        this.robot = robot;
        super.updateRobotObject(robot);
    }
}