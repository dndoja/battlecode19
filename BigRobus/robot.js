import {BCAbstractRobot,SPECS} from 'battlecode';
import {BuildingDecisionMaker} from './BuildingDecisionMaker.js';
import {getMapSymmetryType,fitCoordsInEightBits,getCoordsFromEightBits} from "./utils.js";
import DijkstraMapGenerator from  './DijkstraMapGenerator.js'
import RobotController from "./RobotController.js";
import Castle from "./Castle.js";
import Crusader from "./Crusader.js";
import Pilgrim from "./Pilgrim.js";
import PointClusterGenerator from "./PointClusterGenerator.js";


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
            /*if(!generatedMap) {
                let points = [];
                for (let y = 0; y < this.map.length; y++) {
                    for (let x = 0; x < this.map.length; x++) {
                        if (this.karbonite_map[y][x] === true || this.fuel_map[y][x] === true){
                            points.push({x:x,y:y})
                        }
                    }
                }

                let pcg = new PointClusterGenerator(points,this);
                pcg.generateClusters();
                pcg.printClusters();

                generatedMap = true;
            }*/

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

