import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import PointClusterGenerator from "./PointClusterGenerator.js";
import {getDeltaBetweenPoints, getDistanceBetweenPoints, getSymmetricNode} from "./utils.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";

export default class Preacher extends RobotController{

    constructor(robot) {
        super(robot);
        this.enemyCastles = [];
        this.getEnemyCastleCoordinates();
        this.updateEnemyCastlesMap();
    }

    getEnemyCastleCoordinates(){
        this.getOppositeCastleCoordinates();
        this.getRadioedCastleCoordinates();
    }

    getOppositeCastleCoordinates(){
        let homeCastle = super.getClosestCastle();
        this.enemyCastles.push(getSymmetricNode(homeCastle.x,homeCastle.y,this.robot.map,this.symmetry));
    }

    getRadioedCastleCoordinates(){
        let coords = super.getRadioCoordsFromHomeCastle();
        for (let i = 0; i < coords.length; i++){
            this.enemyCastles.push(getSymmetricNode(coords[i].x,coords[i].y,this.robot.map,this.symmetry));
        }
    }

    updateEnemyCastlesMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        let goals = [];
        for  (let i = 0; i < this.enemyCastles.length; i++){
            goals.push({x:this.enemyCastles[i].x,y:this.enemyCastles[i].y});
        }
        if(goals.length > 0) {
            generator.addGoals(goals);
            this.enemyCastlesMap = generator.generateMap();
            if (print) {
                generator.printMap();
            }
        }
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

        this.checkIfReachedEnemyCastles();

        if (this.hasNearbyEnemies() === true){
            this.generateEnemyClusters();
            return this.attackBestCluster();
        }else{
            return this.moveToEnemyCastles();
        }
    }

    moveToEnemyCastles(){
        super.setDijkstraMap(this.enemyCastlesMap);
        let movement = super.moveAlongDijkstraMap(1);

        if (movement) {
            return this.robot.move(movement.dX, movement.dY);
        }
    }

    checkIfReachedEnemyCastles(){
        let unexploredCastles = [];
        for (let i = 0; i < this.enemyCastles.length; i++){
            let distanceSquared = getDistanceBetweenPoints(this.robot.me.x,this.enemyCastles[i].x,this.robot.me.y,this.enemyCastles[i].y);
            if (distanceSquared > 2){
                unexploredCastles.push(this.enemyCastles[i])
            }
        }
        if (unexploredCastles.length !== this.enemyCastles.length) {
            this.enemyCastles = unexploredCastles;
            this.updateEnemyCastlesMap()
        }
    }

    attackBestCluster(){
        for (let i = 0; i < this.enemyClusters.length; i++){
            let cluster = this.enemyClusters[i];
            let bOnB = this.calculateBlueOnBlue(i);

            if (this.areCasualtiesWorthTaking(cluster,bOnB)){
                let delta = getDeltaBetweenPoints(this.robot.me,cluster.centroid);
                return this.robot.attack(delta.dX,delta.dY)
            }
        }
    }

    areCasualtiesWorthTaking(enemyCluster,friendlies){
        return enemyCluster.points.length / friendlies >= 3
    }

    calculateBlueOnBlue(clusterIndex){
        let robots = this.robot.getVisibleRobotMap();
        let casualties = 0;
        for (let offY = -1; offY <= 1; offY++){
            for (let offX = -1; offX <= 1; offX++){
                let x = this.enemyClusters[clusterIndex].centroid.x + offX;
                let y = this.enemyClusters[clusterIndex].centroid.y + offY;

                if (super.isPointOnMap({x:x,y:y}) && robots[y][x] > 0 && super.isRobotFriendly(robots[y][x])){
                    casualties++;
                }
            }
        }

        return casualties;
    }

    areEnemiesStacked(){
        return this.enemyClusters[0].points.length > 1
    }

    generateEnemyClusters(){
        let clusterGen = new PointClusterGenerator(this.nearbyEnemies,this.robot);
        clusterGen.setClusterRadius(1);
        this.enemyClusters = clusterGen.generateClusters();
        //clusterGen.printClusters()
    }

    hasNearbyEnemies(){
        return this.nearbyEnemies.length > 0
    }

    updateRobotObject(robot) {
        super.updateRobotObject(robot);
    }
}