import {SPECS,BCAbstractRobot} from 'battlecode'
import RobotController from "./RobotController";

export default class Pilgrim extends RobotController{

    constructor(robot){
        super(robot);
        this.updateRobotObject(robot)
    }


    run(){

    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot)
    }
}