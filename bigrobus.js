'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":50,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":20,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":36,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.

        if (this.fuel < radius) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= radius;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit !== SPECS.CRUSADER && this.me.unit !== SPECS.PREACHER && this.me.unit !== SPECS.PROPHET) throw "Given unit cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot attack impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('x' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

var constants = {
    START_KARBONITE:100,
    START_FUEL:500,
    UNIT_FUEL_PRICE:50,
    CHURCH_KARBONITE_COST:50,
    PILGRIM_KARBONITE_COST:10,
    CRUSADER_KARBONITE_COST:20,
    PROPHET_KARBONITE_COST:25,
    PREACHER_KARBONITE_COST:30,
    BUILDING_VISION_RADIUS:10,
    UNPASSABLE_TERRAIN_VALUE:1000000,
    SYMMETRY_VERTICAL:1,
    SYMMETRY_HORIZONTAL:2
};

// Percentage of units in composition Crusader,Prophet,Preacher,Pilgrim
let teamComposition = [
    {
        type:SPECS.CRUSADER,
        percent:0.3
    },{
        type:SPECS.PROPHET,
        percent:0.3
    },{
        type:SPECS.PREACHER,
        percent:0.3
    },{
        type:SPECS.PILGRIM,
        percent:0.1
    }];

function getMapSymmetryType(map) {
    for (let y = 0; y < map.length; y++){
        for (let x = 0; x < map.length / 2; x++){
            let symmetricalX = map.length - 1 - x;
            if (map[y][x] !== map[y][symmetricalX]){
                return constants.SYMMETRY_VERTICAL
            }
        }
    }

    return constants.SYMMETRY_HORIZONTAL
}

function getDistanceBetweenPoints(x1, x2, y1, y2) {
    let dX = x2 - x1;
    let dY = y2 - y1;
    return dX * dX + dY * dY
}

function fitCoordsInEightBits(robot,map, x, y, symmetry) {
    let detailedCoord;
    let notDetailedCoord;

    if (symmetry === constants.SYMMETRY_HORIZONTAL){
        detailedCoord = y;
        notDetailedCoord = x;
    }else if (symmetry === constants.SYMMETRY_VERTICAL){
        detailedCoord = x;
        notDetailedCoord = y;
    }

    let scaledDetailed = Math.floor((detailedCoord / Math.floor(map.length / 31)) / 2);
    let scaledNotDetailed = Math.floor(notDetailedCoord / Math.floor(map.length / 7));

    let sdBinary = padWithZeros(scaledDetailed.toString(2),5);
    let sndBinary = padWithZeros(scaledNotDetailed.toString(2),3);
    //robot.log("sd: " + scaledDetailed + " snd: " + scaledNotDetailed + " ml: " + map.length + " binary " + sndBinary + sdBinary);

    return sndBinary + sdBinary;
}

function getCoordsFromEightBits(robot,map,bits,symmetry) {
    let padded = padWithZeros(bits,8);

    let threeBits = padded.substr(0,3);
    let fiveBits = padded.substr(3,8);
    let detailedCoord = parseInt(fiveBits,2);
    let notDetailedCoord = parseInt(threeBits,2);

    //robot.log(" bits: " + bits + " padded: " + padded + " threeBits: " + threeBits + " dec: " + notDetailedCoord + " fiveBits: " + fiveBits + " dec: " + detailedCoord);
    let detailedCoeff = Math.floor(map.length / 31);
    let notDetailedCoeff = Math.floor(map.length / 7);

    let scaledD = detailedCoord * detailedCoeff * 2;
    let scaledND = notDetailedCoord * notDetailedCoeff;

    if (symmetry === constants.SYMMETRY_VERTICAL){
        return {x: scaledD,y:scaledND};
    }else if (symmetry === constants.SYMMETRY_HORIZONTAL){
        return {x: scaledND, y:scaledD}
    }
}

function padWithZeros(str,desiredLength) {
    let padding = "";
    for (let i = 0; i < desiredLength - str.length; i++){
        padding += "0";
    }

    return padding + str;
}

function getSymmetricNode(x,y,map,symmetry){
    let symmetricalX = map.length - 1 - x;
    let symmetricalY = map.length - 1 - y;
    if (symmetry === constants.SYMMETRY_HORIZONTAL) {
        return {x: symmetricalX, y: y};
    }else {
        return {x: x, y: symmetricalY};
    }
}

class BuildingDecisionMaker{
    constructor(robot){
        this.robot = robot;
    }

    getBuildingDecision() {
        if (this.robot.me.turn === 1){
            return SPECS.PILGRIM
        } else if (this.robot.fuel >= 50 && this.robot.karbonite >= constants.PREACHER_KARBONITE_COST){
            return SPECS.PREACHER;
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
                lowerBound = upperBound;
            }
        }

        return null
    };
}

class DijkstraMapGenerator {
    
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
                this.map[y][x] = constants.UNPASSABLE_TERRAIN_VALUE;
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
        for (let i = 1; i < nodes.length; i++){
            let node = nodes[i];
            let value = this.map[node.y][node.x];
            if (value < smallest){
                smallest = value;
            }
        }
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
                        neighbors.push({x: neighborX, y: neighborY});
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
                    str += " 0" + this.map[y][x];
                } else if (this.map[y][x] < 100) {
                    str += " " + this.map[y][x];
                } else {
                    str += " " + "**";
                }
            }
            this.robot.log(str);
        }
        this.robot.log("_____________________");
    }
}

class RobotController {

    constructor(robot){
        this.symmetry = getMapSymmetryType(robot.map);
        this.updateRobotObject(robot);
    }

    setDijkstraMap(djMap){
        this.djMap = djMap;
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

                if (smallestNodes.length > 0 && smallestNodes[0][0] !== constants.UNPASSABLE_TERRAIN_VALUE) {
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
                    this.djMap[node.y][node.x] -= 1;
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
        return this.robot.map[node.y][node.x] && !this.robot.getVisibleRobotMap()[node.y][node.x] > 0;
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
                str += (n[x].value + " ");
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
            enemyPositions.push({x:enemy.x,y:enemy.y});
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
                units.push(currentRobot);
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
                units.push(currentRobot);
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

        if (left < 0){left = 0;}
        if (bottom < 0){bottom = 0;}
        if (top >= this.robot.map.length){top = this.robot.map.length - 1;}
        if (right >= this.robot.map.length){right = this.robot.map.length - 1;}

        return {left:left,top:top,right:right,bottom:bottom}
    }

    getNearbyEnemies(){
        let nearbyRobots = this.robot.getVisibleRobots();
        let enemies = [];

        for (let i = 0; i < nearbyRobots.length; i++){
            let targetRobot = nearbyRobots[i];
            if (targetRobot.team !== this.robot.me.team){
                enemies.push(targetRobot);
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

class Castle extends RobotController{
    constructor(robot) {
        super(robot);
        this.robot = robot;
        this.willBuildRobots = false;
        this.castlePositions = [];
        this.symmetry = getMapSymmetryType(this.robot.map);
        this.bi = false;
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot);
    }

    run(){

        if (this.robot.me.turn <= 2) {
            this.broadcastCastlePosition();
            this.listenToCastlePositions();
            if (this.robot.me.turn === 1){
                if (this.castlePositions.length === 0 || this.robot.getVisibleRobots().length === 1){
                    this.willBuildRobots = true;
                }
            }

        }

        if (this.willBuildRobots) {
            let builtRobot = this.buildRobot();
            if (builtRobot) {
                if (this.castlePositions.length === 1) {
                    let firstCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.castlePositions[0].x, this.castlePositions[0].y, this.symmetry);
                    //this.robot.log("x: " + this.castlePositions[0].x + " y: " + this.castlePositions[0].y + " bin: " + firstCastle);
                    this.robot.signal(parseInt(firstCastle, 2), 2);
                } else if (this.castlePositions.length === 2) {
                    let firstCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.castlePositions[0].x, this.castlePositions[0].y, this.symmetry);
                    let secondCastle = fitCoordsInEightBits(this.robot, this.robot.map, this.castlePositions[1].x, this.castlePositions[1].y, this.symmetry);
                    let merged = firstCastle + secondCastle;
                    //this.robot.log(merged);
                    this.robot.signal(parseInt(merged, 2), 2);
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

    listenToCastlePositions(){
        let robots = this.robot.getVisibleRobots();
        this.castlePositions = [];
        for (let i = 0; i < robots.length; i++){
            if (robots[i].id !== this.robot.me.id) {
                let cTalk = robots[i].castle_talk;
                if (cTalk) {
                    let toBinary = cTalk.toString(2);
                    let coords = getCoordsFromEightBits(this.robot, this.robot.map, toBinary, this.symmetry);
                    this.castlePositions.push(coords);
                }
            }
        }
    }

    broadcastCastlePosition(){
        let castle = {x: this.robot.me.x, y: this.robot.me.y};
        let bits = fitCoordsInEightBits(this.robot,this.robot.map,castle.x,castle.y,this.symmetry);
        let broadcastValue = parseInt(bits,2);
        //this.robot.log(broadcastValue.toString());
        this.robot.castleTalk(broadcastValue);
    }

    getOppositeCastle(){
        let symmetricalX = this.robot.map.length - 1 - this.robot.me.x;
        let symmetricalY = this.robot.map.length - 1 - this.robot.me.y;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            return {x: symmetricalX, y: this.position.y}
        }else {
            return {x: this.position.x, y: symmetricalY}
        }
    }
}

const ATTACK_RANGE = 16;

class Crusader extends RobotController{
    constructor(robot){
        super(robot);
        super.getClosestCastle();
        this.enemyCastles = [];

        let closestEnemyCastles = super.getClosestCastle();
        this.enemyCastles.push(getSymmetricNode(closestEnemyCastles.x,closestEnemyCastles.y,this.robot.map,this.symmetry));

        let coords = super.getCoordinatesFromCastle();
        for (let i = 0; i < coords.length; i++){
            this.enemyCastles.push(getSymmetricNode(coords[i].x,coords[i].y,this.robot.map,this.symmetry));
        }

        this.updateEnemyCastlesMap();
       // this.updateResourcesMap();
    }

    run(){
        return this.runRush()
    }

    runRush(){
        let nearbyEnemies = super.getNearbyEnemies();
        this.checkIfReachedEnemyCastles();

        if (nearbyEnemies.length > 0 && this.robot.me.turn > 1){
            let closestEnemy = super.getClosestEnemy(nearbyEnemies);

            let dX = closestEnemy.man.x - this.robot.me.x;
            let dY = closestEnemy.man.y - this.robot.me.y;
            if (closestEnemy.distance <= ATTACK_RANGE){
                //this.robot.log("dX: " + closestEnemy.man.x + " dY: " + dY +" dist: " + closestEnemy.distance);
                return this.robot.attack(dX, dY)
            }else{
                super.setDijkstraMap(super.getEnemiesMap(nearbyEnemies,6));
                return this.moveAccordingToMap();
            }
        }else{
            super.setDijkstraMap(this.enemyCastlesMap);
            return this.moveAccordingToMap();

            /*if (this.robot.me.turn === 1 || this.robot.karbonite === 0) {
                let friendlyRobots = [];
                let myVal = this.enemyCastlesMap[this.robot.me.y][this.robot.me.x];

                for (let i = 0; i < friendlyRobots.length; i++){
                    if (this.enemyCastlesMap[friendlyRobots[i].y][friendlyRobots[i].x] < myVal - 1){
                        let generator = new DijkstraMapGenerator(this.robot);
                        let observableArea = this.getOffsetsFromRadius(Math.sqrt(VISION_RADIUS));
                        generator.setLimits(observableArea.left,observableArea.bottom,observableArea.right,observableArea.top);
                        generator.addGoal({x:friendlyRobots[i].x,y: friendlyRobots[i].y});
                        super.setDijkstraMap(generator.generateMap());
                        generator.printMap();
                        return this.moveAccordingToMap()
                    }
                }

            }*/
        }
    }

    checkIfReachedEnemyCastles(){
        let unexploredCastles = [];
        for (let i = 0; i < this.enemyCastles.length; i++){
            let distanceSquared = getDistanceBetweenPoints(this.robot.me.x,this.enemyCastles[i].x,this.robot.me.y,this.enemyCastles[i].y);
            //this.robot.log("turn: " + this.robot.me.turn + " x1: " + this.robot.me.x + " y1: " + this.robot.me.y + " x2: " + this.enemyCastles[i].x + " y2: " + this.enemyCastles[i].y + " dist: " + distanceSquared);
            if (distanceSquared > 2){
                unexploredCastles.push(this.enemyCastles[i]);
            }
        }
        if (unexploredCastles.length !== this.enemyCastles.length){
            this.enemyCastles = unexploredCastles;
            this.updateEnemyCastlesMap(true);
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot);
    }

    moveAccordingToMap(){
        super.setDijkstraMap(this.enemyCastlesMap);
        let delta = super.moveAlongDijkstraMap(1);
        if (delta) {
            //this.robot.log("dX: " + delta.dX + " dY: " + delta.dY);
            return this.robot.move(delta.dX, delta.dY);
        }else{
            return this.robot
        }
    }

    updateEnemyCastlesMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        let goals = [];
        for  (let i = 0; i < this.enemyCastles.length; i++){
            goals.push({x:this.enemyCastles[i].x,y:this.enemyCastles[i].y});
        }
        generator.addGoals(goals);
        this.enemyCastlesMap = generator.generateMap();
        if (print) {
            generator.printMap();
        }
    }


    getPriorityEnemy(enemies){
        let closestEnemy = enemies[0];
        let mostDamagedEnemy = enemies[0];

        let lowestHealth = enemies[0].health;
        let closestDistance = this.enemiesMap[enemies[0].y][enemies[0].x];

        for (let i = 1; i < enemies.length; i++){
            let enemy = enemies[i];
            if (enemy.health < lowestHealth.health){
                lowestHealth = enemy.health;
                mostDamagedEnemy = enemy;
            }

            if (this.enemiesMap[enemy.y][enemy.x] < closestDistance){
                closestDistance = this.enemiesMap[enemy.y][enemy.x];
                closestEnemy = enemy;
            }
        }
        return closestEnemy
    }
}

class Pilgrim extends RobotController{

    constructor(robot){
        super(robot);
        this.updateRobotObject(robot);
        this.friendlyCastles = [];
        this.moves = [];

        this.friendlyCastles.push(super.getClosestCastle());
        let coords = super.getCoordinatesFromCastle();
        for (let i = 0; i < coords.length; i++){
            this.friendlyCastles.push(coords[i].x,coords[i].y);
        }

        //this.updateCastlesMap();
        this.updateKarboniteMap();
    }


    run(){
        //Mine if at tile and has capacity
        if (this.kMap[this.robot.me.y][this.robot.me.x] === 0 && this.robot.me.karbonite < 20){
            return this.robot.mine()
        }else if (this.kMap[this.robot.me.y][this.robot.me.x] !== 0 && this.robot.me.karbonite < 20){
            // Go to deposit if not at deposit and has capacity
            super.setDijkstraMap(this.kMap);
            let movement = this.moveAlongDijkstraMap(1);
            this.moves.push(movement);
            if (movement){
                return this.robot.move(movement.dX,movement.dY);
            }
        }else if (this.robot.me.karbonite === 20){
            if (this.moves.length > 0){
                let movement = this.moves[this.moves.length - 1];
                this.moves.pop();
                return this.robot.move(movement.dX * -1 ,movement.dY * -1)
            }else{
                return this.depositAtNearestCastle();
            }
        }
    }

    depositAtNearestCastle(){
        let units = this.robot.getVisibleRobotMap();

        for (let offY = -1; offY <= 1; offY++){
            for (let offX = -1; offX <= 1; offX++){
                let x = this.robot.me.x + offX;
                let y = this.robot.me.y + offY;

                if (units[y][x] > 0){
                    let unit = this.robot.getRobot(units[y][x]).unit;
                    if (unit === SPECS.CASTLE || unit === SPECS.CHURCH){
                        return this.robot.give(offX,offY,this.robot.me.karbonite,this.robot.me.fuel);
                    }
                }
            }
        }
    }

    updateCastlesMap(print){
        let generator = new DijkstraMapGenerator(this.robot);
        let goals = [];
        for  (let i = 0; i < this.friendlyCastles.length; i++){
            goals.push({x:this.friendlyCastles[i].x,y:this.friendlyCastles[i].y});
        }
        generator.addGoals(goals);
        this.castlesMap = generator.generateMap();
    }

    createResourcesMap(){
        let kMap = this.robot.karbonite_map;
        let goals = [];

        for (let y = 0; y < this.robot.karbonite_map; y++){
            for (let x = 0; x < this.robot.karbonite_map; x++){
                if (kMap){
                    goals.push({x:x,y:y});
                }
            }
        }

        let generator = new DijkstraMapGenerator();
        generator.addGoals(goals);
        this.kMap = generator.generateMap();
    }

    updateKarboniteMap(){
        let closesetResource = this.getClosestResource(this.robot.karbonite_map);
        if (closesetResource){
            let generator = new DijkstraMapGenerator(this.robot);
            generator.addGoal(closesetResource);
            //generator.setLimits(this.robot.me.x - 1,this.robot.me.y - 1,closesetResource.x,closesetResource.y);
            this.kMap = generator.generateMap();
            generator.printMap();
        }
    }

    getClosestResource(map){
        let radius = 1;

        while (radius < map.length) {
            let offsets = this.getOffsetsFromRadius(radius, this.robot.me.x, this.robot.me.y);
            //Top and bottom
            for (let x = offsets.left; x <= offsets.right; x++) {
                let valueTop = map[offsets.top][x];
                let valueBottom = this.robot.karbonite_map[offsets.bottom][x];
                if (valueTop === true){
                    return {y:offsets.top,x:x}
                }

                if (valueBottom === true){
                    return {y:offsets.bottom,x:x}
                }
            }

            //Left and right
            for (let y = offsets.bottom; y <= offsets.top; y++) {
                let valueRight = map[y][offsets.right];
                let valueLeft = map[y][offsets.left];
                if (valueLeft === true){
                    return {y:y,x:offsets.left}
                }

                if (valueRight === true){
                    return {y:y,x:offsets.right}
                }
            }
            radius++;
        }
    }

    updateRobotObject(robot){
        this.robot = robot;
        super.updateRobotObject(robot);
    }
}

class MyRobot extends BCAbstractRobot {
    turn() {
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
                this.robot.updateRobotObject(this);
            }
            return this.robot.run()
        }else if (this.me.unit === SPECS.CASTLE) {

            if(!this.robot) {
                this.robot = new Castle(this);
            }else{
                this.robot.updateRobotObject(this);
            }
            return this.robot.run()

        }else if (this.me.unit === SPECS.PILGRIM){
            if(!this.robot) {
                this.robot = new Pilgrim(this);
            }else{
                this.robot.updateRobotObject(this);
            }
            return this.robot.run()
        }
    }
}


var robot = new MyRobot();
