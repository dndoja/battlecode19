import {SPECS,BCAbstractRobot} from 'battlecode';
import RobotController from "./RobotController.js";
import {fitCoordsInEightBits, getMapSymmetryType, getCoordsFromEightBits, getSymmetricNode} from "./utils.js";
import constants from "./constants.js";
import DijkstraMapGenerator from "./DijkstraMapGenerator.js";
import ChokepointFinder from "./ChokepointFinder.js";
import {calculateDiagonalDistance,calculateManhattanDistance} from "./utils.js";
import PointClusterGenerator from "./PointClusterGenerator.js";

const CHOKE_RADIUS = 10;
const CHOKE_RADIUS_S = 5;

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

        this.assignedPositions = [];

        this.getNearbyChokes();
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
            this.nearbyChokes[index].sections.sort(orderIfVertical);
        }

        let str = "";
        for (let i = 0; i < this.nearbyChokes[0].sections.length; i++) {
            str += ("[" + this.nearbyChokes[0].sections[i][0] + "," + this.nearbyChokes[0].sections[i][1] + "]")
        }
        //this.robot.log(str +  " | " + offset)
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
                chokepointFinder.setLimits({x: mX, y: mY - CHOKE_RADIUS_S}, {x: mX + CHOKE_RADIUS, y: mY + CHOKE_RADIUS_S});
            } else {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS, y: mY - CHOKE_RADIUS_S}, {x: mX, y: mY + CHOKE_RADIUS_S});
            }
        } else {
            if (this.robot.me.y < this.robot.map.length / 2) {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS_S, y: mY}, {x: mX + CHOKE_RADIUS_S, y: mY + CHOKE_RADIUS});
            } else {
                chokepointFinder.setLimits({x: mX - CHOKE_RADIUS_S, y: mY - CHOKE_RADIUS}, {x: mX + CHOKE_RADIUS_S, y: mY});
            }
        }

        return chokepointFinder
    }

    compareIntersections(a, b) {
        return a.passableTiles - b.passableTiles
    }

    pickBestChokes(chokepointFinder) {
        let candidates = [];

        for (let a = 5; a < this.chokepoints.length - 1; a++) {
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
    }

    updateRobotObject(robot) {
        this.robot = robot;
        this.visibleRobotMap = this.robot.getVisibleRobotMap();
        super.updateRobotObject(robot);
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
            if (robot.castle_talk === 255) {
                return true
            }
        }
        return false
    }

    assignPosition(x, y) {
        this.assignedPositions.push({x: x, y: y, turnOfAssignment: this.robot.me.turn});
        this.mostRecentlyAssigned = {x: x, y: y, turnOfAssignment: this.robot.me.turn}
    }

    run() {
        this.updateAssignedPositionsMap();
        let buildingDecision = this.getBuildingDecision();
        this.units = this.getNearbyRobotsSplitInTeams();

        if (this.doAlliesNeedReinforcements() === true) {
            this.robot.castleTalk(253);

            if (buildingDecision) {
                if (buildingDecision === SPECS.PROPHET || buildingDecision === SPECS.PREACHER) {
                    this.broadcastDefensivePosition()
                }

                return this.buildRobot(buildingDecision);
            }
        }
    }

    doAlliesNeedReinforcements(){
        let friendly = 0;
        let enemy = 0;

        for (let i =0; i < this.units.friendlies.length;i++){
            const unit = this.units.friendlies[i].unit;
            if (unit !== SPECS.PREACHER){
                friendly++;
            }
        }

        for (let i =0; i < this.units.enemies.length;i++){
            const unit = this.units.enemies[i].unit;
            if (unit !== SPECS.PREACHER){
                enemy++;
            }
        }
        return friendly - enemy <= 1
    }

    broadcastDefensivePosition(){
        let position = this.getPositionToAssign();
        if (position) {
            this.assignPosition(position.x, position.y);
            let encoded = this.encodeCoordinates({x: position.x, y: position.y});
            this.robot.signal(encoded, 2);
            return true
        }
        return false
    }

    getPositionToAssign() {
        let choke = this.nearbyChokes[0];
        let offset = choke.offset;
        let sections = choke.sections;
        let firstLoc;

        for (let i = 0; i < sections.length; i++) {
            let section = sections[i];
            let pivot = this.getIterationPivot(section, offset);
            if (this.assignLeft === true) {
                for (let a = pivot; a >= section[0]; a--) {
                    let loc = this.assignOffsetToProperCoord(a,offset);
                    if (this.isLocationUnassigned(loc.x,loc.y) === true){
                        return loc;
                    }else if (!firstLoc){
                        firstLoc = loc;
                    }
                }

                for (let a = pivot; a <= section[1]; a++) {
                    let loc = this.assignOffsetToProperCoord(a,offset);
                    if (this.isLocationUnassigned(loc.x,loc.y) === true){
                        return loc;
                    }else if (!firstLoc){
                        firstLoc = loc;
                    }
                }

                this.assignLeft = false
            } else {
                for (let a = pivot; a <= section[1]; a++) {
                    let loc = this.assignOffsetToProperCoord(a,offset);
                    if (this.isLocationUnassigned(loc.x,loc.y) === true){
                        return loc;
                    }else if (!firstLoc){
                        firstLoc = loc;
                    }
                }
                for (let a = pivot; a >= section[0]; a--) {
                    let loc = this.assignOffsetToProperCoord(a,offset);
                    if (this.isLocationUnassigned(loc.x,loc.y) === true){
                        return loc;
                    }else if (!firstLoc){
                        firstLoc = loc;
                    }
                }

                this.assignLeft = true
            }
        }
        return firstLoc;
    }

    assignOffsetToProperCoord(a,offset){
        let x, y;
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            x = offset;
            y = a;
        } else {
            x = a;
            y = offset;
        }

        return {x:x,y:y}
    }

    isLocationUnassigned(x, y) {
        return !this.isAUnitStationedInPosition(x, y) && !this.isPositionAssigned(x, y);
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
}