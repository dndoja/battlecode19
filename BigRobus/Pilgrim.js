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
        let coords = super.getCoordinatesFromCastle();
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
        this.robot.log("M: " + this.mineIndex);

        this.targetMine = this.getTargetKarboniteMine();
        this.robot.log("tX: " + this.targetMine.x + " tY: "+ this.targetMine.y);
        this.generateTargetMap()
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
        let offsets = super.getOffsetsFromRadius(10,this.home.x,this.home.y);
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
        generator.setLimits(this.home.x - RADIUS_MINES, this.home.y - RADIUS_MINES, this.targetMine.x + RADIUS_MINES, this.targetMine.y + RADIUS_MINES);
        generator.addGoal(this.targetMine);
        this.kMap = generator.generateMap();
        //this.robot.log("K:");
        //generator.printMap()
    }

    generateHomeMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.setLimits(this.robot.me.x - RADIUS_MINES, this.robot.me.y - RADIUS_MINES, this.targetMine.x + RADIUS_MINES, this.targetMine.y + RADIUS_MINES);
        generator.addGoal(this.home);
        this.hMap = generator.generateMap();
        //generator.printMap()
    }

    generateFuelMap(){
        let closestFuelMine = this.getClosestFuelMine();
        if (closestFuelMine.distanceTo <= MAX_DIST_TO_FUEL){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.setLimits(this.robot.me.x - RADIUS_MINES, this.robot.me.y - RADIUS_MINES, this.targetMine.x + RADIUS_MINES, this.targetMine.y + RADIUS_MINES);
            generator.addGoal(closestFuelMine.position);
            this.fMap = generator.generateMap();
            this.robot.log("F:");
            generator.printMap();

            return
        }

        this.fMap = null;
    }

    run(){
        this.robot.castle_talk = this.mineIndex;

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
            }
        }else{
            if (!this.hMap){ this.generateHomeMap() }
            if (this.isHome() === true){
                return this.depositAtNearestStructure()
            }else{
                return this.moveTowardsHome()
            }
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

                if (units[y][x] > 0){
                    let unit = this.robot.getRobot(units[y][x]).unit;
                    if (unit === SPECS.CASTLE || unit === SPECS.CHURCH){
                        return this.robot.give(offX,offY,this.robot.me.karbonite,this.robot.me.fuel);
                    }
                }
            }
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot)
    }

}