import {BCAbstractRobot,SPECS} from 'battlecode';
import CONSTANTS from './constants.js'
import {getVisibleFriendlyRobotsOfType,fitPointInMap} from "./utils.js";
import {teamComposition} from './strategy.js'

export class BuildingDecisionMaker{
    constructor(robot){
        this.robot = robot
    }

    getBuildingDecision() {
            if (this.robot.fuel >= 50 && this.robot.karbonite >= CONSTANTS.CRUSADER_KARBONITE_COST) {
                return SPECS.CRUSADER
                //  }
            }
        /*else if (
            this.robot.turn === 1 ||
            (this.robot.fuel >= CONSTANTS.START_FUEL + CONSTANTS.UNIT_FUEL_PRICE && this.robot.karbonite >= CONSTANTS.START_KARBONITE + CONSTANTS.CRUSADER_KARBONITE_COST)
        ){
            //if its the second turn or there is enough fuel and karbonite to also build a church
            return SPECS.CRUSADER
        }*/

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