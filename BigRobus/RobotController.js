import {SPECS,BCAbstractRobot} from 'battlecode';
import CONSTANTS from "./constants.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import {getDistanceBetweenPoints,getCoordsFromEightBits, padWithZeros,getMapSymmetryType,getSymmetricNode} from "./utils.js";


export default class RobotController {

    constructor(robot){
        this.symmetry = getMapSymmetryType(robot.map);
        this.updateRobotObject(robot);
    }

    setDijkstraMap(djMap){
        this.djMap = djMap
    }

    updateRobotObject(robot){
        this.robot = robot;
        this.position = {x: robot.me.x, y: robot.me.y};
    }

    moveAlongDijkstraMap(radius){
        if (this.djMap){
            if (this.djMap[this.position.y][this.position.x] !== 0) {
                //this.prioritizeStayingGrouped(this.getFriendlyCombatUnits(),radius);
                let surroundingNodes = this.getSurroundingNodes(radius);
                let smallestNodes = this.getSmallestNodes(surroundingNodes);

                if (smallestNodes.length > 0 && smallestNodes[0][0] !== CONSTANTS.UNPASSABLE_TERRAIN_VALUE) {
                    for (let i = 0; i < smallestNodes.length; i++) {
                        let currentNodes = smallestNodes[i];
                            /*currentNodes.sort(function () {
                                return Math.random() - 0.5;
                            });*/
                            //let randomPick = smallestNodes[Math.floor(Math.random() * smallestNodes.length)];
                            for (let i = 0; i < currentNodes.length; i++) {
                                let randomPick = currentNodes[i];
                                //this.robot.log(smallestNodes.length);
                                if ((this.position.x !== randomPick.x || this.position.y !== randomPick.y) && this.canMove(randomPick)) {
                                    return this.getDeltaMovement(randomPick);
                                }
                            }
                        }
                    }
            }
        }
    }

    prioritizeStayingGrouped(nearbyUnits,radius){
        let currentValue = this.djMap[this.position.y][this.position.x];
        for (let i = 0; i < nearbyUnits.length; i++){
            let surroundingNodes = this.getSurroundingNodes(1,nearbyUnits[i].x, nearbyUnits[i].y);
            for (let a = 0; a < surroundingNodes.length; a++){
                let node = surroundingNodes[a];

                if (this.djMap[node.y][node.x] < currentValue){
                    this.djMap[node.y][node.x] -= 1
                }
            }
        }
    }

    getClosestEnemy(enemies){
        let closestEnemy = enemies[0];
        let mX = this.position.x;
        let mY = this.position.y;
        let closestDistance = getDistanceBetweenPoints(mX,enemies[0].x,mY,enemies[0].y);

        for (let i = 1; i < enemies.length; i++){
            let target = enemies[i];
            let distance = getDistanceBetweenPoints(mX,target.x,mY,target.y);
            //this.robot.log("mX: " + mX + " mY: " + mY + " tX: " + target.x +  " tY: " + target.y + " id: " + target.id);
            if (distance < closestDistance){
                closestEnemy = target;
                closestDistance = distance;
            }
        }

        return {man:closestEnemy,distance:closestDistance}
    }

    getClosestCastle(){
        let friendlyCastles = this.getFriendlyUnitsOfType(SPECS.CASTLE);

        for (let i = 0; i < friendlyCastles.length; i++){
            let castleF = friendlyCastles[i];
            return {x: castleF.x, y: castleF.y};
        }
    }

    getDeltaMovement(node){
        //this.robot.log("dX: " + (node.x - this.position.x).toString() + " dY: " + (node.y - this.position.y).toString());
        return {dX: node.x - this.position.x ,dY: node.y - this.position.y}
    }

    canMove(node){
        return this.robot.map[node.y][node.x] === true && !this.robot.getVisibleRobotMap()[node.y][node.x] > 0;
    }

    getSmallestNodes(nodes){
        let sortedNodes = [];

        //this.robot.log("Current: " + this.djMap[this.position.y][this.position.x]);
        for (let i = 0; i < nodes.length; i++){
            let currentNode = nodes[i];

            let foundMatch = false;
            for (let a = 0; a < sortedNodes.length; a++){
                if (sortedNodes[a][0].value === currentNode.value){
                    sortedNodes[a].push(currentNode);
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch){
                if (currentNode.value < this.djMap[this.position.y][this.position.x]) {
                    let newNodes = [];
                    newNodes.push(currentNode);
                    sortedNodes.push(newNodes);
                }
            }
        }

        //sortedNodes.reverse();
        sortedNodes.sort(function (a,b) {
            if (a[0] === b[0]) {
                return 0;
            }
            else {
                return (a[0] < b[0]) ? -1 : 1;
            }
        });

        for (let y = 0; y < sortedNodes.length; y++){
            let n = sortedNodes[y];
            let str = "";
            for (let x = 0; x < n.length; x++){
                str += (n[x].value + " ")
            }
            //this.robot.log(str)
        }

        return sortedNodes;
    }

    getSurroundingNodes(radius,x,y){
        if (!x){
            x = this.position.x;
            y = this.position.y;
        }

        let offsets = this.getOffsetsFromRadius(radius,x,y);
        let nodes = [];
        //Top and bottom
        for (let x = offsets.left; x <= offsets.right; x++){
            let valueTop = this.djMap[offsets.top][x];
            let valueBottom = this.djMap[offsets.bottom][x];
            nodes.push({x:x,y:offsets.top,value:valueTop});
            nodes.push({x:x,y:offsets.bottom,value:valueBottom});
        }

        //Left and right
        for (let y = offsets.bottom; y <= offsets.top; y++){
            let valueRight = this.djMap[y][offsets.right];
            let valueLeft = this.djMap[y][offsets.left];
            nodes.push({x:offsets.right,y:y,value:valueRight});
            nodes.push({x:offsets.left,y:y,value:valueLeft});
        }

        nodes.push({x:x,y:y + radius + 1});
        nodes.push({x:x,y:y - radius - 1});
        nodes.push({x:x + radius + 1, y:y});
        nodes.push({x:x - radius - 1, y:y});

        return nodes
    }

    getEnemiesMap(enemies, range){
        let observableArea = this.getOffsetsFromRadius(range);
        let mapGenerator = new DijkstraMapGenerator(this.robot);
        mapGenerator.setLimits(observableArea.left,observableArea.bottom,observableArea.right,observableArea.top);
        let enemyPositions = [];

        for (let i = 0; i < enemies.length; i++){
            let enemy = enemies[i];
            enemyPositions.push({x:enemy.x,y:enemy.y})
        }

        mapGenerator.addGoals(enemyPositions);
        let map = mapGenerator.generateMap();
        //mapGenerator.printMap();

        return map;
    }

    getFriendlyCombatUnits(){
        let nearbyUnits = this.robot.getVisibleRobots();

        let units = [];
        for (let i = 0; i < nearbyUnits.length; i++){
            let currentRobot = nearbyUnits[i];
            if (this.robot.me.team === currentRobot.team && this.robot.me.id !== currentRobot.id && (currentRobot.unit === SPECS.CRUSADER || currentRobot.unit === SPECS.PREACHER || currentRobot.unit === SPECS.PROPHET)){
                units.push(currentRobot)
            }
        }

        return units
    }

    getFriendlyUnitsOfType(type){
        let nearbyUnits = this.robot.getVisibleRobots();

        let units = [];
        for (let i = 0; i < nearbyUnits.length; i++){
            let currentRobot = nearbyUnits[i];
            if (currentRobot.unit === type && this.robot.me.team === currentRobot.team){
                units.push(currentRobot)
            }
        }

        return units
    }

    getOffsetsFromRadius(radius,x,y){
        if (!x){
            x = this.position.x;
            y = this.position.y;
        }
        let left = x - radius;
        let top = y + radius;
        let right = x + radius;
        let bottom = y - radius;

        if (left < 0){left = 0}
        if (bottom < 0){bottom = 0}
        if (top >= this.robot.map.length){top = this.robot.map.length - 1}
        if (right >= this.robot.map.length){right = this.robot.map.length - 1}

        return {left:left,top:top,right:right,bottom:bottom}
    }

    getNearbyEnemies(){
        let nearbyRobots = this.robot.getVisibleRobots();
        let enemies = [];

        for (let i = 0; i < nearbyRobots.length; i++){
            let targetRobot = nearbyRobots[i];
            if (targetRobot.team !== this.robot.me.team){
                enemies.push(targetRobot)
            }
        }

        return enemies
    }

    getCoordinatesFromCastle(){
        let signal = this.getSignalFromCastle();
        let signalBin = signal.toString(2);
        //this.robot.log(signalBin);
        let coords = [];
        if (signal > 0) {
            if (signalBin.length > 8) {
                let paddedSignal = signalBin;
                if (signalBin.length < 16) {
                    paddedSignal = padWithZeros(signalBin, 16);
                }
                let signal1 = paddedSignal.substr(0, 8);
                let signal2 = paddedSignal.substr(8, 16);

                let coords1 = getCoordsFromEightBits(this.robot, this.robot.map, signal1, this.symmetry);
                let coords2 = getCoordsFromEightBits(this.robot, this.robot.map, signal2, this.symmetry);

                coords.push(coords1);
                coords.push(coords2);
            } else {
                coords.push(getCoordsFromEightBits(this.robot, this.robot.map, signalBin, this.symmetry));
            }
        }
        return coords
    }

    getSignalFromCastle(){
        let friendlyCastles = this.getFriendlyUnitsOfType(SPECS.CASTLE);
        if (friendlyCastles.length > 0){
            let castle = friendlyCastles[0];
            if (castle.signal){
                return castle.signal;
            }
        }
    }
}