import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {fitCoordsInEightBits, getMapSymmetryType, getCoordsFromEightBits} from "./utils.js";
import constants from "./constants.js";
import {BuildingDecisionMaker} from "./BuildingDecisionMaker.js";

export default class Castle extends RobotController{
    constructor(robot) {
        super(robot);
        this.robot = robot;
        this.willBuildRobots = false;
        this.enemyCastlePositions = [];
        this.symmetry = getMapSymmetryType(this.robot.map);
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot);
    }

    run(){
        let broadcastRange = 2;

        if (this.robot.me.turn <= 2) {
            this.broadcastOppositeCastlePosition();
            this.listenToOppositeCastlePositions();
            if (this.robot.me.turn === 1){
                if (this.enemyCastlePositions.length === 0 || this.robot.getVisibleRobots().length === 1){
                    this.willBuildRobots = true;
                }
            }
        }

        if (this.robot.me.turn >= 2 && this.willBuildRobots) {
            let builtRobot = this.buildRobot();
            if (builtRobot) {
                if (this.enemyCastlePositions.length === 1) {
                    let firstCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.enemyCastlePositions[0].x, this.enemyCastlePositions[0].y, this.symmetry);
                    //this.robot.log("x: " + this.enemyCastlePositions[0].x + " y: " + this.enemyCastlePositions[0].y + " bin: " + firstCastle);
                    this.robot.signal(parseInt(firstCastle, 2), 2)
                } else if (this.enemyCastlePositions.length === 2) {
                    let firstCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.enemyCastlePositions[0].x, this.enemyCastlePositions[0].y, this.symmetry);
                    let secondCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.enemyCastlePositions[1].x, this.enemyCastlePositions[1].y, this.symmetry);
                    let merged = firstCastle + secondCastle;
                    //this.robot.log(merged);
                    this.robot.signal(parseInt(merged, 2), 2)
                }
            }

            return this.buildRobot();
        }
    }

    buildRobot(){
        let decisionmaker = new BuildingDecisionMaker(this.robot);
        let unitToBuild = decisionmaker.getBuildingDecision();
        const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

        for (let i = 0; i < choices.length; i++) {
            let choice = choices[i];
            let dY = this.robot.me.y + choice[0];
            let dX = this.robot.me.x + choice[1];
            if (unitToBuild != null && dX > 0 && dY > 0 && dX < this.robot.map.length && dY < this.robot.map.length && this.robot.getVisibleRobotMap()[dY][dX] <= 0 && this.robot.map[dY][dX] === true) {
                return this.robot.buildUnit(unitToBuild, choice[0], choice[1])
            }
        }
    }

    listenToOppositeCastlePositions(){
        let robots = this.robot.getVisibleRobots();
        this.enemyCastlePositions = [];
        for (let i = 0; i < robots.length; i++){
            if (robots[i].id !== this.robot.me.id) {
                let cTalk = robots[i].castle_talk;
                if (cTalk) {
                    let toBinary = cTalk.toString(2);
                    let coords = getCoordsFromEightBits(this.robot, this.robot.map, toBinary, this.symmetry);
                    this.enemyCastlePositions.push(coords)
                }
            }
        }
    }

    broadcastOppositeCastlePosition(){
        let oppositeCastle = this.getOppositeCastle();
        let bits = fitCoordsInEightBits(this.robot,this.robot.map,oppositeCastle.x,oppositeCastle.y,this.symmetry);
        let broadcastValue = parseInt(bits,2);
        //this.robot.log(broadcastValue.toString());
        this.robot.castleTalk(broadcastValue)
    }

    getOppositeCastle(){
        let symmetricalX = this.robot.map.length - 1 - this.robot.me.x;
        let symmetricalY = this.robot.map.length - 1 - this.robot.me.y;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            return{x: symmetricalX, y: this.position.y}
        }else {
            return{x: this.position.x, y: symmetricalY}
        }
    }
}