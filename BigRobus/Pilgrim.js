import {SPECS,BCAbstractRobot} from 'battlecode'
import RobotController from "./RobotController.js";
import {getSymmetricNode} from "./utils.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import {calculateDiagonalDistance,calculateManhattanDistance} from "./utils.js";
import CONSTANTS from "./constants.js";

const MAX_DIST_TO_FUEL = 10;
const RADIUS_MINES = 10;

export default class Pilgrim extends RobotController{

    constructor(robot){
        super(robot);
        this.updateRobotObject(robot);
        /*this.friendlyCastles = [];
        this.moves = [];

        this.friendlyCastles.push(super.getClosestCastle());
        let coords = super.getRadioCoordsFromHomeCastle();
        for (let i = 0; i < coords.length; i++){
            this.friendlyCastles.push(coords[i].x,coords[i].y);
        }*/


        this.init()
        //this.updateCastlesMap();
        //this.updateResourcesMap()
    }

    init(){
        this.home = super.getClosestStructure(this.robot.me.team);
        this.mineIndex = this.home.signal;
       // this.robot.log("M: " + this.mineIndex);

        this.targetMine = this.getRadioedMinePosition();
        this.generateTargetMap()
    }

    decodeCoords(encoded){
        let x = encoded % 100;
        let y = Math.floor(encoded / 100);
        return {x:x,y:y}
    }

    getRadioedMinePosition(){
        let castle = super.getClosestCastle();
        let robotmap = this.robot.getVisibleRobotMap();
        let id = robotmap[castle.y][castle.x];
        let signal = this.robot.getRobot(id).signal;
        //this.robot.log("sig: " + signal);
        return this.decodeCoords(signal)
    }

    getClosestFuelMine(){
        let offsets = super.getOffsetsFromRadius(3,this.robot.me.x,this.robot.me.y);
        let closestDist = 100000;
        let closestLoc;

        for (let y = offsets.bottom; y <= offsets.top; y++){
            for (let x = offsets.left; x <= offsets.right; x++){
                if (this.robot.fuel_map[y][x] === true) {
                    let dist = calculateDiagonalDistance(this.robot.me,{x:x,y:y});
                    if (dist < closestDist){
                        closestDist = dist;
                        closestLoc = {position:{x:x,y:y},distanceTo:dist}
                    }
                }
            }
        }

        return closestLoc;
    }

    generateTargetMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        let distance = Math.floor(Math.max(Math.abs(this.targetMine.x - this.home.x), Math.abs(this.targetMine.y - this.home.y))) + RADIUS_MINES;
        generator.setLimits(this.home.x - distance, this.home.y - distance, this.targetMine.x + distance, this.targetMine.y + distance);
        generator.addGoal(this.targetMine);
        this.karboniteGoal = this.targetMine;
        this.kMap = generator.generateMap();
    }

    generateHomeMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        let distance = Math.floor(Math.max(Math.abs(this.robot.me.x - this.home.x), Math.abs(this.robot.me.y - this.home.y))) + RADIUS_MINES;
        generator.setLimits(this.robot.me.x - distance, this.robot.me.y - distance, this.home.x + distance, this.home.y + distance);
        generator.addGoal(this.home);
        this.homeGoal = this.home;
        this.hMap = generator.generateMap();
    }

    generateFuelMap(){
        let closestFuelMine = this.getClosestFuelMine();
        if (closestFuelMine && closestFuelMine.distanceTo <= MAX_DIST_TO_FUEL){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.setLimits(this.robot.me.x - RADIUS_MINES, this.robot.me.y - RADIUS_MINES, closestFuelMine.position.x + RADIUS_MINES, closestFuelMine.position.y + RADIUS_MINES);
            this.fuelGoal = closestFuelMine.position;
            generator.addGoal(closestFuelMine.position);
            this.fMap = generator.generateMap();
            //this.robot.log("F:");
            //generator.printMap();

            return
        }

        this.fMap = null;
    }

    run(){
        if (this.shouldBuildChurch() === true) {
            if (this.canBuildChurch() === true) {
                let bc = this.buildChurch();
                if (bc) {
                    return bc
                }
            }else {
                this.robot.castleTalk(254)
            }
        }

        if (this.isCappedOnKarb() === false){
            if (this.isOnTargetKarboniteMine() === true){
                return this.robot.mine()
            }else{
                return this.moveTowardsKarboniteMine()
            }
        }else if (this.isCappedOnFuel() === false){
            if (!this.fMap){ this.generateFuelMap() }

            if (this.hasNearbyFuelMine() === true){
                if (this.isOnTargetFuelMine() === true){
                    return this.robot.mine()
                }else{
                    return this.moveTowardsFuelMine()
                }
            }else {
                return this.goHome();
            }
        }else{
            return this.goHome();
        }
    }

    goHome(){
        this.updateHome();

        if (this.isHome() === true){
            return this.depositAtNearestStructure()
        }else{
            return this.moveTowardsHome()
        }
    }

    hasNearbyFuelMine(){
        return this.fMap != null
    }

    moveTowardsHome(){
        this.currentGoal = this.homeGoal;
        return this.moveTowardsMine(this.hMap)
    }

    moveTowardsKarboniteMine(){
        this.currentGoal = this.karboniteGoal;
        return this.moveTowardsMine(this.kMap)
    }

    moveTowardsFuelMine(){
        this.currentGoal = this.fuelGoal;
        if (this.fMap[this.robot.me.y][this.robot.me.x] === 1) {
            return this.moveTowardsMine(this.fMap, true)
        }else {
            return this.moveTowardsMine(this.fMap)
        }
    }

    moveTowardsMine(map,noParallelMovement){
        super.setDijkstraMap(map);
        let movement = this.moveAlongDijkstraMap(1,noParallelMovement);
        if (movement){
            return this.robot.move(movement.dX,movement.dY)
        }
    }

    isOnTargetKarboniteMine(){
        return this.kMap[this.robot.me.y][this.robot.me.x] === 0
    }

    isOnTargetFuelMine(){
        return this.fMap[this.robot.me.y][this.robot.me.x] === 0
    }

    isHome() {
        return this.hMap[this.robot.me.y][this.robot.me.x] <= 1
    }

    isCappedOnFuel(){
        return this.robot.me.fuel === 100
    }

    isCappedOnKarb(){
        return this.robot.me.karbonite === 20
    }

    depositAtNearestStructure(){
        let units = this.robot.getVisibleRobotMap();
        this.enemies = this.getNearbyRobotsSplitInTeams().enemies;

        if (this.isCappedOnKarb()) {
            for (let offY = -1; offY <= 1; offY++) {
                for (let offX = -1; offX <= 1; offX++) {
                    let x = this.robot.me.x + offX;
                    let y = this.robot.me.y + offY;

                    if (super.isPointOnMap({x: x, y: y}) === true && units[y][x] > 0) {
                        let unit = this.robot.getRobot(units[y][x]).unit;
                        if (unit === SPECS.CASTLE || unit === SPECS.CHURCH) {
                            return this.robot.give(offX, offY, this.robot.me.karbonite, this.robot.me.fuel);
                        }
                    }
                }
            }
        }
    }

    buildChurch(){
        for (let i = -1; i <= 1; i++){
            for (let a = -1; a <= 1; a++){
                if (a !== 0 || i !== 0){
                    let y = this.robot.me.y + i;
                    let x = this.robot.me.x + a;

                    if (super.isPointOnMap({x:x,y:y}) === true && this.robot.karbonite_map[y][x] === false && this.robot.fuel_map[y][x] === false && this.robot.map[y][x] === true){
                        return this.robot.buildUnit(SPECS.CHURCH,a,i);
                    }
                }
            }
        }
    }

    moveAlongDijkstraMap(radius,disallowParallel){
        const goal = this.currentGoal;
        function orderNodesByManhattan(a,b){
            return calculateManhattanDistance(a,goal) - calculateManhattanDistance(b,goal)
        }
        if (this.djMap){
            if (this.djMap[this.position.y][this.position.x] !== 0) {
                //this.prioritizeStayingGrouped(this.getFriendlyCombatUnits(),radius);
                let surroundingNodes = this.getSurroundingNodes(radius);
                let smallestNodes = this.getSmallestNodes(surroundingNodes,disallowParallel);

                if (smallestNodes.length > 0 && smallestNodes[0][0] !== CONSTANTS.UNPASSABLE_TERRAIN_VALUE) {
                    for (let i = 0; i < smallestNodes.length; i++) {
                        let currentNodes = smallestNodes[i];
                        currentNodes.sort(orderNodesByManhattan);
                        for (let i = 0; i < currentNodes.length; i++) {
                            let randomPick = currentNodes[i];
                            if ((this.position.x !== randomPick.x || this.position.y !== randomPick.y) && this.canMove(randomPick)) {
                                const delta = this.getDeltaMovement(randomPick);
                                return delta
                            }
                        }
                    }
                }
            }
        }
    }

    isPointCloserToEnemies(dx,dy){
        for (let i = 0; i < this.enemies.length;i++){
            let dist1 = calculateManhattanDistance(this.robot.me,this.enemies[i]);
            let offset = {x:this.robot.me.x + dx, y:this.robot.me.y + dy};
            let dist2 = calculateManhattanDistance(offset,this.enemies[i]);
            if (dist2 < dist1){
                return true
            }
        }
        return false
    }

    shouldBuildChurch(){
        return this.getAmountOfKarboniteNearby() >= 2 && this.isThereAStructureNearby() === false;
    }

    canBuildChurch(){
        return this.robot.karbonite >= 50 && this.robot.fuel >= 200
    }

    isThereAStructureNearby(){
        return super.getClosestStructure(this.robot.me.team) !== undefined
    }

    getAmountOfKarboniteNearby(){
        let offsets = super.getOffsetsFromRadius(5,this.robot.me.x,this.robot.me.y);
        let karbMines = 0;
        for (let y = offsets.bottom; y <= offsets.top; y++){
            for (let x = offsets.left; x <= offsets.right; x++){
                if (this.robot.karbonite_map[y][x] === true) {
                    karbMines++
                }
            }
        }
        return karbMines
    }

    updateHome(){
        let structure = super.getClosestStructure(this.robot.me.team);
        if (structure && structure.id !== this.home.id){
            this.home = structure;
            this.generateHomeMap();
            return
        }
        if (!this.hMap){
            this.generateHomeMap();
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot)
    }
}