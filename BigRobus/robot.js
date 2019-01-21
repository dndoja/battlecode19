import {BCAbstractRobot,SPECS} from 'battlecode';
import {BuildingDecisionMaker} from './BuildingDecisionMaker.js';
import {getMapSymmetryType,fitCoordsInEightBits,getCoordsFromEightBits} from "./utils.js";
import DijkstraMapGenerator from  './DijkstraMapGenerator.js'
import RobotController from "./RobotController.js";
import Castle from "./Castle.js";
import Crusader from "./Crusader.js";
import Pilgrim from "./Pilgrim.js";
import PointClusterGenerator from "./PointClusterGenerator.js";
import Preacher from "./Preacher.js";
import Prophet from "./Prophet.js";
import Church from "./Church.js";

//SEED: 1 CASTLE SMALL MAP: 1430804081

let turn = -1;
let generatedMap = false;

class MyRobot extends BCAbstractRobot {
    turn() {
        turn++;
        if (this.me.unit === SPECS.PREACHER) {
            if(!this.robot) {
               this.robot = new Preacher(this);
            }else{
                this.robot.updateRobotObject(this)
            }
            return this.robot.run()
        }else if (this.me.unit === SPECS.CASTLE) {
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
        }else if (this.me.unit === SPECS.PROPHET){
            if(!this.robot) {
                this.robot = new Prophet(this);
            }else{
                this.robot.updateRobotObject(this)
            }
            return this.robot.run()
        }else if (this.me.unit === SPECS.CHURCH){
            if(!this.robot) {
                this.robot = new Church(this);
            }else{
                this.robot.updateRobotObject(this)
            }
        }
    }
}

