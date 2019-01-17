import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {calculateDiagonalDistance,getDeltaBetweenPoints} from "./utils.js";

export default class Prophet extends RobotController{

    constructor(robot) {
        super(robot);
    }

    getNearbyRobotsSplitInTeams(){
        let robots = this.robot.getVisibleRobots();
        let friendlies = [];
        let enemies = [];
        let myteam = this.robot.me.team;

        for (let i = 0; i < robots.length; i++){
            if (robots[i].team === myteam){
                friendlies.push(robots[i])
            }else{
                enemies.push(robots[i])
            }
        }

        return {friendlies:friendlies,enemies:enemies}
    }

    run(){
        let robots = this.getNearbyRobotsSplitInTeams();
        this.nearbyEnemies = robots.enemies;
        this.nearbyFriendlies = robots.friendlies;

        if (this.hasNearbyEnemies() === true){
            return this.attackPriorityEnemy()
        }else{

        }
    }

    attackPriorityEnemy() {
        let priorityEnemy = this.getPriorityEnemy();
        if (priorityEnemy) {
            let delta = getDeltaBetweenPoints(this.robot.me, priorityEnemy);
            return this.robot.attack(delta.dX, delta.dY)
        }
    }

    getPriorityEnemy(){
        let closestDistance = 10000;
        let closestEnemy;

        for (let i = 0; i < this.nearbyEnemies.length;i++){
            let enemy = this.nearbyEnemies[i];
            for (let a = 0; a < this.nearbyFriendlies.length;a++){
                let friendly = this.nearbyFriendlies[a];

                let dist = calculateDiagonalDistance(enemy,friendly);
                let distFromMe = calculateDiagonalDistance(enemy,this.robot.me);
                if (dist < closestDistance && distFromMe > 4){
                    closestDistance = dist;
                    closestEnemy = enemy;
                }
            }
        }

        return closestEnemy
    }

    hasNearbyEnemies(){
        return this.nearbyEnemies.length > 0
    }

    updateRobotObject(robot) {
        super.updateRobotObject(robot);
    }
}