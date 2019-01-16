// Type definitions for battlecode
// Project: battlecode.org 2019
// Definitions by: Ryozuki <Discord: Ryozuki#1984>
// Thanks to the docs https://battlecode.org/dash/docs

declare module "battlecode" {
    export enum SPECS {
        CASTLE,
        CHURCH,
        PILGRIM,
        CRUSADER,
        PROPHET,
        PREACHER
    }
    export class BCAbstractRobot {
        /**
         * The robot object
         */
        public me: RobotObject;
        /**
         * The full map. Boolean grid where true indicates passable and false indicates impassable.
         */
        public map: Array<Array<boolean>>;
        /**
         * The Karbonite map. Boolean grid where true indicates that Karbonite is present and false indicates that it is not.
         */
        public karbonite_map: Array<Array<boolean>>;
        /**
         * The Fuel map. Boolean grid where true indicates that Fuel is present and false indicates that it is not.
         */
        public fuel_map: Array<Array<boolean>>;
        /**
         * The global amount of Karbonite that the team possesses.
         */
        public karbonite: number;
        /**
         * The global amount of Fuel that the team possesses.
         */
        public fuel: number;
        /**
         * A 2 by 2 grid containing the last trade offers by both teams. this.last_offer[0] is
         * the last offer made by RED and contains a list of two integers, where the first one is the amount
         * of Karbonite and the second one is the amount of Fuel. Similarly, this.last_offer[1] is the last offer made by BLUE.
         * For both offers, a positive amount signifies that the resource goes from RED to BLUE. Available for Castles (always null for other units).
         */
        public last_offer: Array<Array<number>>;

        /**
         * Move dx steps in the x direction, and dy steps in the y direction.
         * Uses Fuel (depending on unit and distance).
         * Available for Pilgrims, Crusaders, Prophets, Preachers.
         * @param dx The steps to move in the x direction
         * @param dy The steps to move in the y direction
         */
        public move(dx: number, dy: number): any;

        /**
         * Mine 2 Karbonite or 10 Fuel, if on a corresponding resource tile. Uses 1 Fuel. Available for Pilgrims.
         */
        public mine(): any;

        /**
         * Give karbonite Karbonite and fuel Fuel to the robot in the tile that is dx steps in the x direction and dy steps in the y direction from this.me.
         * A robot can only give to another robot that is in one of its 8 adjacent tiles, and cannot give more than it has. Uses 0 Fuel. Available for all units.
         * @param dx
         * @param dy
         * @param karbonite The amount of karbonite.
         * @param fuel The amount of fuel.
         */
        public give(dx: number, dy: number, karbonite: number, fuel: number): any;

        /**
         * Attack the robot in the tile that is dx steps in the x direction and dy steps in the y direction from this.me.
         * A robot can only attack another robot that is within its attack radius (depending on unit).
         * Uses Fuel (depending on unit). Available for Crusaders, Prophets, Preachers.
         * @param dx
         * @param dy
         */
        public attack(dx: number, dy: number): any;

        /**
         * Build a unit of the type unit (integer, see r.unit) in the tile that is dx steps in the x direction and dy steps in the y direction from this.me.
         * Can only build in adjacent, empty and passable tiles. Uses Fuel and Karbonite (depending on the constructed unit).
         * Available for Pilgrims, Castles, Churches. Pilgrims can only build Churches, and Castles and Churches can only build Pilgrims, Crusaders, Prophets and Preachers.
         * @param unit
         * @param dx
         * @param dy
         */
        public buildUnit(unit: SPECS, dx: number, dy: number): any;

        /**
         * Propose a trade with the other team. karbonite and fuel need to be integers.
         * For example, for RED to make the offer "I give you 10 Karbonite if you give me 10 Fuel",
         * the parameters would be karbonite = 10 and fuel = -10 (for BLUE, the signs are reversed).
         * If the proposed trade is the same as the other team's last_offer, a trade is performed,
         * after which the last_offer of both teams will be nullified.
         * Available for Castles.
         * @param karbonite
         * @param fuel
         */
        public proposeTrade(karbonite: number, fuel: number): any;

        /**
         *  Broadcast value to all robots within the squared radius sq_radius. Uses sq_radius Fuel. value should be an integer between 0 and 2^16-1 (inclusive).
         *  Can be called multiple times in one turn(); however, only the most recent signal will be used, while each signal will cost Fuel.
         * @param value
         * @param sq_radius
         */
        public signal(value: number, sq_radius: number): any;

        /**
         * Broadcast value to all Castles of the same team. Does not use Fuel. value should be an integer between 0 and 2^8-1 (inclusive).
         * Can be called multiple times in one turn(); however, only the most recent building talk will be used.
         * @param value
         */
        public castleTalk(value: number): any;

        /**
         * Print a message to the command line. You cannot use ordinary console.log in Battlecode for security reasons.
         * @param message
         */
        public log(message: string): void;

        /**
         * Returns a list containing all robots within this.me's vision radius and all robots whose radio broadcasts can be heard (accessed via other_r.signal).
         * For castles, robots of the same team not within the vision radius will also be included, to be able to read the castle_talk property.
         */
        public getVisibleRobots(): RobotObject[];

        /**
         * Returns a 2d grid of integers the size of this.map.
         * All tiles outside this.me's vision radius will contain -1.
         * All tiles within the vision will be 0 if empty, and will be a robot id if it contains a robot.
         */
        public getVisibleRobotMap(): Array<Array<number>>;

        /**
         * Returns a robot object with the given integer id. Returns null if such a robot is not in your vision (for Castles,
         * it also returns a robot object for all robots on this.me's team that are not in the robot's vision, to access castle_talk).
         * @param id
         */
        public getRobot(id: number): RobotObject | null;

        /**
         *  Returns true if the given robot object is visible.
         * @param robot
         */
        public isVisible(robot: RobotObject): boolean;

        /**
         * : Returns true if the given robot object is currently sending radio (signal).
         * @param robot
         */
        public isRadioing(robot: RobotObject): boolean;

        /**
         * Returns this.map.
         */
        public getPassableMap(): Array<Array<boolean>>;

        /**
         *  Returns this.karbonite_map.
         */
        public getKarboniteMap(): Array<Array<boolean>>;

        /**
         *  Returns this.fuel_map.
         */
        public getFuelMap(): Array<Array<boolean>>;
    }

    /**
     * Represents a Robot
     *
     * - Visible means that r is within this.me's vision radius (particularly, this.me is always visible to itself).
     * - Radioable means that this.me is within r's signal radius.
     */
    export class RobotObject {
        /**
         * The id of the robot, which is an integer between 1 and 4096. Always available.
         */
        public id: number;
        /**
         * The robot's unit type, where 0 stands for Castle, 1 stands for Church, 2 stands for Pilgrim, 3 stands for Crusader,
         * 4 stands for Prophet and 5 stands for Preacher. Available if visible.
         */
        public unit: SPECS;
        /**
         * The health of the robot. Only available for r = this.me.
         */
        public health: number | null;
        /**
         * The team of the robot, where 0 stands for RED and 1 stands for BLUE. Available if visible.
         */
        public team: number | null;
        /**
         * The x position of the robot. Available if visible.
         */
        public x: number | null;
        /**
         * The y position of the robot. Available if visible.
         */
        public y: number | null;
        /**
         * The amount of Fuel that the robot carries. Only available for r = this.me.
         */
        public fuel: number | null;
        /**
         * The amount of Karbonite that the robot carries. Only available for r = this.me.
         */
        public karbonite: number | null;
        /**
         * The turn count of the robot (initialiazed to 0, and incremented just before turn()). Always available.
         */
        public turn: number;
        /**
         *  The signal of the robot. Available if radioable.
         */
        public signal: number | null;
        /**
         *  The signal radius of the robot. Available if radioable.
         */
        public signal__radius: number | null;
        /**
         *  The building talk message sent by the robot. Available if this.me is a Castle.
         */
        public castle_talk: number | null;
    }
}