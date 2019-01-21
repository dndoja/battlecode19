import {SPECS,BCAbstractRobot} from 'battlecode'
import RobotController from "./RobotController.js";
import {getSymmetricNode} from "./utils.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import {calculateDiagonalDistance} from "./utils.js";

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

    getTargetKarboniteMine(){
        let skips = this.mineIndex;

        function checkIfRightMine(map,x, y) {
            if (map[y][x] === true) {
                if (skips === 0) {
                    return true
                }
                skips--
            }
            return false
        }

        let radius = 1;

        while (radius <= 10) {
            let offsets = super.getOffsetsFromRadius(radius, this.home.x, this.home.y);

            for (let x = offsets.left; x <= offsets.right; x++) {
                if (checkIfRightMine(this.robot.karbonite_map, x, offsets.top) === true) return {x: x, y: offsets.top};
                if (checkIfRightMine(this.robot.karbonite_map, x, offsets.bottom) === true) return {x: x, y: offsets.bottom};
            }

            for (let y = offsets.bottom; y <= offsets.top; y++) {
                if (checkIfRightMine(this.robot.karbonite_map, offsets.left, y) === true) return {x: offsets.left, y: y};
                if (checkIfRightMine(this.robot.karbonite_map, offsets.right, y) === true) return {x: offsets.right, y: y};
            }
            radius++;
        }
    }

    getClosestFuelMine(){
        let offsets = super.getOffsetsFromRadius(10,this.robot.me.x,this.robot.me.y);
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
        this.kMap = generator.generateMap();
        //this.robot.log("K:");
        //generator.printMap()
    }

    generateHomeMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        let distance = Math.floor(Math.max(Math.abs(this.robot.me.x - this.home.x), Math.abs(this.robot.me.y - this.home.y))) + RADIUS_MINES;
        generator.setLimits(this.robot.me.x - distance, this.robot.me.y - distance, this.home.x + distance, this.home.y + distance);
        generator.addGoal(this.home);
        this.hMap = generator.generateMap();
        //generator.printMap()
    }

    generateFuelMap(){
        let closestFuelMine = this.getClosestFuelMine();
        if (closestFuelMine.distanceTo <= MAX_DIST_TO_FUEL){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.setLimits(this.robot.me.x - RADIUS_MINES, this.robot.me.y - RADIUS_MINES, closestFuelMine.position.x + RADIUS_MINES, closestFuelMine.position.y + RADIUS_MINES);
            generator.addGoal(closestFuelMine.position);
            this.fMap = generator.generateMap();
            //this.robot.log("F:");
            //generator.printMap();

            return
        }

        this.fMap = null;
    }


    run(){
       this.robot.castle_talk = this.mineIndex;
        let canDeposit = this.depositAtNearestStructure();
        if (canDeposit){
        //    return canDeposit
        }

        if (this.canBuildChurch() === true){
            return this.buildChurch();
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
        if (!this.hMap){ this.generateHomeMap() }else{
            this.updateHome()
        }
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
        return this.moveTowardsMine(this.hMap)
    }

    moveTowardsKarboniteMine(){
        return this.moveTowardsMine(this.kMap)
    }

    moveTowardsFuelMine(){
        return this.moveTowardsMine(this.fMap)
    }

    moveTowardsMine(map){
        super.setDijkstraMap(map);
        let movement = super.moveAlongDijkstraMap(1);
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

        for (let offY = -1; offY <= 1; offY++){
            for (let offX = -1; offX <= 1; offX++){
                let x = this.robot.me.x + offX;
                let y = this.robot.me.y + offY;

                if (super.isPointOnMap({x:x,y:y}) === true && units[y][x] > 0){
                    let unit = this.robot.getRobot(units[y][x]).unit;
                    if (unit === SPECS.CASTLE || unit === SPECS.CHURCH){
                        return this.robot.give(offX,offY,this.robot.me.karbonite,this.robot.me.fuel);
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


    canBuildChurch(){
        return this.getAmountOfKarboniteNearby() >= 2 && this.robot.karbonite >= 50 && this.robot.fuel >= 200 && this.isThereAStructureNearby() === false
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
        if (structure){
            this.home = structure;
            this.generateHomeMap();
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot)
    }

}