import {BCAbstractRobot,SPECS} from 'battlecode';
import {BuildingDecisionMaker} from './BuildingDecisionMaker.js';
import {getMapSymmetryType,fitCoordsInEightBits,getCoordsFromEightBits} from "./utils.js";
import DijkstraMapGenerator from  './DijkstraMapGenerator.js'
import RobotController from "./RobotController.js";
import Castle from "./Castle.js";
import Crusader from "./Crusader.js";

let turn = -1;
let generatedMap = false;

class MyRobot extends BCAbstractRobot {
    turn() {
        turn++;
        if (this.me.unit === SPECS.CRUSADER) {
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
            // this.log("Crusader health: " + this.me.health);
            const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            const choice = choices[Math.floor(Math.random()*choices.length)];
            return this.move(...choice);
        }
    }
}

