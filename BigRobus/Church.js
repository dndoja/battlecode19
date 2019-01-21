import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {fitCoordsInEightBits, getMapSymmetryType, getCoordsFromEightBits} from "./utils.js";
import constants from "./constants.js";
import {BuildingDecisionMaker} from "./BuildingDecisionMaker.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import ChokepointFinder from "./ChokepointFinder.js";
import {calculateDiagonalDistance,calculateManhattanDistance} from "./utils.js";
import PointClusterGenerator from "./PointClusterGenerator.js";

const CHOKE_RADIUS = 10;

export default class Church extends RobotController {
    constructor(robot) {
        super(robot);
        this.robot = robot;
        this.assignLeft = false;
        this.symmetry = getMapSymmetryType(this.robot.map);

        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            this.maincoord = this.robot.me.y
        } else {
            this.maincoord = this.robot.me.x
        }

        this.visibleRobotMap = this.robot.getVisibleRobotMap();
        this.assignedPositions = [];
        this.getNearbyChokes();
        //this.createSurroundingsMap();
        this.orderChokesByProximity();
    }

    orderChokesByProximity(index) {
        if (!index) {
            index = 0;
        }
        let offset = this.nearbyChokes[index].offset;
        let position = this.robot.me;

        function orderIfVertical(a, b) {
            let xA = Math.floor((a[1] - a[0]) / 2);
            let xB = Math.floor((b[1] - b[0]) / 2);

            let distA = calculateManhattanDistance(position, {x: xA, y: offset});
            let distB = calculateManhattanDistance(position, {x: xB, y: offset});
            return distA - distB
        }


        function orderIfHorizontal(a, b) {
            let yA = Math.floor((a[1] - a[0]) / 2);
            let yB = Math.floor((b[1] - b[0]) / 2);

            let distA = calculateManhattanDistance(position, {x: offset, y: yA});
            let distB = calculateManhattanDistance(position, {x: offset, y: yB});
            return distA - distB

        }

        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            this.nearbyChokes[index].sections.sort(orderIfHorizontal);
        } else {
            this.nearbyChokes[index].sections.sort(orderIfVertical)
        }

        let str = "";
        for (let i = 0; i < this.nearbyChokes[0].sections.length; i++) {
            str += ("[" + this.nearbyChokes[0].sections[i][0] + "," + this.nearbyChokes[0].sections[i][1] + "]")
        }
        //this.robot.log(str +  " | " + offset)
    }

    createSurroundingsMap() {
        let generator = new DijkstraMapGenerator(this.robot);
        generator.addGoal(this.getOppositeCastle());
        if (this.symmetry === constants.SYMMETRY_VERTICAL) {
            generator.setLimits(this.robot.me.x - CHOKE_RADIUS - 1, this.robot.me.y - 1, this.robot.me.x + CHOKE_RADIUS + 1, this.oppositeCastle.y + CHOKE_RADIUS + 1)
        } else {
            generator.setLimits(this.robot.me.x - 1, this.robot.me.y - CHOKE_RADIUS - 1, this.oppositeCastle.x + 1, this.oppositeCastle.y + CHOKE_RADIUS + 1)
        }
        this.surroundingsMap = generator.generateMap();
        //generator.printMap()
    }

    getNearbyChokes() {
        let chokepointFinder = new ChokepointFinder(this.robot, this.symmetry);
        chokepointFinder = this.setChokeLimits(chokepointFinder);
        this.chokepoints = chokepointFinder.getChokePoints();
        this.setChokeLimits(chokepointFinder);
        this.pickBestChokes(chokepointFinder)
    }

    setChokeLimits(chokepointFinder) {
        let mX = this.robot.me.x;
        let mY = this.robot.me.y;

        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            if (this.robot.me.x < this.robot.map.length / 2) {
                chokepointFinder.setLimits({x: mX, y: mY - CHOKE_RADIUS}, {x: mX + CHOKE_RADIUS, y: mY + CHOKE_RADIUS});
            } else {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS, y: mY - CHOKE_RADIUS}, {x: mX, y: mY + CHOKE_RADIUS});
            }
        } else {
            if (this.robot.me.y < this.robot.map.length / 2) {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS, y: mY}, {x: mX + CHOKE_RADIUS, y: mY + CHOKE_RADIUS});
            } else {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS, y: mY - CHOKE_RADIUS}, {x: mX + CHOKE_RADIUS, y: mY});
            }
        }

        return chokepointFinder
    }

    compareIntersections(a, b) {
        return a.passableTiles - b.passableTiles
    }

    pickBestChokes(chokepointFinder) {
        let candidates = [];

        for (let a = 2; a < this.chokepoints.length - 1; a++) {
            let currentLane = this.chokepoints[a];
            let nextLane = this.chokepoints[a + 1];
            let intersection = chokepointFinder.intersectRows(currentLane, nextLane);
            let passableTiles = 0;
            for (let i = 0; i < intersection.length; i++) {
                passableTiles += (intersection[i][1] - intersection[i][0])
            }
            candidates.push({sections: intersection, passableTiles: passableTiles, offset: currentLane.i})
        }

        candidates.sort(this.compareIntersections);
        this.nearbyChokes = candidates
        /*for (let i = 0; i < candidates.length;i++){
            this.robot.log("Passable tiles: " + candidates[i].passableTiles + " Offset: " + candidates[i].offset);
            let str = "";
            for (let a = 0; a < candidates[i].sections.length;a++){
                str += "[" + candidates[i].sections[a][0] + "," + candidates[i].sections[a][1] + "]"
            }
            this.robot.log(str)
        }*/
    }

    updateRobotObject(robot) {
        this.robot = robot;
        super.updateRobotObject(robot);
    }

    encodeCoordinates({x, y}) {
        return y * 100 + x;
    }

    updateAssignedPositionsMap() {
        let stillAssigned = [];
        let str = "Assigned: ";
        for (let i = 0; i < this.assignedPositions.length; i++) {
            if (this.isAUnitStationedInPosition(this.assignedPositions[i].x, this.assignedPositions[i].y) === false) {// && this.robot.me.turn - this.assignedPositions[i].turnOfAssignment < 20){
                str += "(" + this.assignedPositions[i].x + "," + this.assignedPositions[i].y + ")";
                stillAssigned.push(this.assignedPositions[i])
            }
        }
        if (stillAssigned.length > 0) {
            //this.robot.log(str);
        }
        this.assignedPositions = stillAssigned;
    }

    isAUnitStationedInPosition(x, y) {
        let id = this.visibleRobotMap[y][x];

        if (id > 0) {
            let robot = this.robot.getRobot(id);
            if (robot.castle_talk === 1) {
                return true
            }
        }
        return false
    }

    assignPosition(x, y) {
        this.assignedPositions.push({x: x, y: y, turnOfAssignment: this.robot.me.turn});
        this.mostRecentlyAssigned = {x: x, y: y, turnOfAssignment: this.robot.me.turn}
    }

    getCastlePositionPt1(){
        let friendlies = this.robot.getVisibleRobots();

        for (let i =0;i < this.robot.friendlies; i++){
            if (friendlies[i].id !== this.robot.me.id){
                let ct = friendlies[i].castle_talk;
                if (ct > -1){
                    if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
                        this.friendlyCastles.push({x:0,y:ct})
                    }else{
                        this.friendlyCastles.push({x:ct,y:0})
                    }
                }
            }
        }
    }

    getCastlePositionPt2(){
        let friendlies = this.robot.getVisibleRobots();
        let index = 0;

        for (let i =0;i < this.robot.friendlies; i++){
            if (friendlies[i].id !== this.robot.me.id){
                let ct = friendlies[i].castle_talk;
                if (ct > -1){
                    if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
                        this.friendlyCastles[index].x = ct
                    }else{
                        this.friendlyCastles[index].y = ct
                    }
                    index++;
                }
            }
        }
    }

    run() {
        this.updateAssignedPositionsMap();
        let buildingDecision = this.getBuildingDecision();

        if (buildingDecision) {
            if (buildingDecision === SPECS.PROPHET || buildingDecision === SPECS.PREACHER) {
                if (this.broadcastDefensivePosition() === false) {
                    return
                }
            }

            return this.buildRobot(buildingDecision);
        }

    }

    broadcastDefensivePosition() {
        let position = this.getPositionToAssign();
        if (position) {
            this.assignPosition(position.x, position.y);
            let encoded = this.encodeCoordinates({x: position.x, y: position.y});
            //this.robot.log("Encoded: " + encoded);
            this.robot.signal(encoded, 2);
            return true
        }
        return false
    }

    getPositionToAssign() {
        let choke = this.nearbyChokes[0];
        let offset = choke.offset;
        let sections = choke.sections;

        for (let i = 0; i < sections.length; i++) {
            let section = sections[i];
            let pivot = this.getIterationPivot(section, offset);
            //this.robot.log("Pivot: " + pivot + " [" + section[0] + "," + section[1] + "]");

            if (this.assignLeft === true) {
                for (let a = pivot; a >= section[0]; a--) {
                    let thing = this.isLocationUnassigned(a, offset);
                    if (thing) {
                        return thing
                    }
                }

                for (let a = pivot; a <= section[1]; a++) {
                    let thing = this.isLocationUnassigned(a, offset);
                    if (thing) {
                        return thing
                    }
                }

                this.assignLeft = false
            } else {
                for (let a = pivot; a <= section[1]; a++) {
                    let thing = this.isLocationUnassigned(a, offset);
                    if (thing) {
                        return thing
                    }
                }
                for (let a = pivot; a >= section[0]; a--) {
                    let thing = this.isLocationUnassigned(a, offset);
                    if (thing) {
                        return thing
                    }
                }

                this.assignLeft = true
            }
        }
    }

    isLocationUnassigned(a, offset) {
        let x, y;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            x = offset;
            y = a;
        } else {
            x = a;
            y = offset;
        }

        if (!this.isAUnitStationedInPosition(x, y) && !this.isPositionAssigned(x, y)) {
            //this.robot.log("Assign: " + "(" + x + "," + y + ")");
            return {x: x, y: y}
        }
    }

    getIterationPivot(section, offset) {
        let smallestDistance = 100000;
        let closestLoc;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            for (let y = section[0]; y <= section[1]; y++) {
                let distance = calculateManhattanDistance(this.robot.me, {x: offset, y: y});
                if (distance < smallestDistance) {
                    closestLoc = y;
                    smallestDistance = distance;
                }
            }
        } else {
            for (let x = section[0]; x <= section[1]; x++) {
                let distance = calculateManhattanDistance(this.robot.me, {x: x, y: offset});
                if (distance < smallestDistance) {
                    closestLoc = x;
                    smallestDistance = distance;
                }
            }
        }

        return closestLoc
    }

    isPositionAssigned(x, y) {
        for (let i = 0; i < this.assignedPositions.length; i++) {
            if (this.assignedPositions[i].x === x && this.assignedPositions[i].y === y) {
                return true
            }
        }
        return false
    }

    getBuildingDecision() {
        if (this.robot.fuel >= 50) {
            if (Math.random() > 0.5 && this.robot.karbonite >= constants.PREACHER_KARBONITE_COST) {
                return SPECS.PREACHER;
            } else if (this.robot.karbonite >= constants.PROPHET_KARBONITE_COST) {
                return SPECS.PROPHET
            }
        }
    }

    buildRobot(unitToBuild) {
        if (unitToBuild != null) {
            const goal = this.mostRecentlyAssigned;
            const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
            let possibilities = [];
            for (let i = 0; i < choices.length; i++) {
                let choice = choices[i];
                let dX = this.robot.me.x + choice[0];
                let dY = this.robot.me.y + choice[1];

                if (dX > 0 && dY > 0 && dX < this.robot.map.length && dY < this.robot.map.length && this.robot.getVisibleRobotMap()[dY][dX] <= 0 && this.robot.map[dY][dX] === true) {
                    possibilities.push({x: dX, y: dY,index:i});
                    return this.robot.buildUnit(unitToBuild, choice[0], choice[1])
                }
            }

            if (possibilities.length > 0) {
                possibilities.sort(function (a, b) {
                    return calculateManhattanDistance(a, goal) - calculateManhattanDistance(b, goal)
                });

                return this.robot.buildUnit(unitToBuild, choices[possibilities[0].index][0], choices[possibilities[0].index][1])
            }
        }
    }

    listenToCastlePositions() {
        let robots = this.robot.getVisibleRobots();
        this.castlePositions = [];
        for (let i = 0; i < robots.length; i++) {
            if (robots[i].id !== this.robot.me.id) {
                let cTalk = robots[i].castle_talk;
                if (cTalk) {
                    let toBinary = cTalk.toString(2);
                    let coords = getCoordsFromEightBits(this.robot, this.robot.map, toBinary, this.symmetry);
                    this.castlePositions.push(coords)
                }
            }
        }
    }

    broadcastCastlePosition() {
        let castle = {x: this.robot.me.x, y: this.robot.me.y};
        let bits = fitCoordsInEightBits(this.robot, this.robot.map, castle.x, castle.y, this.symmetry);
        let broadcastValue = parseInt(bits, 2);
        //this.robot.log(broadcastValue.toString());
        //this.robot.castleTalk(broadcastValue)
    }

    getOppositeCastle() {
        let symmetricalX = this.robot.map.length - 1 - this.robot.me.x;
        let symmetricalY = this.robot.map.length - 1 - this.robot.me.y;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            return {x: symmetricalX, y: this.position.y}
        } else {
            return {x: this.position.x, y: symmetricalY}
        }
    }

    getKarboniteMinesNearby() {
        let offsets = super.getOffsetsFromRadius(5, this.robot.me.x, this.robot.me.y);
        let karboniteMines = [];

        for (let y = offsets.bottom; y <= offsets.top; y++) {
            for (let x = offsets.left; x <= offsets.right; x++) {
                if (this.robot.karbonite_map[y][x] === true) {
                    karboniteMines.push({x: x, y: y})
                }
            }
        }

        return karboniteMines;
    }

    getKarboniteMineToAssign(){
        for (let i = 0; i < this.karbClusters.length; i++){
            let cluster = this.karbClusters[i];
            if (calculateDiagonalDistance(this.robot.me,cluster.centroid) <= this.robot.map.length / this.friendlyCastleNr || true) {
                for (let a = 0; a < cluster.points.length; a++) {
                    if (this.isMineAssigned(cluster.points[a]) === false) {
                        this.mostRecentlyAssigned = {x: cluster.points[a].x,y: cluster.points[a].y};
                        return {x: cluster.points[a].x, y: cluster.points[a].y}
                    }
                }
            }
        }
    }

    assignKarboniteMine(mine){
        this.assignedMines.push(mine)
    }

    isMineAssigned(point){
        for (let i = 0; i < this.assignedMines.length; i++){
            if (this.assignedMines[i].x === point.x && this.assignedMines[i].y === point.y){
                return true
            }
        }
        return false
    }

    getKarboniteClusters() {
        let karbMines = this.getKarboniteMinesOnMySide();
        let loc = this.robot.me;
        //this.robot.log("Karb: " + karbMines.length);
        let cGen = new PointClusterGenerator(karbMines,this.robot);
        this.karbClusters = cGen.generateClusters();

        this.karbClusters.sort(function (a,b) {
           let distA = calculateManhattanDistance(loc,a.centroid);
           let distB = calculateManhattanDistance(loc,b.centroid);
           return distA - distB;
        });

        //this.robot.log("Clusters: " + clusters.length);
        //cGen.printClusters();
    }

    getKarboniteMinesOnMySide(){
        let karboniteMines = [];
        let limitsBehind = this.getAreaBehindMe();
        //this.robot.log("Limits: " + limitsBehind.start + " -> " + limitsBehind.end);
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            for (let y = 0; y < this.robot.map.length; y++){
                for (let x = limitsBehind.start; x <= limitsBehind.end; x++){
                    if (this.robot.karbonite_map[y][x] === true){
                        karboniteMines.push({x:x,y:y})
                    }
                }
            }
        }else{
            for (let y = limitsBehind.start; y <= limitsBehind.end; y++){
                for (let x = 0; x < this.robot.map.length; x++){
                    if (this.robot.karbonite_map[y][x] === true) {
                        karboniteMines.push({x: x, y: y})
                    }
                }
            }
        }

        return karboniteMines;
    }

    getAreaBehindMe(){
        let halfLength = Math.floor(this.robot.map.length / 2);

        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            let endX,startX;
            if (this.robot.me.x < halfLength){
                startX = 0;
                endX = halfLength;
            }else{
                startX = halfLength;
                endX = this.robot.map.length - 1;
            }
            return {start:startX,end:endX}

        }else{
            let endY,startY;

            if (this.robot.me.y < halfLength){
                startY = 0;
                endY = halfLength;
            }else{
                startY = halfLength;
                endY = this.robot.map.length - 1;
            }
            return {start:startY,end:endY}
        }
    }
}