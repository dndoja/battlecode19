import {SPECS,BCAbstractRobot} from 'battlecode'
import RobotController from "./RobotController.js";
import {getSymmetricNode} from "./utils.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";


export default class Pilgrim extends RobotController{

    constructor(robot){
        super(robot);
        this.updateRobotObject(robot);
        this.friendlyCastles = [];
        this.moves = [];

        this.friendlyCastles.push(super.getClosestCastle());
        let coords = super.getCoordinatesFromCastle();
        for (let i = 0; i < coords.length; i++){
            this.friendlyCastles.push(coords[i].x,coords[i].y);
        }

        //this.updateCastlesMap();
        this.updateResourcesMap()
    }

    init(){
        this.home = super.getClosestStructure(this.robot.me.team);
        this.mineIndex = this.home.signal;
        this.targetMine = this.getTargetMine();
        this.generateTargetMap()
    }

    generateTargetMap(){
        let generator = new DijkstraMapGenerator(this.robot);
        generator.setLimits(this.robot.x - 1, this.robot.y - 1, this.targetMine.x + 1, this.targetMine.y + 1);
        this.targetMap = generator.generateMap();
    }

    run(){
        this.robot.castle_talk = this.mineIndex;
        /*//Mine if at tile and has capacity
        if (this.kMap[this.robot.me.y][this.robot.me.x] === 0 && this.robot.me.karbonite < 20){
            return this.robot.mine()
        }else if (this.kMap[this.robot.me.y][this.robot.me.x] !== 0 && this.robot.me.karbonite < 20){
            // Go to deposit if not at deposit and has capacity
            super.setDijkstraMap(this.kMap);
            let movement = this.moveAlongDijkstraMap(1);
            this.moves.push(movement);
            if (movement){
                return this.robot.move(movement.dX,movement.dY);
            }
        }else if (this.robot.me.karbonite === 20){
            if (this.moves.length > 0){
                let movement = this.moves[this.moves.length - 1];
                this.moves.pop();
                return this.robot.move(movement.dX * -1 ,movement.dY * -1)
            }else{
                return this.depositAtNearestCastle();
            }
        }*/
    }

    // TODO Make this target closest mines first
    getTargetMine(){
        let offsets = super.getOffsetsFromRadius(10,this.home.x,this.home.y);
        let skips = this.mineIndex;
        for (let y = offsets.bottom; y <= offsets.top; y++){
            for (let x = offsets.left; x <= offsets.right; x++){
                if (this.robot.karbonite_map[y][x] === true) {
                    if (skips === 0) {
                        return {x: x, y: y}
                    }
                    skips--
                }
            }
        }
    }

    depositAtNearestCastle(){
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

    updateCastlesMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        let goals = [];
        for  (let i = 0; i < this.friendlyCastles.length; i++){
            goals.push({x:this.friendlyCastles[i].x,y:this.friendlyCastles[i].y});
        }
        generator.addGoals(goals);
        this.castlesMap = generator.generateMap();
        if (print) {
            //generator.printMap();
        }
    }

    createResourcesMap(){
        let kMap = this.robot.karbonite_map;
        let goals = [];

        for (let y = 0; y < this.robot.karbonite_map; y++){
            for (let x = 0; x < this.robot.karbonite_map; x++){
                if (kMap){
                    goals.push({x:x,y:y})
                }
            }
        }

        let generator = new DijkstraMapGenerator();
        generator.addGoals(goals);
        this.kMap = generator.generateMap();
    }

    updateResourcesMap(){
        let closestKarb = this.getClosestResource(this.robot.karbonite_map);
        let closestFuel = this.getClosestResource(this.robot.fuel_map);


        if (closestKarb){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.addGoal(closestKarb);
            generator.setLimits(this.robot.me.x - 1,this.robot.me.y - 1,closestKarb.x,closestKarb.y);
            this.kMap = generator.generateMap();
            //generator.printMap()
        }

        if (closestFuel){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.addGoal(closestFuel);
            generator.setLimits(this.robot.me.x - 1,this.robot.me.y - 1,closestKarb.x,closestKarb.y);
            this.fMap = generator.generateMap();
            //generator.printMap()
        }
    }

    getClosestResource(map){
        let radius = 1;

        while (radius < map.length) {
            let offsets = this.getOffsetsFromRadius(radius, this.robot.me.x, this.robot.me.y);
            //Top and bottom
            for (let x = offsets.left; x <= offsets.right; x++) {
                let valueTop = map[offsets.top][x];
                let valueBottom = this.robot.karbonite_map[offsets.bottom][x];
                if (valueTop === true){
                    return {y:offsets.top,x:x}
                }

                if (valueBottom === true){
                    return {y:offsets.bottom,x:x}
                }
            }

            //Left and right
            for (let y = offsets.bottom; y <= offsets.top; y++) {
                let valueRight = map[y][offsets.right];
                let valueLeft = map[y][offsets.left];
                if (valueLeft === true){
                    return {y:y,x:offsets.left}
                }

                if (valueRight === true){
                    return {y:y,x:offsets.right}
                }
            }
            radius++;
        }

    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot)
    }
}