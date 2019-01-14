import {BCAbstractRobot,SPECS} from 'battlecode';
import {BuildingDecisionMaker} from './BuildingDecisionMaker.js';
import {getMapSymmetryType,fitCoordsInEightBits,getCoordsFromEightBits} from "./utils.js";
import DijkstraMapGenerator from  './DijkstraMapGenerator.js'
import RobotController from "./RobotController.js";
import Castle from "./Castle.js";
import Crusader from "./Crusader.js";
<<<<<<< HEAD
import Pilgrim from "./Pilgrim.js";
=======
>>>>>>> 03f6a0f782cdeaa4c35204465db0faf479e9d770

let turn = -1;
let generatedMap = false;

class MyRobot extends BCAbstractRobot {
    turn() {
        turn++;
        if (this.me.unit === SPECS.PREACHER) {

            /*if(!generatedMap) {
                let djikstraMapGenerator = new DijkstraMapGenerator(this);
                djikstraMapGenerator.setLimits(10,10);
                djikstraMapGenerator.addGoal({x: 15, y: 15});
                this.djMap = djikstraMapGenerator.generateMap();
                djikstraMapGenerator.printMap();
            }
            let controller = new RobotController(this);
            controller.setDijkstraMap(this.djMap);

            let movement = controller.moveAlongDijkstraMap(1);
            if (movement){
                return this.move(...movement)
            }*/

            if(!this.robot) {
               this.robot = new Crusader(this);
            }else{
                this.robot.updateRobotObject(this)
            }
            return this.robot.run()
        }else if (this.me.unit === SPECS.CASTLE) {
            if(!generatedMap) {
                generatedMap = true;
            }

            if(!this.robot) {
                this.robot = new Castle(this);
            }else{
                this.robot.updateRobotObject(this)
            }
            return this.robot.run()

        }else if (this.me.unit === SPECS.PILGRIM){
            if(!this.robot) {
                this.robot = new Pilgrim(this);
            }else{
                this.robot.updateRobotObject(this)
            }
            return this.robot.run()

        }
    }
}

