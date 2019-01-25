import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {calculateDiagonalDistance,getDeltaBetweenPoints,getMapSymmetryType,getSymmetricNode,calculateManhattanDistance,calculateDistanceSquared} from "./utils.js";
import constants from "./constants.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";

export default class Prophet extends RobotController{

    constructor(robot) {
        super(robot);
        this.symmetry = getMapSymmetryType(this.robot.map);
        this.defensivePosition = this.getRadioedPosition();
        this.home = this.getClosestStructure(this.robot.me.team);
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

    createOffensiveMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.addGoal(this.oppositeCastle);
        let distance = Math.floor(Math.max(Math.abs(this.oppositeCastle.x - this.robot.me.x), Math.abs(this.oppositeCastle.y - this.robot.me.y))) + 10;
        generator.setLimits(this.robot.me.x - distance, this.robot.me.y - distance, this.oppositeCastle.x + distance, this.oppositeCastle.y + distance);
        this.offensiveMap = generator.generateMap();
        if (print) {
            generator.printMap()
        }
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
        this.robotmap = this.robot.getVisibleRobotMap();
        this.updateIfDeadCastle();
        this.broadcastIfDeadCastle();
        if (this.isOnDefensiveSpot()){
            this.robot.castleTalk(255)
        }

        if (this.hasNearbyEnemies() === true){
            let enemy = this.getPriorityEnemy();
            if (enemy) {
                if ((!this.pastEnemy || this.pastEnemy.enemy.id !== enemy.enemy.id) && enemy.distance === 64) {
                    this.pastEnemy = enemy;
                    this.robot.signal(this.encodeCoordinates(enemy.enemy), 25)
                }

                return this.attack(enemy.enemy)
            }
        }else if (this.isOnDefensiveSpot() === false && !this.offensiveMap){
            let moved = this.moveToDefensiveSpot();

            return moved
        }else if (this.shouldMoveMyAss() === true){
            if (!this.offensiveMap){this.createOffensiveMap();}
            return this.moveToOffensiveSpot()
        }
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

    isMyLineEngaged(){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            for (let i = -2; i <= 2; i++){
                let y = this.robot.me.y + i;
                let x = this.robot.me.x;
                if (this.isPointOnMap({x:x,y:y}) && this.robotmap[y][x] > 0){
                    const robot = this.robot.getRobot(this.robotmap[y][x]);
                    if (robot.signal > 0){
                        return true;
                    }
                }
            }
        }else{
            for (let i = -2; i <= 2; i++){
                let y = this.robot.me.y;
                let x = this.robot.me.x+ i;
                if (this.isPointOnMap({x:x,y:y}) && this.robotmap[y][x] > 0){
                    const robot = this.robot.getRobot(this.robotmap[y][x]);
                    if (robot.signal > 0){
                        return true;
                    }
                }
            }
        }

        return false
    }

    updateIfDeadCastle(){
        let units = this.robot.getVisibleRobots();
        for (let i = 0; i < units.length; i++){
            if (units[i].signal > 10000){
                this.oppositeCastle = this.decodeWeightedCoords(units[i].signal);
                //this.robot.log("UPDATE: (" + this.oppositeCastle.x + "," + this.oppositeCastle.y + ")");
                this.createOffensiveMap();
                this.breakFormation = true;
                return
            }
        }
    }

    broadcastIfDeadCastle(){
        const id = this.robot.getVisibleRobotMap()[this.oppositeCastle.y][this.oppositeCastle.x];
        if (id !== -1 && (id === 0 || (this.enemyCastleId && id !== this.enemyCastleId))){
            //this.robot.log("oX: " + this.oppositeCastle.x + " oY: " + this.oppositeCastle.y + " mX: " + this.robot.me.x + " mY: " + this.robot.me.y + " | " + id);

            if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
                this.robot.castleTalk(this.oppositeCastle.y)
            }else{
                this.robot.castleTalk(this.oppositeCastle.x)
            }
        }else if (id > 0 && this.robot.getRobot(id) !== null && this.robot.getRobot(id).unit === SPECS.CASTLE){
            this.enemyCastleId = id;
        }
    }

    getLineInFront(){
        const front = this.getAhead();
        let robotsInFront = [];
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            for (let i = -2; i <= 2; i++){
                let y = front.y + i;
                if (this.isPointOnMap({x:front.x,y:y}) && this.robotmap[y][front.x] > 0){
                    robotsInFront.push({x:front.x,y:y})
                }
            }
        }else{
            for (let i = -2; i <= 2; i++){
                let x = front.x + i;
                if (this.isPointOnMap({x:x,y:front.y}) && this.robotmap[front.y][x] > 0){
                    robotsInFront.push({x:x,y:front.y})
                }
            }
        }

        return robotsInFront
    }

    moveToOffensiveSpot(){
        super.setDijkstraMap(this.offensiveMap);
        let movement;

        if (this.breakFormation === true) {
            movement = this.moveAlongOffensiveMap(1);
        }else{
            movement = this.moveAlongOffensiveMap(1, true);
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
            if (this.isPointAheadOrBehind(this.nearbyFriendlies[i]) === 1 && (this.nearbyFriendlies[i].unit === SPECS.PROPHET || this.nearbyFriendlies[i].unit === SPECS.PREACHER)){
                return true;
            }
        }
        return false
    }

    isOnDefensiveSpot(){
        return this.defensiveMap[this.robot.me.y][this.robot.me.x] === 0
    }

    attack(enemy){
        let delta = getDeltaBetweenPoints(this.robot.me, enemy);
        return this.robot.attack(delta.dX, delta.dY)
    }

    attackPriorityEnemy() {
        let priorityEnemy = this.getPriorityEnemy();
        if (priorityEnemy) {
            let delta = getDeltaBetweenPoints(this.robot.me, priorityEnemy);
            return this.robot.attack(delta.dX, delta.dY)
        }
    }

    getPriorityEnemy(){
        let closestEnemies = this.getClosestEnemies();

        if (closestEnemies.length === 1){
            return closestEnemies[0]
        }else if (closestEnemies.length > 1){
            let mostDamaged = this.getMostDamagedEnemies(closestEnemies);
            if (mostDamaged.length === 1){
                return mostDamaged[0]
            }else if (mostDamaged.length > 1){
                const prioritized = this.prioritizeEnemy(mostDamaged);
                return prioritized.enemy;
            }
        }
    }

    prioritizeEnemy(enemies) {
        let byPriority = [];

        for (let i = 0; i < enemies.length; i++) {
            let weight = 0;
            switch (enemies[i].enemy.unit) {
                case SPECS.PREACHER:
                    weight = 6;
                    break;
                case SPECS.CRUSADER:
                    weight = 5;
                    break;
                case SPECS.PROPHET:
                    weight = 4;
                    break;
                case SPECS.CASTLE:
                    weight = 3;
                    break;
                case SPECS.CHURCH:
                    weight = 2;
                    break;
                case SPECS.PILGRIM:
                    weight = 1;
                    break;
            }
            byPriority.push({enemy: enemies[i], priority: weight})
        }

        byPriority.sort(function (a,b) {
            return b.priority - a.priority
        });

        return byPriority[0];
    }


    getMostDamagedEnemies(enemies){
        let lowestHealth = enemies[0].enemy.health;
        let mostDamaged = [enemies[0]];

        for (let i = 1; i < enemies.length; i++){
            if (enemies[i].enemy.health < lowestHealth){
                lowestHealth = enemies[i].enemy.health;
                mostDamaged = [enemies[i]]
            }else if (enemies[i].enemy.health === lowestHealth){
                mostDamaged.push(enemies[i])
            }
        }
        return mostDamaged
    }

    getClosestEnemies(){
        let closestDistance = 10000;
        let closestEnemies = [];

        for (let i = 0; i < this.nearbyEnemies.length;i++){
            let enemy = this.nearbyEnemies[i];
            for (let a = 0; a < this.nearbyFriendlies.length;a++){
                let friendly = this.nearbyFriendlies[a];

                let dist = calculateDistanceSquared(enemy,friendly);
                let distFromMe = calculateDistanceSquared(enemy,this.robot.me);
                if (distFromMe >= 16) {
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        closestEnemies = [{enemy:enemy,distance:closestDistance}];
                    } else if (dist === closestDistance) {
                        closestEnemies.push({enemy:enemy,distance:closestDistance})
                    }
                }
            }
        }
        return closestEnemies
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
        return this.moveNigga > 2 || (this.haveAlliesAdvanced() === true && frontLine.length <= 5) || this.isMyLineEngaged() === true || this.breakFormation === true;
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