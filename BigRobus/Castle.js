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

export default class Castle extends RobotController {
    constructor(robot) {
        super(robot);
        this.robot = robot;
        this.willBuildRobots = false;
        this.castlePositions = [];
        this.assignLeft = false;
        this.symmetry = getMapSymmetryType(this.robot.map);
        this.bi = false;

        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            this.maincoord = this.robot.me.y
        } else {
            this.maincoord = this.robot.me.x
        }

        this.hasSignaled = false;
        this.pilgrimCount = 0;
        this.friendlyCastlesIds = [];
        this.friendlyCastlesMain = [];
        this.friendlyCastlesSecondary = [];
        this.friendlyCastles = [];
        this.karbMines = this.getKarboniteMinesNearby().length;
        this.assignedMines = [];
        this.friendlyCastleNr = this.robot.getVisibleRobots().length;
        this.oppositeCastle = this.getOppositeCastle();
        this.assignedPositions = [];
        this.enemyCastles = [];

        this.getNearbyChokes();
        this.createSurroundingsMap();
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

    getCastleMainPositions(){
        let friendlies = this.robot.getVisibleRobots();

        for (let i =0;i < friendlies.length; i++){
            if (friendlies[i].id !== this.robot.me.id){
                let ct = friendlies[i].castle_talk;
                if (ct > 0){
                    this.friendlyCastlesIds.push(friendlies[i].id);
                    this.friendlyCastlesMain.push(ct);
                    this.friendlyCastlesSecondary.push(-1)
                }
            }
        }

        if (this.friendlyCastlesMain.length > 1){
            if (this.friendlyCastlesMain[0] > this.friendlyCastlesMain[1]){
                let temp = this.friendlyCastlesMain[1];
                let temp1 = this.friendlyCastlesIds[1];
                this.friendlyCastlesIds[1] = this.friendlyCastlesIds[0];
                this.friendlyCastlesIds[0] = temp1;
                this.friendlyCastlesMain[1] = this.friendlyCastlesMain[0];
                this.friendlyCastlesMain[0] = temp;
            }
        }
    }

    getCastleSecondaryPositions(){
        let friendlies = this.robot.getVisibleRobots();

        for (let i =0;i < friendlies.length; i++){
            if (friendlies[i].id !== this.robot.me.id){
                let ct = friendlies[i].castle_talk;
                if (ct > 0){
                    for (let a = 0; a < this.friendlyCastlesIds.length;a++){
                        if (this.friendlyCastlesIds[a] === friendlies[i].id){
                            this.friendlyCastlesSecondary[a] = ct;
                        }
                    }
                }
            }
        }
    }

    calculateMyTerritory(){
        if (this.friendlyCastlesMain.length === 0){
            this.myTerritory = {start:0,end:this.robot.map.length - 1}
        }else if (this.friendlyCastlesMain.length === 1){
            let other = this.friendlyCastlesMain[0];
            let distanceHalved = Math.abs(Math.floor((other - this.maincoord) / 2));

            if (other > this.maincoord){
                this.myTerritory = {start:0,end:other - distanceHalved}
            }else{
                this.myTerritory = {start:other + distanceHalved + 1,end:this.robot.map.length - 1}
            }
        }else{
            let me = this.maincoord;
            if (me < this.friendlyCastlesMain[0]){
                let other = this.friendlyCastlesMain[0];
                let distanceHalved = Math.abs(Math.floor((other - this.maincoord) / 2));
                this.myTerritory = {start:0,end:other - distanceHalved}
            }else if (me > this.friendlyCastlesMain[0] && me < this.friendlyCastlesMain[1]){
                let otherLeft = this.friendlyCastlesMain[0];
                let distanceHalvedLeft = Math.abs(Math.floor((otherLeft - this.maincoord) / 2));

                let otherRight = this.friendlyCastlesMain[1];
                let distanceHalvedRight = Math.abs(Math.floor((otherRight - this.maincoord) / 2));

                this.myTerritory = {start:otherLeft + distanceHalvedLeft + 1, end: otherRight - distanceHalvedRight}
            }else{
                let other = this.friendlyCastlesMain[1];
                let distanceHalved = Math.abs(Math.floor((other - this.maincoord) / 2));
                this.myTerritory = {start:other + distanceHalved + 1,end:this.robot.map.length - 1}
            }
        }
    }

    talkMyMainPosition(){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            this.robot.castleTalk(this.robot.me.y)
        } else {
            this.robot.castleTalk(this.robot.me.x)
        }
    }

    talkMySecondaryPosition(){
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL) {
            this.robot.castleTalk(this.robot.me.x)
        } else {
            this.robot.castleTalk(this.robot.me.y)
        }
    }

    mergeCastlePositions(){
        for (let i = 0; i < this.friendlyCastlesMain.length; i++){
            if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
                this.friendlyCastles.push({id:this.friendlyCastlesIds[i],x:this.friendlyCastlesSecondary[i],y:this.friendlyCastlesMain[i]})
            }else{
                this.friendlyCastles.push({id:this.friendlyCastlesIds[i],y:this.friendlyCastlesSecondary[i],x:this.friendlyCastlesMain[i]})
            }
        }
    }

    signalIfDeadCastle(){
        let castle = this.getCastleIfDead();
        if (castle && this.lastDeadCastle !== castle) {
            let signalRange = 2 * (Math.pow(this.robot.map.length,2));
            if (this.robot.fuel >= Math.ceil(Math.sqrt(signalRange))) {
                let encoded = this.encodeCoordinates(getSymmetricNode(castle.x,castle.y,this.robot.map,this.symmetry));
                if (this.isOtherCastleBroadcastingSignal(encoded) === false) {
                    this.robot.signal(encoded, signalRange);
                    this.lastDeadCastle = castle;
                }
            }
        }
    }

    isOtherCastleBroadcastingSignal(signal){
        for (let i = 0; i < this.friendlyCastlesIds.length;i++){
            let robot = this.robot.getRobot(this.friendlyCastlesIds[i]);
            if (robot.signal === signal){
                return true;
            }
        }
        return false;
    }

    getCastleIfDead(){
        for (let i = 0;i < this.units.friendlies.length; i++){
            let ct = this.units.friendlies[i].castle_talk;
            if (ct > 0){
                for (let i = 0; i < this.friendlyCastlesMain.length; i++){
                    if (ct === this.friendlyCastlesMain[i]){
                        return this.friendlyCastles[i];
                    }
                }
            }
        }
    }

    run() {
        if (this.robot.me.turn === 1) {
            this.talkMyMainPosition();
        } else if (this.robot.me.turn === 2) {
            this.talkMyMainPosition();
            this.getCastleMainPositions();
            this.calculateMyTerritory();
            this.getKarboniteClusters();
        }else if (this.robot.me.turn === 3){
            this.talkMySecondaryPosition();
        }else if (this.robot.me.turn === 4){
            this.talkMySecondaryPosition();
            this.getCastleSecondaryPositions();
            this.mergeCastlePositions();
        }

        this.units = this.getNearbyRobotsSplitInTeams();
        this.signalIfDeadCastle();
        this.updateAssignedPositionsMap();

        if (this.willBuildRobots === true || true) {
            let buildingDecision = this.getBuildingDecision();

            if (buildingDecision) {
                if (buildingDecision === SPECS.PILGRIM) {
                    let mine = this.getKarboniteMineToAssign();
                    if (mine) {
                        this.robot.signal(this.encodeCoordinates(mine), 2);
                        this.assignKarboniteMine(mine);
                    } else {
                        return;
                    }
                } else if (buildingDecision === SPECS.PREACHER || buildingDecision === SPECS.PROPHET) {
                    this.broadcastDefensivePosition();
                }
                return this.buildRobot(buildingDecision);
            }
        }
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
        if (this.robot.me.turn > 1 && this.pilgrimCount < this.maxPilgrims && this.robot.karbonite >= constants.PILGRIM_KARBONITE_COST && this.robot.fuel >= 50){
            this.pilgrimCount++;
            return SPECS.PILGRIM
        }else if (Math.random() > 0.5 && this.robot.karbonite >= constants.PREACHER_KARBONITE_COST && this.robot.fuel >= 50){
            return SPECS.PREACHER;
        }else if (this.robot.karbonite >= constants.PROPHET_KARBONITE_COST && this.robot.fuel >= 50){
            return SPECS.PROPHET}

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
        this.maxPilgrims = karbMines.length;
        let loc = this.robot.me;
        //this.robot.log("Karb: " + karbMines.length);
        let cGen = new PointClusterGenerator(karbMines,this.robot);
        this.karbClusters = cGen.generateClusters();

        this.karbClusters.sort(function (a,b) {
           let distA = calculateManhattanDistance(loc,a.centroid);
           let distB = calculateManhattanDistance(loc,b.centroid);
           return distA - distB;
        });

        //cGen.printClusters();
    }

    getKarboniteMinesOnMySide(){
        let karboniteMines = [];
        let limitsBehind = this.getAreaBehindMe();
        //this.robot.log("Limits: " + limitsBehind.start + " -> " + limitsBehind.end);
        if (this.symmetry === constants.SYMMETRY_HORIZONTAL){
            for (let y = this.myTerritory.start; y <= this.myTerritory.end; y++){
                for (let x = limitsBehind.start; x <= limitsBehind.end; x++){
                    if (this.robot.karbonite_map[y][x] === true){
                        karboniteMines.push({x:x,y:y})
                    }
                }
            }
        }else{
            for (let y = limitsBehind.start; y <= limitsBehind.end; y++){
                for (let x = this.myTerritory.start; x <= this.myTerritory.end; x++){
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