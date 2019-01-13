import CONSTANTS from "./constants.js";

export default class DijkstraMapGenerator {
    
    constructor(robot){
        this.map = [];
        this.robot = robot;
        this.startX = 0;
        this.startY = 0;
        this.endX = this.robot.map.length;
        this.endY = this.robot.map.length;
        this.populateMapWithInitialValues();
    }
    
    setLimits(startX, startY, endX, endY){
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }

    populateMapWithInitialValues(){
        for (let y = 0; y < this.robot.map.length; y++){
            this.map[y] = [];
            for (let x = 0; x < this.robot.map.length; x++){
                this.map[y][x] = CONSTANTS.UNPASSABLE_TERRAIN_VALUE;
            }
        }
    }

    addGoal(goal){
        if (this.isPointPassable(goal.x,goal.y)) {
            this.map[goal.y][goal.x] = 0;
        }else {
            let neighbours = this.getNeighboringNodes(goal.x,goal.y);
            for (let i = 0; i < neighbours.length; i++){
                this.map[neighbours[i].y][neighbours[i].x] = 0;
            }
        }
    }

    addGoals(goals){
        for (let i = 0; i < goals.length; i++){
            let goal = goals[i];
            if (this.isPointPassable(goal.x,goal.y)) {
                this.map[goal.y][goal.x] = 0;
            }else{
                let neighbours = this.getNeighboringNodes(goal.x,goal.y);
                for (let i = 0; i < neighbours.length; i++){
                    this.map[neighbours[i].y][neighbours[i].x] = 0;
                }
            }
        }
    }

    generateMap(){
        let wereChanges = true;

        while (wereChanges) {
            wereChanges = false;
            for (let y = this.startY; y < this.endY; y++) {
                for (let x = this.startX; x < this.endX; x++) {
                    if (this.isPointPassable(x,y)) {
                        let value = this.map[y][x];
                        let neighbours = this.getNeighboringNodes(x, y);
                        for (let i = 0; i < neighbours.length; i++) {
                            let lowestValueOfNeighbours = this.getLowestValueOfNodes(neighbours);
                            if (value - lowestValueOfNeighbours > 1) {
                                this.map[y][x] = lowestValueOfNeighbours + 1;
                                wereChanges = true;
                            }
                        }
                    }
                }
            }
        }
        
        return this.map
    }

    getLowestValueOfNodes(nodes){
        let smallest = this.map[nodes[0].y][nodes[0].x];
        let str = "";
        for (let i = 1; i < nodes.length; i++){
            let node = nodes[i];
            let value = this.map[node.y][node.x];
            str += value + " ";
            if (value < smallest){
                smallest = value
            }
        }

        str += " Lowest: " + smallest;
        //this.robot.log(str);
        return smallest
    }

    getNeighboringNodes(x,y){
        let neighbors = [];
        for (let yOffset = -1; yOffset <= 1; yOffset++){
            for (let xOffset = -1; xOffset <= 1; xOffset++){
                if (xOffset !== 0 || yOffset !== 0) {
                    let neighborX = x + xOffset;
                    let neighborY = y + yOffset;
                    if (this.pointFitsInMap(neighborX, neighborY) && this.isPointPassable(neighborX, neighborY)) {
                        //this.robot.log("X: " + neighborX + " Y: " + neighborY);
                        neighbors.push({x: neighborX, y: neighborY})
                    }
                }
            }
        }
        return neighbors;
    }

    pointFitsInMap(x,y){
        return x >= this.startX && y >= this.startY && x < this.map.length && y < this.map.length
    }

    isPointPassable(x,y){
        return this.robot.map[y][x]
    }

    printMap(){
        for (let y = 0; y < this.map.length; y++) {
            let str = "";
            for (let x = 0; x < this.map.length; x++) {
                if (this.map[y][x] < 10) {
                    str += " 0" + this.map[y][x]
                } else if (this.map[y][x] < 100) {
                    str += " " + this.map[y][x]
                } else {
                    str += " " + "**"
                }
            }
            this.robot.log(str);
        }
        this.robot.log("_____________________")
    }
}