import {BCAbstractRobot,SPECS} from 'battlecode';
import CONSTANTS from './constants.js'
import {getVisibleFriendlyRobotsOfType,fitPointInMap} from "./utils.js";
import {teamComposition} from './strategy.js'

export class BuildingDecisionMaker{
    constructor(robot){
        this.robot = robot;
    }

    getBuildingDecision() {
        if (this.robot.me.turn <= 100) {
            if (this.robot.me.turn === 1 || (this.robot.karbonite === CONSTANTS.PILGRIM_KARBONITE_COST || this.robot.karbonite % CONSTANTS.PREACHER_KARBONITE_COST >= CONSTANTS.PILGRIM_KARBONITE_COST)) {

                return SPECS.PILGRIM
            } else if (this.robot.fuel >= 50 && this.robot.karbonite >= CONSTANTS.PROPHET_KARBONITE_COST) {
                return SPECS.PROPHET;
            }
        }

        return null
    };


    getBuildingDecisionRandomly() {
        let lowerBound = 1;

        let random = Math.floor(Math.random() * 100) + 1;

        for (let i = 0; i < teamComposition.length; i++){
            let upperBound = teamComposition[i].percent * 100 + lowerBound;
            if (random >= lowerBound && random < upperBound){
                return teamComposition[i].type
            }else{
                lowerBound = upperBound
            }
        }

        return null
    };
}