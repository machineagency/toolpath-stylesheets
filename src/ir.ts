import { Toolpath, Instruction, Operation, IR } from './type-utils.ts';

type Units = "mm" | "in";

export function ir(operation: Operation,
    x: number | null,
    y: number | null,
    z: number | null,
    f: number | null,
    units: Units | null,
    toolOnBed: boolean): IR {
    return {
        op: operation,
        args: {
            x: x,
            y: y,
            z: z,
            f: f
        },
        state: {
            units: units,
            toolOnBed: toolOnBed
        }
    }
}

export function lowerGCode(gcodeTp: Toolpath) {
    let irs: IR[] = [];

    let opcodeRe = /(G[0-9]+|M[0-9]+)/;
    let opXRe = /X(-?[0-9]+.[0-9]+)/;
    let opYRe = /Y(-?[0-9]+.[0-9]+)/;
    let opZRe = /Z(-?[0-9]+.[0-9]+)/;
    let opFRe = /F(-?[0-9]+.[0-9]+)/;
    let findOpcode = (instruction: Instruction, argRe: RegExp) => {
        let maybeArgResults = instruction.match(argRe);
        if (!maybeArgResults) {
            return "";
        }
        return maybeArgResults[0];
    };
    let findArg = (instruction: Instruction, argRe: RegExp) => {
        let maybeArgResults = instruction.match(argRe);
        if (!maybeArgResults || maybeArgResults.length < 2) {
            return null;
        }
        return parseFloat(maybeArgResults[1]) || null;
    };

    let units: Units | null = null;
    gcodeTp.instructions.forEach(function (instruction: Instruction) {
        if (!instruction || instruction[0] == "''") {
            return;
        }

        let newPosition;
        let opcode = findOpcode(instruction, opcodeRe);
        if (opcode === "G21") {
            units = "mm";
        } else if (opcode === "G20") {
            units = "in";
        }
        if (opcode === "G0" || opcode === "G1") {
            let opx = findArg(instruction, opXRe);
            let opy = findArg(instruction, opYRe);
            let opz = findArg(instruction, opZRe);
            let opf = findArg(instruction, opFRe);

            newPosition = ir("move", opx, opy, opz, opf, units, true);
            irs.push(newPosition);
        }
    });
    return irs;
}

export function lowerSBP(sbpTp: Toolpath) {
    let irs: IR[] = [];

    sbpTp.instructions.forEach(function (instruction: Instruction) {
        if (!instruction || instruction[0] == "''") {
            return;
        }
        
        let newPosition;
        let tokens = instruction.trim().split(",");
        let opcode = tokens[0];
        if (opcode === "M2" || opcode === "J2") {
            newPosition = ir("move", parseFloat(tokens[1]), 
                             parseFloat(tokens[2]), 0, null, null, true);
        } else if (opcode === "M3" || opcode === "J3") {
            newPosition = ir("move", parseFloat(tokens[1]), parseFloat(tokens[2]),
                             parseFloat(tokens[3]), null, null, true);
        } else if (opcode === "MZ" || opcode === "JZ") {
            newPosition = ir("move", 0, 0, parseFloat(tokens[1]), null, null, true);
        } else if (opcode === "MX" || opcode === "JX") {
            newPosition = ir("move", parseFloat(tokens[1]), 0, 0, null, null, true);
        } else if (opcode === "MY" || opcode === "JY") {
            newPosition = ir("move", 0, parseFloat(tokens[1]), 0, null, null, true);
        } else {
            return;
        }
        irs.push(newPosition);
    });
    return irs;
}

export function lowerEBB(ebbTp: Toolpath) {
    let irs: IR[] = [];
  
    let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
        let x = 0.5 * (aSteps + bSteps);
        let y = -0.5 * (aSteps - bSteps);
        let stepsPerMm = 80;
        let xChange = x / stepsPerMm;
        let yChange = y / stepsPerMm;
        return { xChange, yChange };
    };
  
    let currX = 0;
    let currY = 0;
    let currZ = 0;
    let prevToolOnBed = false;
  
    ebbTp.instructions.forEach(function (instruction: Instruction) {
        let newPosition;
        let tokens, opcode, penValue, aSteps, bSteps, xyChange;
        tokens = instruction.split(',');
        opcode = tokens[0];

        if (opcode === 'SM') {
            aSteps = parseInt(tokens[2]);
            bSteps = parseInt(tokens[3]);
            xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
            newPosition = ir('move', currX + xyChange.xChange, currY + xyChange.yChange, currZ, null, null, prevToolOnBed);
            irs.push(newPosition);
            currX += xyChange.xChange;
            currY += xyChange.yChange;
        }
        if (opcode === 'SP') {
            penValue = parseInt(tokens[1]);
            let toolOnBed = penValue === 0;
            newPosition = ir('move', currX, currY, currZ, null, null, toolOnBed);
            irs.push(newPosition);
            prevToolOnBed = toolOnBed;
        }
    });
  
    return irs;
  }
  
